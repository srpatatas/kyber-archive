#!/usr/bin/env node
import { chromium } from "playwright";
import { Pool } from "@neondatabase/serverless";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local if DATABASE_URL is not already set
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const eq = line.indexOf("=");
      if (eq > 0 && !line.startsWith("#")) {
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Create a .env.local file or run: node --env-file=.env.local scrape.mjs <url> [tier]");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const args = process.argv.slice(2);
const tournamentUrl = args[0];
const tierArg = args[1] || "showdown";

if (!tournamentUrl) {
  console.error("Usage: node scrape.mjs <tournament-url-or-id> [tier]");
  console.error("Tiers: minor, showdown, major, planetary, sector, galactic");
  process.exit(1);
}

const idMatch = tournamentUrl.match(/(\d+)/);
if (!idMatch) {
  console.error("Could not parse tournament ID from:", tournamentUrl);
  process.exit(1);
}
const tournamentId = parseInt(idMatch[1], 10);

console.log(`Scraping tournament ${tournamentId} as ${tierArg}...`);

const context = await chromium.launchPersistentContext("/tmp/pw-profile-midichlorian", {
  headless: false,
  viewport: { width: 1280, height: 800 },
});

const page = await context.newPage();

const matchesByRound = new Map();
let latestStandings = [];

page.on("response", async (response) => {
  if (response.request().method() !== "POST") return;
  const reqUrl = response.url();
  const ct = response.headers()["content-type"] || "";
  if (!ct.includes("json")) return;

  try {
    const json = await response.json();
    if (!json.data) return;

    if (reqUrl.includes("GetRoundMatches")) {
      const roundId = reqUrl.match(/GetRoundMatches\/(\d+)/)?.[1];
      if (roundId && !matchesByRound.has(roundId)) {
        matchesByRound.set(roundId, json.data);
      }
    }

    if (reqUrl.includes("GetRoundStandings")) {
      latestStandings = json.data;
    }
  } catch {}
});

const url = `https://melee.gg/Tournament/View/${tournamentId}`;
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

// Dismiss cookies
const acceptCookies = page.locator("button:has-text('Accept all cookies'), a:has-text('Accept all cookies')").first();
if (await acceptCookies.isVisible().catch(() => false)) {
  await acceptCookies.click();
  await page.waitForTimeout(1000);
}

const title = await page.title();
const name = title.replace(" | Melee", "").trim();
const orgName = await page.locator(".tournament-organizer-name, a[href*='/Hub/Organization/']").first().textContent().catch(() => null);
console.log(`Tournament: ${name}`);
console.log(`Organization: ${orgName?.trim() || "Unknown"}`);

// Click last standings round for final standings
const standingsButtons = await page.locator("#standings-round-selector-container .round-selector").all();
if (standingsButtons.length > 0) {
  await standingsButtons[standingsButtons.length - 1].scrollIntoViewIfNeeded();
  await standingsButtons[standingsButtons.length - 1].click();
  await page.waitForResponse(
    (r) => r.url().includes("GetRoundStandings") && r.request().method() === "POST",
    { timeout: 5000 },
  ).catch(() => null);
  await page.waitForTimeout(500);
}

// Click each pairings round button
const roundButtonNames = new Map();
const pairingsButtons = await page.locator("#pairings-round-selector-container .round-selector").all();
console.log(`Found ${pairingsButtons.length} rounds`);

// Collect button texts first
const buttonTexts = [];
for (const btn of pairingsButtons) {
  buttonTexts.push((await btn.textContent().catch(() => ""))?.trim() || "");
}

// Click each button and track which round ID it loads
for (let i = 0; i < pairingsButtons.length; i++) {
  const btn = pairingsButtons[i];
  const text = buttonTexts[i];
  const sizesBefore = new Set(matchesByRound.keys());

  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForResponse(
    (r) => r.url().includes("GetRoundMatches") && r.request().method() === "POST",
    { timeout: 5000 },
  ).catch(() => null);
  await page.waitForTimeout(500);

  // Find the newly added round ID
  for (const roundId of matchesByRound.keys()) {
    if (!sizesBefore.has(roundId) && text) {
      roundButtonNames.set(roundId, text);
    }
  }
  // If no new round was added (already cached from page load), find the unmatched one
  if (matchesByRound.size === sizesBefore.size) {
    for (const roundId of matchesByRound.keys()) {
      if (!roundButtonNames.has(roundId) && text) {
        roundButtonNames.set(roundId, text);
      }
    }
  }
  process.stdout.write(".");
}
console.log("");

await context.close();

// Process the data
const allMatches = [];
const players = {};
const eventTier = tierArg;
const tournamentDate = latestStandings[0]?.DateCreated || new Date().toISOString();

// Load player aliases
const { rows: aliasRows } = await pool.query("SELECT alias, canonical_id FROM player_aliases");
const aliasMap = new Map(aliasRows.map(r => [r.alias, r.canonical_id]));
const resolve = (key) => aliasMap.get(key) ?? key;

for (const [roundId, matches] of matchesByRound) {
  const roundName = roundButtonNames.get(roundId) || `Round ${roundId}`;
  for (const match of matches) {
    if (match.ByeReason != null || match.GhostMatch || !match.HasResult || !match.Competitors || match.Competitors.length < 2) continue;

    const c1 = match.Competitors[0];
    const c2 = match.Competitors[1];
    if (!c1.Team?.Players?.length || !c2.Team?.Players?.length) continue;

    const p1 = c1.Team.Players[0];
    const p2 = c2.Team.Players[0];
    const p1Key = resolve((p1.Username || p1.DisplayName).toLowerCase());
    const p2Key = resolve((p2.Username || p2.DisplayName).toLowerCase());

    players[p1Key] = { id: p1Key, meleeId: p1.ID, name: p1.Name || p1.DisplayName, username: p1.Username || p1.DisplayName };
    players[p2Key] = { id: p2Key, meleeId: p2.ID, name: p2.Name || p2.DisplayName, username: p2.Username || p2.DisplayName };

    allMatches.push({
      p1Key, p2Key,
      p1Wins: c1.GameWins + (c1.GameByes || 0),
      p2Wins: c2.GameWins + (c2.GameByes || 0),
      roundName: match.RoundName || roundName,
    });
  }
}

// Detect top cut
const roundOrder = [...roundButtonNames.values()];
const allRoundNamesLower = roundOrder.map(n => n.toLowerCase());
const hasQuarters = allRoundNamesLower.some(n => n.includes("quarter"));
const hasSemis = allRoundNamesLower.some(n => n.includes("semi"));
let topCutSize = hasQuarters ? 8 : hasSemis ? 4 : 0;

if (topCutSize === 0) {
  const matchesPerRound = roundOrder.map(rn => allMatches.filter(m => m.roundName === rn).length).filter(c => c > 0);
  const last3 = matchesPerRound.slice(-3);
  if (last3.length === 3 && last3[0] === 4 && last3[1] === 2 && last3[2] === 1) topCutSize = 8;
  else {
    const last2 = matchesPerRound.slice(-2);
    if (last2.length === 2 && last2[0] === 2 && last2[1] === 1) topCutSize = 4;
  }
}

const playerCount = Object.keys(players).length;

// Cap top cut by player count: <9 = 1st only, 9-16 = top 4 max, 17+ = top 8
if (topCutSize === 0) topCutSize = 1;
else if (playerCount <= 16) topCutSize = Math.min(topCutSize, 4);

console.log(`Players: ${playerCount}, Matches: ${allMatches.length}, Top cut: ${topCutSize}`);

// Write to database
const client = await pool.connect();
try {
  await client.query("BEGIN");

  // Ensure tables exist
  await client.query(`
    CREATE TABLE IF NOT EXISTS scraped_data (tournament_id INTEGER PRIMARY KEY, raw_json TEXT NOT NULL, scraped_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS player_aliases (alias TEXT PRIMARY KEY, canonical_id TEXT NOT NULL);
  `);

  // Flag new players as potential renames
  const playerIds = Object.keys(players);
  if (playerIds.length > 0) {
    const placeholders = playerIds.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: existingPlayers } = await client.query(
      `SELECT id FROM players WHERE id IN (${placeholders})`, playerIds
    );
    const existingSet = new Set(existingPlayers.map(r => r.id));
    const newIds = playerIds.filter(id => !existingSet.has(id));
    const now = new Date().toISOString();
    for (const id of newIds) {
      await client.query(
        `INSERT INTO pending_aliases (username, tournament_id, tournament_name, created_at)
         VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
        [id, tournamentId, name, now]
      );
    }
    if (newIds.length > 0) {
      console.log(`Flagged ${newIds.length} new player(s) for review: ${newIds.join(", ")}`);
    }
  }

  // Clear existing data for this tournament
  await client.query("DELETE FROM matches WHERE tournament_id = $1", [tournamentId]);
  await client.query("DELETE FROM placements WHERE tournament_id = $1", [tournamentId]);
  await client.query("DELETE FROM decklists WHERE tournament_id = $1", [tournamentId]);
  await client.query("DELETE FROM tournaments WHERE id = $1", [tournamentId]);

  // Insert tournament
  await client.query(
    `INSERT INTO tournaments (id, name, organization_name, date, tags, player_count, match_count, event_tier, ingested_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [tournamentId, name, orgName?.trim() || "Unknown", tournamentDate, "[]", playerCount, allMatches.length, eventTier, tournamentDate]
  );

  // Insert players
  for (const p of Object.values(players)) {
    await client.query(
      `INSERT INTO players (id, melee_id, name, username) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET melee_id = EXCLUDED.melee_id, name = EXCLUDED.name, username = EXCLUDED.username`,
      [p.id, p.meleeId, p.name, p.username]
    );
  }

  // Insert matches
  for (const m of allMatches) {
    await client.query(
      `INSERT INTO matches (tournament_id, player1_id, player2_id, player1_wins, player2_wins, round_name, date, event_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tournamentId, m.p1Key, m.p2Key, m.p1Wins, m.p2Wins, m.roundName, tournamentDate, eventTier]
    );
  }

  // Insert placements
  for (const s of latestStandings) {
    if (!s.Team?.Players?.length) continue;
    const playerId = resolve((s.Team.Players[0].Username || s.Team.Players[0].DisplayName).toLowerCase());
    if (s.Rank <= topCutSize) {
      await client.query(
        "INSERT INTO placements (tournament_id, player_id, placement, event_tier, date) VALUES ($1, $2, $3, $4, $5)",
        [tournamentId, playerId, s.Rank, eventTier, tournamentDate]
      );
    }
  }

  // Insert decklists
  for (const s of latestStandings) {
    if (!s.Team?.Players?.length || !s.Decklists?.length) continue;
    const playerId = resolve((s.Team.Players[0].Username || s.Team.Players[0].DisplayName).toLowerCase());
    const deck = s.Decklists[0];
    const deckName = deck.DecklistName || "";
    if (deckName) {
      const parts = deckName.split(" - ");
      const leader = parts[0]?.trim() || deckName;
      const base = parts[1]?.trim() || "";
      await client.query(
        "INSERT INTO decklists (tournament_id, player_id, leader, base, full_name, decklist_guid) VALUES ($1, $2, $3, $4, $5, $6)",
        [tournamentId, playerId, leader, base, deckName, deck.DecklistId || null]
      );
    }
  }

  // Store raw data for re-ingestion
  await client.query(
    `INSERT INTO scraped_data (tournament_id, raw_json, scraped_at) VALUES ($1, $2, $3)
     ON CONFLICT (tournament_id) DO UPDATE SET raw_json = EXCLUDED.raw_json, scraped_at = EXCLUDED.scraped_at`,
    [tournamentId, JSON.stringify({ name, standings: latestStandings, matchesByRound: [...matchesByRound.entries()], roundNames: [...roundButtonNames.entries()] }), tournamentDate]
  );

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
}

// Trigger rating recalculation via the API
console.log("Recalculating ratings...");
try {
  await fetch("http://localhost:3001/api/admin/recalculate?snapshot=true", {
    method: "POST",
    headers: { "x-admin-pin": process.env.ADMIN_PIN || "" },
  });
} catch {
  console.log("Warning: could not trigger recalculation. Hit Recalculate on the admin page.");
}

console.log(`\nDone! Ingested ${name}: ${allMatches.length} matches, ${playerCount} players, tier: ${eventTier}`);

await pool.end();
