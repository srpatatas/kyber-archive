import sparticuzChromium from "@sparticuz/chromium";
import { chromium } from "playwright-core";

export interface ScrapedMatch {
  player1Key: string;
  player2Key: string;
  player1Wins: number;
  player2Wins: number;
  roundName: string;
  isBye: boolean;
}

export interface ScrapedStanding {
  rank: number;
  playerId: string;
  playerName: string;
  playerUsername: string;
  playerMeleeId: number;
  decklistName: string | null;
  decklistGuid: string | null;
}

export interface ScrapedPlayer {
  id: string;
  meleeId: number;
  name: string;
  username: string;
}

export interface ScrapeResult {
  tournamentName: string;
  organizationName: string;
  tournamentDate: string;
  matches: ScrapedMatch[];
  standings: ScrapedStanding[];
  players: Record<string, ScrapedPlayer>;
  roundNames: string[];
}

export async function scrapeTournamentPublic(tournamentId: number): Promise<ScrapeResult> {
  const isVercel = !!process.env.VERCEL;
  const browser = await chromium.launch({
    args: isVercel ? sparticuzChromium.args : [],
    executablePath: isVercel ? await sparticuzChromium.executablePath() : undefined,
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    const matchesByRound = new Map<string, unknown[]>();
    let latestStandings: unknown[] = [];
    const roundButtonNames = new Map<string, string>();

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
    await page.waitForTimeout(2000);

    // Dismiss cookies
    const acceptCookies = page.locator("button:has-text('Accept all cookies'), a:has-text('Accept all cookies')").first();
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
      await page.waitForTimeout(500);
    }

    const title = await page.title();
    const tournamentName = title.replace(" | Melee", "").trim();
    const orgName = await page.locator(".tournament-organizer-name, a[href*='/Hub/Organization/']").first().textContent().catch(() => null);

    // Click last standings round for final standings
    const standingsButtons = await page.locator("#standings-round-selector-container .round-selector").all();
    if (standingsButtons.length > 0) {
      await standingsButtons[standingsButtons.length - 1].scrollIntoViewIfNeeded();
      await standingsButtons[standingsButtons.length - 1].click();
      await page.waitForResponse(
        (r) => r.url().includes("GetRoundStandings") && r.request().method() === "POST",
        { timeout: 5000 },
      ).catch(() => null);
      await page.waitForTimeout(1000);
    }

    // Click all pairings rounds
    const pairingsButtons = await page.locator("#pairings-round-selector-container .round-selector").all();
    for (const button of pairingsButtons) {
      const buttonName = await button.textContent();
      await button.scrollIntoViewIfNeeded();
      await button.click();
      const resp = await page.waitForResponse(
        (r) => r.url().includes("GetRoundMatches") && r.request().method() === "POST",
        { timeout: 5000 },
      ).catch(() => null);
      if (resp) {
        const roundId = resp.url().match(/GetRoundMatches\/(\d+)/)?.[1];
        if (roundId && buttonName) {
          roundButtonNames.set(roundId, buttonName.trim());
        }
      }
      await page.waitForTimeout(300);
    }

    await context.close();

    // Process collected data
    const players: Record<string, ScrapedPlayer> = {};
    const matches: ScrapedMatch[] = [];
    const roundNames: string[] = [];

    for (const [roundId, roundMatches] of matchesByRound) {
      const roundName = roundButtonNames.get(roundId) || `Round ${roundId}`;
      roundNames.push(roundName);

      for (const match of roundMatches as Record<string, unknown>[]) {
        if ((match as Record<string, unknown>).GhostMatch || !(match as Record<string, unknown>).HasResult) continue;

        const competitors = (match as Record<string, unknown>).Competitors as Record<string, unknown>[] | undefined;
        if (!competitors) continue;

        // Handle byes
        if (competitors.length < 2 || (match as Record<string, unknown>).ByeReason != null) {
          const c = competitors[0];
          const team = c?.Team as Record<string, unknown> | undefined;
          const teamPlayers = team?.Players as Record<string, unknown>[] | undefined;
          if (!teamPlayers?.length) continue;
          const p = teamPlayers[0];
          const pKey = ((p.Username || p.DisplayName) as string).toLowerCase();
          players[pKey] = {
            id: pKey,
            meleeId: p.ID as number,
            name: (p.Name || p.DisplayName) as string,
            username: (p.Username || p.DisplayName) as string,
          };
          matches.push({
            player1Key: pKey,
            player2Key: "__bye__",
            player1Wins: 2,
            player2Wins: 0,
            roundName,
            isBye: true,
          });
          continue;
        }

        const c1 = competitors[0];
        const c2 = competitors[1];
        const t1 = c1.Team as Record<string, unknown>;
        const t2 = c2.Team as Record<string, unknown>;
        const p1s = t1?.Players as Record<string, unknown>[];
        const p2s = t2?.Players as Record<string, unknown>[];
        if (!p1s?.length || !p2s?.length) continue;

        const p1 = p1s[0];
        const p2 = p2s[0];
        const p1Key = ((p1.Username || p1.DisplayName) as string).toLowerCase();
        const p2Key = ((p2.Username || p2.DisplayName) as string).toLowerCase();

        players[p1Key] = {
          id: p1Key,
          meleeId: p1.ID as number,
          name: (p1.Name || p1.DisplayName) as string,
          username: (p1.Username || p1.DisplayName) as string,
        };
        players[p2Key] = {
          id: p2Key,
          meleeId: p2.ID as number,
          name: (p2.Name || p2.DisplayName) as string,
          username: (p2.Username || p2.DisplayName) as string,
        };

        matches.push({
          player1Key: p1Key,
          player2Key: p2Key,
          player1Wins: (c1.GameWins as number) + ((c1 as Record<string, unknown>).GameByes as number || 0),
          player2Wins: (c2.GameWins as number) + ((c2 as Record<string, unknown>).GameByes as number || 0),
          roundName,
          isBye: false,
        });
      }
    }

    // Process standings
    const standings: ScrapedStanding[] = [];
    for (const s of latestStandings as Record<string, unknown>[]) {
      const team = s.Team as Record<string, unknown> | undefined;
      const teamPlayers = (team?.Players as Record<string, unknown>[]) || [];
      if (!teamPlayers.length) continue;
      const p = teamPlayers[0];
      const playerId = ((p.Username || p.DisplayName) as string).toLowerCase();

      let decklistName: string | null = null;
      let decklistGuid: string | null = null;
      const decklists = s.Decklists as Record<string, unknown>[] | undefined;
      if (decklists?.length) {
        decklistName = (decklists[0].DecklistName as string) || null;
        decklistGuid = (decklists[0].DecklistId as string) || null;
      }

      standings.push({
        rank: s.Rank as number,
        playerId,
        playerName: (p.Name || p.DisplayName) as string,
        playerUsername: (p.Username || p.DisplayName) as string,
        playerMeleeId: p.ID as number,
        decklistName,
        decklistGuid,
      });
    }

    const tournamentDate = latestStandings.length > 0
      ? ((latestStandings[0] as Record<string, unknown>).DateCreated as string) || new Date().toISOString()
      : new Date().toISOString();

    return {
      tournamentName,
      organizationName: orgName?.trim() || "Unknown",
      tournamentDate,
      matches,
      standings,
      players,
      roundNames,
    };
  } finally {
    await browser.close();
  }
}
