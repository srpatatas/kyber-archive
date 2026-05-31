import { chromium } from "playwright";
import type { MeleeMatch, MeleeStanding } from "./melee-client";

export interface ScrapeResult {
  tournamentId: number;
  name: string;
  standings: MeleeStanding[];
  matches: MeleeMatch[];
  roundNames: Map<string, string>;
}

export async function scrapeTournament(tournamentId: number): Promise<ScrapeResult> {
  const url = `https://melee.gg/Tournament/View/${tournamentId}`;

  const context = await chromium.launchPersistentContext("/tmp/pw-profile-midichlorian", {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const matchesByRound = new Map<string, MeleeMatch[]>();
  const roundButtonNames = new Map<string, string>();
  let latestStandings: MeleeStanding[] = [];

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

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dismiss cookie banner
    const acceptCookies = page.locator("button:has-text('Accept all cookies'), a:has-text('Accept all cookies')").first();
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
      await page.waitForTimeout(1000);
    }

    const title = await page.title();
    const name = title.replace(" | Melee", "").trim();

    // Click the last standings round button to get final standings
    const standingsButtons = await page.locator("#standings-round-selector-container .round-selector").all();
    if (standingsButtons.length > 0) {
      const lastBtn = standingsButtons[standingsButtons.length - 1];
      await lastBtn.scrollIntoViewIfNeeded();
      await lastBtn.click();
      await page.waitForResponse(
        (r) => r.url().includes("GetRoundStandings") && r.request().method() === "POST",
        { timeout: 5000 },
      ).catch(() => null);
      await page.waitForTimeout(500);
    }

    // Click each pairings round button to collect all match data
    const pairingsButtons = await page.locator("#pairings-round-selector-container .round-selector").all();
    for (const btn of pairingsButtons) {
      const text = (await btn.textContent().catch(() => ""))?.trim() || "";
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForResponse(
        (r) => r.url().includes("GetRoundMatches") && r.request().method() === "POST",
        { timeout: 5000 },
      ).catch(() => null);
      await page.waitForTimeout(500);

      // Map the last captured round ID to this button's text
      const lastRoundId = [...matchesByRound.keys()].pop();
      if (lastRoundId && text) {
        roundButtonNames.set(lastRoundId, text);
      }
    }

    // Flatten all matches and attach round names
    const allMatches: MeleeMatch[] = [];
    for (const [roundId, matches] of matchesByRound) {
      const buttonName = roundButtonNames.get(roundId);
      for (const match of matches) {
        if (!match.RoundName && buttonName) {
          match.RoundName = buttonName;
        }
        allMatches.push(match);
      }
    }

    return {
      tournamentId,
      name,
      standings: latestStandings,
      matches: allMatches,
      roundNames: roundButtonNames,
    };
  } finally {
    await context.close();
  }
}
