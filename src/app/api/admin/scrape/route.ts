import { NextRequest, NextResponse } from "next/server";
import { parseTournamentUrl, getDecklistAspects } from "@/lib/melee-client";
import { scrapeTournament } from "@/lib/melee-scraper";
import { addTournament, isTournamentIngested, getCachedAspects, setCachedAspects } from "@/lib/store";
import { MatchResult, PlacementResult, EventTier, classifyEvent } from "@/lib/elo";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, eventTier: tierOverride } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const tournamentId = parseTournamentUrl(url);
    if (!tournamentId) {
      return NextResponse.json(
        { error: "Invalid tournament URL. Use format: https://melee.gg/Tournament/View/{id}" },
        { status: 400 },
      );
    }

    const scraped = await scrapeTournament(tournamentId);

    const allMatches: MatchResult[] = [];
    const pendingTier = "padawan" as const;
    const players: Record<string, { id: string; meleeId: number; name: string; username: string }> = {};

    for (const match of scraped.matches) {
      if (match.ByeReason != null || match.GhostMatch || !match.HasResult || !match.Competitors || match.Competitors.length < 2) continue;

      const c1 = match.Competitors[0];
      const c2 = match.Competitors[1];
      if (!c1.Team?.Players?.length || !c2.Team?.Players?.length) continue;

      const p1 = c1.Team.Players[0];
      const p2 = c2.Team.Players[0];
      const p1Key = (p1.Username || p1.DisplayName).toLowerCase();
      const p2Key = (p2.Username || p2.DisplayName).toLowerCase();

      players[p1Key] = {
        id: p1Key,
        meleeId: p1.ID,
        name: p1.Name || p1.DisplayName,
        username: p1.Username || p1.DisplayName,
      };
      players[p2Key] = {
        id: p2Key,
        meleeId: p2.ID,
        name: p2.Name || p2.DisplayName,
        username: p2.Username || p2.DisplayName,
      };

      allMatches.push({
        player1Id: p1Key,
        player2Id: p2Key,
        player1Wins: c1.GameWins + (c1.GameByes || 0),
        player2Wins: c2.GameWins + (c2.GameByes || 0),
        tournamentId,
        tournamentName: scraped.name,
        roundName: match.RoundName || `Round ${match.RoundNumber || 0}`,
        date: new Date().toISOString(),
        eventTier: pendingTier,
      });
    }

    const playerCount = Object.keys(players).length;
    const eventTier: EventTier = tierOverride || classifyEvent([], scraped.name, playerCount);

    for (const match of allMatches) {
      match.eventTier = eventTier;
    }

    // Detect top cut size from round names and match counts
    const allRoundNames = [...new Set(allMatches.map((m) => m.roundName.toLowerCase()))];
    const hasQuarters = allRoundNames.some((n) => n.includes("quarter"));
    const hasSemis = allRoundNames.some((n) => n.includes("semi"));
    let topCutSize = hasQuarters ? 8 : hasSemis ? 4 : 0;

    if (topCutSize === 0) {
      const roundOrder = [...scraped.roundNames.values()];
      const matchesPerRound = roundOrder.map((name) =>
        allMatches.filter((m) => m.roundName === name).length
      ).filter((c) => c > 0);
      const last3 = matchesPerRound.slice(-3);
      if (last3.length === 3 && last3[0] === 4 && last3[1] === 2 && last3[2] === 1) {
        topCutSize = 8;
      } else {
        const last2 = matchesPerRound.slice(-2);
        if (last2.length === 2 && last2[0] === 2 && last2[1] === 1) {
          topCutSize = 4;
        } else {
          topCutSize = 4;
        }
      }
    }

    // Build placements from standings
    const placements: PlacementResult[] = [];
    const decklistEntries: { playerId: string; leader: string; base: string; fullName: string; decklistGuid: string | null }[] = [];
    const tournamentDate = new Date().toISOString();

    for (const standing of scraped.standings) {
      if (!standing.Team?.Players?.length) continue;
      const sp = standing.Team.Players[0];
      const playerId = (sp.Username || sp.DisplayName).toLowerCase();

      if (topCutSize > 0 && standing.Rank <= topCutSize) {
        placements.push({
          playerId,
          tournamentId,
          placement: standing.Rank,
          eventTier,
          date: tournamentDate,
        });
      }

      if (standing.Decklists && standing.Decklists.length > 0) {
        const deck = standing.Decklists[0];
        const deckName = deck.DecklistName || "";
        if (deckName) {
          const parts = deckName.split(" - ");
          const leader = parts[0]?.trim() || deckName;
          const base = parts[1]?.trim() || "";
          decklistEntries.push({
            playerId,
            leader,
            base,
            fullName: deckName,
            decklistGuid: deck.DecklistId || null,
          });
        }
      }
    }

    // Fetch aspects for new leader+base combos
    for (const d of decklistEntries) {
      const deckKey = `${d.leader}||${d.base}`;
      const cached = getCachedAspects(deckKey);
      if (cached === null && d.decklistGuid) {
        const aspects = await getDecklistAspects(d.decklistGuid).catch(() => []);
        if (aspects.length > 0) {
          setCachedAspects(deckKey, aspects);
        }
      }
    }

    // Store raw scraped data for re-ingestion
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO scraped_data (tournament_id, raw_json, scraped_at) VALUES (?, ?, ?)").run(
      tournamentId,
      JSON.stringify({ name: scraped.name, standings: scraped.standings, matches: scraped.matches, roundNames: [...scraped.roundNames.entries()] }),
      new Date().toISOString(),
    );

    addTournament(
      {
        id: tournamentId,
        name: scraped.name,
        organizationName: "Scraped",
        date: tournamentDate,
        tags: [],
        playerCount,
        matchCount: allMatches.length,
        eventTier,
        ingestedAt: new Date().toISOString(),
      },
      allMatches,
      placements,
      decklistEntries,
      players,
    );

    return NextResponse.json({
      success: true,
      tournament: scraped.name,
      matchesIngested: allMatches.length,
      playersFound: playerCount,
      eventTier,
      scraped: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
