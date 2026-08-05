import { NextRequest, NextResponse } from "next/server";
import { requireAdminPin } from "@/lib/admin-auth";
import { scrapeTournamentPublic } from "@/lib/melee-public-scraper";
import { parseTournamentUrl } from "@/lib/melee-client";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { url, eventTier, dryRun = true } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const tournamentId = parseTournamentUrl(url) ?? parseInt(url, 10);
    if (!tournamentId || isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament URL or ID" }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await scrapeTournamentPublic(tournamentId);
    const elapsed = Date.now() - startTime;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        elapsed: `${(elapsed / 1000).toFixed(1)}s`,
        tournament: result.tournamentName,
        organization: result.organizationName,
        date: result.tournamentDate,
        matchCount: result.matches.length,
        playerCount: Object.keys(result.players).length,
        standingsCount: result.standings.length,
        roundNames: result.roundNames,
        byeCount: result.matches.filter(m => m.isBye).length,
        topStandings: result.standings.slice(0, 5).map(s => ({
          rank: s.rank,
          player: s.playerUsername,
          decklist: s.decklistName,
        })),
        eventTier: eventTier || "not set",
      });
    }

    // TODO: Full ingestion via addTournament() — to be enabled after dry run testing
    return NextResponse.json({ error: "Full ingestion not yet implemented" }, { status: 501 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
