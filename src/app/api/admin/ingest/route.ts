import { NextRequest, NextResponse } from "next/server";
import {
  parseTournamentUrl,
  getTournament,
  getRoundMatches,
  getTournamentStandings,
} from "@/lib/melee-client";
import { addTournament, isTournamentIngested, removeTournament, updateTournamentTier } from "@/lib/store";
import { MatchResult, PlacementResult, EventTier, classifyEvent } from "@/lib/elo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const tournamentId = parseTournamentUrl(url);
    if (!tournamentId) {
      return NextResponse.json(
        { error: "Invalid tournament URL. Use format: https://melee.gg/Tournament/View/{id}" },
        { status: 400 }
      );
    }

    const tournament = await getTournament(tournamentId);

    if (tournament.Game !== "StarWarsUnlimited") {
      return NextResponse.json(
        { error: `This is a ${tournament.Game} tournament, not Star Wars: Unlimited` },
        { status: 400 }
      );
    }

    const tournamentDate = tournament.LastPairDateTime ?? new Date().toISOString();

    const allRounds = tournament.Phases.flatMap((phase) =>
      phase.Rounds.map((round) => ({
        ...round,
        phaseName: phase.Name,
        phaseSort: phase.SortOrder,
      }))
    ).sort((a, b) => a.phaseSort - b.phaseSort || a.SortOrder - b.SortOrder);

    const allMatches: MatchResult[] = [];
    const pendingTier = "weekly" as const;
    const players: Record<string, { id: string; meleeId: number; name: string; username: string }> = {};

    for (const round of allRounds) {
      const matches = await getRoundMatches(round.ID);

      for (const match of matches) {
        if (match.ByeReason != null || match.GhostMatch || !match.HasResult || match.Competitors.length < 2) continue;

        const c1 = match.Competitors[0];
        const c2 = match.Competitors[1];

        if (!c1.Team.Players.length || !c2.Team.Players.length) continue;

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
          tournamentName: tournament.Name,
          roundName: round.Name,
          date: tournamentDate,
          eventTier: pendingTier,
        });
      }
    }

    const playerCount = Object.keys(players).length;
    const eventTier = classifyEvent(tournament.SearchTags, tournament.Name, playerCount);

    for (const match of allMatches) {
      match.eventTier = eventTier;
    }

    const standings = await getTournamentStandings(tournamentId);
    const placements: PlacementResult[] = [];
    const decklistEntries: { playerId: string; leader: string; base: string; fullName: string }[] = [];

    for (const standing of standings) {
      if (standing.Team.Players.length === 0) continue;
      const sp = standing.Team.Players[0];
      const playerId = (sp.Username || sp.DisplayName).toLowerCase();

      if (standing.Rank <= 8) {
        placements.push({
          playerId,
          tournamentId,
          placement: standing.Rank,
          eventTier,
          date: tournamentDate,
        });
      }

      if (standing.Decklists && standing.Decklists.length > 0) {
        const deckName = standing.Decklists[0].DecklistName || "";
        if (deckName) {
          const parts = deckName.split(" - ");
          const leader = parts[0]?.trim() || deckName;
          const base = parts[1]?.trim() || "";
          decklistEntries.push({ playerId, leader, base, fullName: deckName });
        }
      }
    }

    addTournament(
      {
        id: tournamentId,
        name: tournament.Name,
        organizationName: tournament.OrganizationName,
        date: tournamentDate,
        tags: tournament.SearchTags,
        playerCount: Object.keys(players).length,
        matchCount: allMatches.length,
        eventTier,
        ingestedAt: new Date().toISOString(),
      },
      allMatches,
      placements,
      decklistEntries,
      players
    );

    return NextResponse.json({
      success: true,
      tournament: tournament.Name,
      matchesIngested: allMatches.length,
      playersFound: Object.keys(players).length,
      eventTier,
      alreadyExisted: isTournamentIngested(tournamentId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_TIERS: EventTier[] = ["weekly", "showdown", "planetary", "sector", "galactic"];

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, eventTier } = body;
    if (!id || !eventTier) {
      return NextResponse.json({ error: "id and eventTier are required" }, { status: 400 });
    }
    if (!VALID_TIERS.includes(eventTier)) {
      return NextResponse.json({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` }, { status: 400 });
    }
    const updated = updateTournamentTier(parseInt(id, 10), eventTier);
    if (!updated) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, eventTier });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }
    const removed = removeTournament(parseInt(id, 10));
    return NextResponse.json({ success: true, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
