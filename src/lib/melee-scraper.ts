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

  // Only intercept standings responses (matches are fetched via direct HTTP below)
  page.on("response", async (response) => {
    if (response.request().method() !== "POST") return;
    const reqUrl = response.url();
    const ct = response.headers()["content-type"] || "";
    if (!ct.includes("json")) return;

    try {
      const json = await response.json();
      if (!json.data) return;

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

    // Discover round IDs: click each pairings button once, intercept the round ID from the response URL
    const pairingsButtons = await page.locator("#pairings-round-selector-container .round-selector").all();
    for (const btn of pairingsButtons) {
      const text = (await btn.textContent().catch(() => ""))?.trim() || "";
      await btn.scrollIntoViewIfNeeded();
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("GetRoundMatches") && r.request().method() === "POST",
          { timeout: 5000 },
        ).catch(() => null),
        btn.click(),
      ]);

      if (resp) {
        const roundId = resp.url().match(/GetRoundMatches\/(\d+)/)?.[1];
        if (roundId && text) {
          roundButtonNames.set(roundId, text);
        }
      }
      await page.waitForTimeout(300);
    }

    // Fetch ALL matches per round via direct HTTP with length=1000
    // This bypasses DataTables 25-per-page pagination entirely
    const cookies = await context.cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

    for (const [roundId, roundName] of roundButtonNames) {
      const fetchUrl = `https://melee.gg/Match/GetRoundMatches/${roundId}`;
      const body = new URLSearchParams({
        draw: "1",
        "columns[0][data]": "0",
        "columns[0][name]": "",
        "columns[0][searchable]": "true",
        "columns[0][orderable]": "false",
        "columns[0][search][value]": "",
        "columns[0][search][regex]": "false",
        start: "0",
        length: "1000",
        "search[value]": "",
        "search[regex]": "false",
      });

      try {
        const resp = await globalThis.fetch(fetchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            Cookie: cookieHeader,
          },
          body: body.toString(),
        });
        const json = await resp.json();
        if (json.data) {
          matchesByRound.set(roundId, json.data);
        }
      } catch {}
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
