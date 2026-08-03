import { NextRequest, NextResponse } from "next/server";
import {
  parseTournamentUrl,
  getTournament,
  getRoundMatches,
  getTournamentStandings,
  getDecklistAspects,
} from "@/lib/melee-client";
import { addTournament, isTournamentIngested, removeTournament, updateTournamentTier, getCachedAspects, setCachedAspects, loadAliasMap, flagNewPlayers, setTournamentNacional, setTournamentCountsForNacional } from "@/lib/store";
import { query } from "@/lib/db";
import { MatchResult, PlacementResult, EventTier, classifyEvent } from "@/lib/elo";
import { requireAdminPin } from "@/lib/admin-auth";
import { revalidateAllData } from "@/lib/revalidate";

export async function POST(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
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

    const aliasMap = await loadAliasMap();
    const resolve = (key: string) => aliasMap.get(key) ?? key;

    const allMatches: MatchResult[] = [];
    const pendingTier = "minor" as const;
    const players: Record<string, { id: string; meleeId: number; name: string; username: string }> = {};

    for (const round of allRounds) {
      const matches = await getRoundMatches(round.ID);

      for (const match of matches) {
        if (match.GhostMatch || !match.HasResult) continue;

        // Handle byes — count as a win for the single competitor
        if (match.Competitors.length < 2 || match.ByeReason != null) {
          const c = match.Competitors?.[0];
          if (!c?.Team?.Players?.length) continue;
          const p = c.Team.Players[0];
          const pKey = resolve((p.Username || p.DisplayName).toLowerCase());
          players[pKey] = { id: pKey, meleeId: p.ID, name: p.Name || p.DisplayName, username: p.Username || p.DisplayName };
          allMatches.push({
            player1Id: pKey, player2Id: "__bye__", player1Wins: 2, player2Wins: 0,
            tournamentId, tournamentName: tournament.Name, roundName: round.Name, date: tournamentDate, eventTier: pendingTier,
          });
          continue;
        }

        const c1 = match.Competitors[0];
        const c2 = match.Competitors[1];

        if (!c1.Team.Players.length || !c2.Team.Players.length) continue;

        const p1 = c1.Team.Players[0];
        const p2 = c2.Team.Players[0];

        const p1Key = resolve((p1.Username || p1.DisplayName).toLowerCase());
        const p2Key = resolve((p2.Username || p2.DisplayName).toLowerCase());

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

    const allRoundNames = allRounds.map((r) => r.Name.toLowerCase());
    const hasQuarters = allRoundNames.some((n) => n.includes("quarter"));
    const hasSemis = allRoundNames.some((n) => n.includes("semi"));
    let topCutSize = hasQuarters ? 8 : hasSemis ? 4 : 0;

    if (topCutSize === 0) {
      const matchesPerRound = allRounds.map((r) =>
        allMatches.filter((m) => m.roundName === r.Name).length
      ).filter((c) => c > 0);
      const last3 = matchesPerRound.slice(-3);
      if (last3.length === 3 && last3[0] === 4 && last3[1] === 2 && last3[2] === 1) {
        topCutSize = 8;
      } else {
        const last2 = matchesPerRound.slice(-2);
        if (last2.length === 2 && last2[0] === 2 && last2[1] === 1) {
          topCutSize = 4;
        }
      }
    }

    // No bracket detected = kyber only; cap by player count otherwise
    if (topCutSize === 0) topCutSize = 1;
    else if (playerCount <= 16) topCutSize = Math.min(topCutSize, 4);

    const standings = await getTournamentStandings(tournamentId);
    const placements: PlacementResult[] = [];
    const decklistEntries: { playerId: string; leader: string; base: string; fullName: string; decklistGuid: string | null }[] = [];

    for (const standing of standings) {
      if (standing.Team.Players.length === 0) continue;
      const sp = standing.Team.Players[0];
      const playerId = resolve((sp.Username || sp.DisplayName).toLowerCase());

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
    const seenDeckKeys = new Set<string>();
    for (const d of decklistEntries) {
      const deckKey = `${d.leader}||${d.base}`;
      if (seenDeckKeys.has(deckKey)) continue;
      seenDeckKeys.add(deckKey);
      const cached = await getCachedAspects(deckKey);
      if (cached === null && d.decklistGuid) {
        const aspects = await getDecklistAspects(d.decklistGuid);
        if (aspects.length > 0) {
          await setCachedAspects(deckKey, aspects);
        }
      }
    }

    const newPlayers = await flagNewPlayers(Object.keys(players), tournamentId, tournament.Name);

    await addTournament(
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

    await query(
      `INSERT INTO scraped_data (tournament_id, raw_json, scraped_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (tournament_id) DO UPDATE SET raw_json = EXCLUDED.raw_json, scraped_at = EXCLUDED.scraped_at`,
      [tournamentId, JSON.stringify({ standings, name: tournament.Name }), new Date().toISOString()]
    );

    revalidateAllData();

    return NextResponse.json({
      success: true,
      tournament: tournament.Name,
      matchesIngested: allMatches.length,
      playersFound: Object.keys(players).length,
      newPlayers: newPlayers.length,
      eventTier,
      alreadyExisted: await isTournamentIngested(tournamentId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_TIERS: EventTier[] = ["minor", "showdown", "major", "planetary", "sector", "galactic"];

export async function PATCH(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id, eventTier, isNacional, countsForNacional } = body;

    if (typeof isNacional === "boolean" && id) {
      const updated = await setTournamentNacional(parseInt(id, 10), isNacional);
      if (!updated) {
        return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      }
      revalidateAllData();
      return NextResponse.json({ success: true, isNacional });
    }

    if (typeof countsForNacional === "boolean" && id) {
      const updated = await setTournamentCountsForNacional(parseInt(id, 10), countsForNacional);
      if (!updated) {
        return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      }
      revalidateAllData();
      return NextResponse.json({ success: true, countsForNacional });
    }

    if (!id || !eventTier) {
      return NextResponse.json({ error: "id and eventTier are required" }, { status: 400 });
    }
    if (!VALID_TIERS.includes(eventTier)) {
      return NextResponse.json({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` }, { status: 400 });
    }
    const updated = await updateTournamentTier(parseInt(id, 10), eventTier);
    if (!updated) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    revalidateAllData();
    return NextResponse.json({ success: true, eventTier });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdminPin(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });
    }
    const removed = await removeTournament(parseInt(id, 10));
    revalidateAllData();
    return NextResponse.json({ success: true, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
