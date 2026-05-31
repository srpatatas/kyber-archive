#!/usr/bin/env node
import { chromium } from "playwright";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "midichlorian.db");

const args = process.argv.slice(2);
const tournamentUrl = args[0];
const tierArg = args[1] || "showdown";

if (!tournamentUrl) {
  console.error("Usage: node scrape.mjs <tournament-url-or-id> [tier]");
  console.error("Tiers: padawan, minor, showdown, major, planetary, sector, galactic");
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
console.log(`Tournament: ${name}`);

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

for (const btn of pairingsButtons) {
  const text = (await btn.textContent().catch(() => ""))?.trim() || "";
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForResponse(
    (r) => r.url().includes("GetRoundMatches") && r.request().method() === "POST",
    { timeout: 5000 },
  ).catch(() => null);
  await page.waitForTimeout(500);

  const lastRoundId = [...matchesByRound.keys()].pop();
  if (lastRoundId && text) {
    roundButtonNames.set(lastRoundId, text);
  }
  process.stdout.write(".");
}
console.log("");

await context.close();

// Process the data
const allMatches = [];
const players = {};
const eventTier = tierArg;
const tournamentDate = new Date().toISOString();

for (const [roundId, matches] of matchesByRound) {
  const roundName = roundButtonNames.get(roundId) || `Round ${roundId}`;
  for (const match of matches) {
    if (match.ByeReason != null || match.GhostMatch || !match.HasResult || !match.Competitors || match.Competitors.length < 2) continue;

    const c1 = match.Competitors[0];
    const c2 = match.Competitors[1];
    if (!c1.Team?.Players?.length || !c2.Team?.Players?.length) continue;

    const p1 = c1.Team.Players[0];
    const p2 = c2.Team.Players[0];
    const p1Key = (p1.Username || p1.DisplayName).toLowerCase();
    const p2Key = (p2.Username || p2.DisplayName).toLowerCase();

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
    else topCutSize = 4;
  }
}

const playerCount = Object.keys(players).length;
console.log(`Players: ${playerCount}, Matches: ${allMatches.length}, Top cut: ${topCutSize}`);

// Write to database
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS scraped_data (tournament_id INTEGER PRIMARY KEY, raw_json TEXT NOT NULL, scraped_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS player_aliases (alias TEXT PRIMARY KEY, canonical_id TEXT NOT NULL);
`);

const tx = db.transaction(() => {
  // Clear existing data for this tournament
  db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournamentId);
  db.prepare("DELETE FROM placements WHERE tournament_id = ?").run(tournamentId);
  db.prepare("DELETE FROM decklists WHERE tournament_id = ?").run(tournamentId);
  db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournamentId);

  // Insert tournament
  db.prepare(`
    INSERT INTO tournaments (id, name, organization_name, date, tags, player_count, match_count, event_tier, ingested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tournamentId, name, "Scraped", tournamentDate, "[]", playerCount, allMatches.length, eventTier, tournamentDate);

  // Insert players
  const insertPlayer = db.prepare("INSERT OR REPLACE INTO players (id, melee_id, name, username) VALUES (?, ?, ?, ?)");
  for (const p of Object.values(players)) {
    insertPlayer.run(p.id, p.meleeId, p.name, p.username);
  }

  // Insert matches
  const insertMatch = db.prepare(`
    INSERT INTO matches (tournament_id, player1_id, player2_id, player1_wins, player2_wins, round_name, date, event_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of allMatches) {
    insertMatch.run(tournamentId, m.p1Key, m.p2Key, m.p1Wins, m.p2Wins, m.roundName, tournamentDate, eventTier);
  }

  // Insert placements
  const insertPlacement = db.prepare("INSERT INTO placements (tournament_id, player_id, placement, event_tier, date) VALUES (?, ?, ?, ?, ?)");
  for (const s of latestStandings) {
    if (!s.Team?.Players?.length) continue;
    const playerId = (s.Team.Players[0].Username || s.Team.Players[0].DisplayName).toLowerCase();
    if (s.Rank <= topCutSize) {
      insertPlacement.run(tournamentId, playerId, s.Rank, eventTier, tournamentDate);
    }
  }

  // Insert decklists
  const insertDecklist = db.prepare("INSERT INTO decklists (tournament_id, player_id, leader, base, full_name, decklist_guid) VALUES (?, ?, ?, ?, ?, ?)");
  for (const s of latestStandings) {
    if (!s.Team?.Players?.length || !s.Decklists?.length) continue;
    const playerId = (s.Team.Players[0].Username || s.Team.Players[0].DisplayName).toLowerCase();
    const deck = s.Decklists[0];
    const deckName = deck.DecklistName || "";
    if (deckName) {
      const parts = deckName.split(" - ");
      const leader = parts[0]?.trim() || deckName;
      const base = parts[1]?.trim() || "";
      insertDecklist.run(tournamentId, playerId, leader, base, deckName, deck.DecklistId || null);
    }
  }

  // Store raw data for re-ingestion
  db.prepare("INSERT OR REPLACE INTO scraped_data (tournament_id, raw_json, scraped_at) VALUES (?, ?, ?)").run(
    tournamentId,
    JSON.stringify({ name, standings: latestStandings, matchesByRound: [...matchesByRound.entries()], roundNames: [...roundButtonNames.entries()] }),
    tournamentDate,
  );
});

tx();

// Trigger rating recalculation via the API
console.log("Recalculating ratings...");
try {
  await fetch("http://localhost:3001/api/admin/recalculate", { method: "POST" });
} catch {
  console.log("Warning: could not trigger recalculation. Hit Recalculate on the admin page.");
}

console.log(`\nDone! Ingested ${name}: ${allMatches.length} matches, ${playerCount} players, tier: ${eventTier}`);
