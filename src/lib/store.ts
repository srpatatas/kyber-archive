import { query, withTransaction } from "./db";
import type { PoolClient } from "@neondatabase/serverless";
import { MatchResult, PlacementResult, PlayerRating, EventTier, computeRatings, computePureElo, computeEloWithPlacements, computeEloTrialWithPlacements, computeEloTrial, computeEloTrialScaledPlacements, computeEloTrialSizePlacements } from "./elo";
import { normalizeBase } from "./base-normalization";
import { recomputeMetaStats } from "./meta";

interface StoredTournament {
  id: number;
  name: string;
  organizationName: string;
  date: string;
  tags: string[];
  playerCount: number;
  matchCount: number;
  eventTier: EventTier;
  ingestedAt: string;
}

interface PlayerInfo {
  id: string;
  meleeId: number;
  name: string;
  username: string;
}

export async function isTournamentIngested(id: number): Promise<boolean> {
  const { rows } = await query("SELECT 1 FROM tournaments WHERE id = $1", [id]);
  return rows.length > 0;
}

interface DecklistEntry {
  playerId: string;
  leader: string;
  base: string;
  fullName: string;
  decklistGuid: string | null;
}

export async function addTournament(
  tournament: StoredTournament,
  matches: MatchResult[],
  placements: PlacementResult[],
  decklistEntries: DecklistEntry[],
  players: Record<string, PlayerInfo>
): Promise<void> {
  await snapshotCurrentRanks();
  await withTransaction(async (client) => {
    await client.query("DELETE FROM matches WHERE tournament_id = $1", [tournament.id]);
    await client.query("DELETE FROM placements WHERE tournament_id = $1", [tournament.id]);
    await client.query("DELETE FROM decklists WHERE tournament_id = $1", [tournament.id]);
    await client.query("DELETE FROM tournaments WHERE id = $1", [tournament.id]);

    const countsForNacional = tournament.eventTier === "showdown" || tournament.eventTier === "planetary";
    await client.query(
      `INSERT INTO tournaments (id, name, organization_name, date, tags, player_count, match_count, event_tier, ingested_at, counts_for_nacional)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [tournament.id, tournament.name, tournament.organizationName, tournament.date,
       JSON.stringify(tournament.tags), tournament.playerCount, tournament.matchCount,
       tournament.eventTier, tournament.ingestedAt, countsForNacional]
    );

    for (const p of Object.values(players)) {
      await client.query(
        `INSERT INTO players (id, melee_id, name, username) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET melee_id = EXCLUDED.melee_id, name = EXCLUDED.name, username = EXCLUDED.username`,
        [p.id, p.meleeId, p.name, p.username]
      );
    }

    for (const m of matches) {
      await client.query(
        `INSERT INTO matches (tournament_id, player1_id, player2_id, player1_wins, player2_wins, round_name, date, event_tier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [m.tournamentId, m.player1Id, m.player2Id, m.player1Wins, m.player2Wins, m.roundName, m.date, m.eventTier]
      );
    }

    for (const p of placements) {
      await client.query(
        `INSERT INTO placements (tournament_id, player_id, placement, event_tier, date) VALUES ($1, $2, $3, $4, $5)`,
        [p.tournamentId, p.playerId, p.placement, p.eventTier, p.date]
      );
    }

    for (const d of decklistEntries) {
      await client.query(
        `INSERT INTO decklists (tournament_id, player_id, leader, base, full_name, decklist_guid) VALUES ($1, $2, $3, $4, $5, $6)`,
        [tournament.id, d.playerId, d.leader, d.base, d.fullName, d.decklistGuid]
      );
    }

    await recomputeRatings(client);
  });
  await recomputeNacionalStandings();
  await recomputeMetaStats(true);
  await stampLastRecalculated();
}

export async function reingestFromCache(tournamentId: number): Promise<boolean> {
  const { rows: cacheRows } = await query(
    "SELECT raw_json, scraped_at FROM scraped_data WHERE tournament_id = $1", [tournamentId]
  );
  if (cacheRows.length === 0) return false;
  const row = cacheRows[0];

  const raw = JSON.parse(row.raw_json);
  const standings = raw.standings || [];
  const matchEntries: [string, unknown[]][] = raw.matchesByRound || [];
  const roundNameEntries: [string, string][] = raw.roundNames || [];
  const roundNameMap = new Map<string, string>(roundNameEntries);
  const tournamentName = raw.name || `Tournament ${tournamentId}`;

  const { rows: existingRows } = await query(
    "SELECT event_tier, organization_name FROM tournaments WHERE id = $1", [tournamentId]
  );
  const existing = existingRows[0] as { event_tier: EventTier; organization_name: string } | undefined;
  const eventTier = existing?.event_tier ?? ("showdown" as EventTier);
  const orgName = existing?.organization_name ?? "Unknown";
  const firstStanding = standings[0] as Record<string, unknown> | undefined;
  const tournamentDate = (firstStanding?.DateCreated as string) || row.scraped_at;

  const aliasMap = await loadAliasMap();
  const resolve = (key: string) => aliasMap.get(key) ?? key;

  const allMatches: MatchResult[] = [];
  const players: Record<string, { id: string; meleeId: number; name: string; username: string }> = {};

  for (const [roundId, matches] of matchEntries) {
    const roundName = roundNameMap.get(roundId) || `Round ${roundId}`;
    for (const match of matches as Record<string, unknown>[]) {
      if (match.ByeReason != null || match.GhostMatch || !match.HasResult) continue;
      const competitors = match.Competitors as Record<string, unknown>[];
      if (!competitors || competitors.length < 2) continue;

      const c1 = competitors[0] as Record<string, unknown>;
      const c2 = competitors[1] as Record<string, unknown>;
      const t1 = c1.Team as Record<string, unknown>;
      const t2 = c2.Team as Record<string, unknown>;
      if (!t1?.Players || !t2?.Players) continue;
      const p1 = (t1.Players as Record<string, unknown>[])[0];
      const p2 = (t2.Players as Record<string, unknown>[])[0];
      if (!p1 || !p2) continue;

      const p1Key = resolve(((p1.Username || p1.DisplayName) as string).toLowerCase());
      const p2Key = resolve(((p2.Username || p2.DisplayName) as string).toLowerCase());

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

      allMatches.push({
        player1Id: p1Key,
        player2Id: p2Key,
        player1Wins: ((c1.GameWins as number) || 0) + ((c1.GameByes as number) || 0),
        player2Wins: ((c2.GameWins as number) || 0) + ((c2.GameByes as number) || 0),
        tournamentId,
        tournamentName,
        roundName: (match.RoundName as string) || roundName,
        date: tournamentDate,
        eventTier,
      });
    }
  }

  const roundNames = [...roundNameMap.values()];
  const rnLower = roundNames.map((n) => n.toLowerCase());
  const hasQuarters = rnLower.some((n) => n.includes("quarter"));
  const hasSemis = rnLower.some((n) => n.includes("semi"));
  let topCutSize = hasQuarters ? 8 : hasSemis ? 4 : 0;
  if (topCutSize === 0) {
    const mpr = roundNames.map((rn) => allMatches.filter((m) => m.roundName === rn).length).filter((c) => c > 0);
    const l3 = mpr.slice(-3);
    if (l3.length === 3 && l3[0] === 4 && l3[1] === 2 && l3[2] === 1) topCutSize = 8;
    else {
      const l2 = mpr.slice(-2);
      if (l2.length === 2 && l2[0] === 2 && l2[1] === 1) topCutSize = 4;
    }
  }

  const playerCount = Object.keys(players).length;

  if (topCutSize === 0) topCutSize = 1;
  else if (playerCount <= 16) topCutSize = Math.min(topCutSize, 4);

  const placementResults: PlacementResult[] = [];
  const decklistEntries: { playerId: string; leader: string; base: string; fullName: string; decklistGuid: string | null }[] = [];

  for (const s of standings as Record<string, unknown>[]) {
    const team = s.Team as Record<string, unknown>;
    if (!team?.Players) continue;
    const sp = (team.Players as Record<string, unknown>[])[0];
    if (!sp) continue;
    const playerId = resolve(((sp.Username || sp.DisplayName) as string).toLowerCase());

    if (topCutSize > 0 && (s.Rank as number) <= topCutSize) {
      placementResults.push({ playerId, tournamentId, placement: s.Rank as number, eventTier, date: tournamentDate });
    }

    const decks = (s.Decklists || []) as Record<string, unknown>[];
    if (decks.length > 0) {
      const deckName = (decks[0].DecklistName || "") as string;
      if (deckName) {
        const parts = deckName.split(" - ");
        decklistEntries.push({
          playerId,
          leader: parts[0]?.trim() || deckName,
          base: parts[1]?.trim() || "",
          fullName: deckName,
          decklistGuid: (decks[0].DecklistId as string) || null,
        });
      }
    }
  }

  await addTournament(
    {
      id: tournamentId,
      name: tournamentName,
      organizationName: orgName,
      date: tournamentDate,
      tags: [],
      playerCount,
      matchCount: allMatches.length,
      eventTier,
      ingestedAt: new Date().toISOString(),
    },
    allMatches,
    placementResults,
    decklistEntries,
    players,
  );

  return true;
}

export async function updateTournamentTier(id: number, eventTier: EventTier): Promise<boolean> {
  return await withTransaction(async (client) => {
    const result = await client.query("UPDATE tournaments SET event_tier = $1 WHERE id = $2", [eventTier, id]);
    if (result.rowCount === 0) return false;
    await client.query("UPDATE matches SET event_tier = $1 WHERE tournament_id = $2", [eventTier, id]);
    await client.query("UPDATE placements SET event_tier = $1 WHERE tournament_id = $2", [eventTier, id]);
    await recomputeRatings(client);
    return true;
  });
}

export async function removeTournament(id: number): Promise<boolean> {
  return await withTransaction(async (client) => {
    const result = await client.query("DELETE FROM tournaments WHERE id = $1", [id]);
    if (result.rowCount! > 0) {
      await recomputeRatings(client);
      return true;
    }
    return false;
  });
}

async function recomputeRatings(client: PoolClient): Promise<void> {
  const { rows: matchRows } = await client.query(`
    SELECT player1_id, player2_id, player1_wins, player2_wins, tournament_id,
           t.name as tournament_name, round_name, matches.date, matches.event_tier
    FROM matches
    JOIN tournaments t ON t.id = matches.tournament_id
    ORDER BY matches.date, matches.id
  `);

  const matches: MatchResult[] = matchRows.map((r: Record<string, unknown>) => ({
    player1Id: r.player1_id as string,
    player2Id: r.player2_id as string,
    player1Wins: r.player1_wins as number,
    player2Wins: r.player2_wins as number,
    tournamentId: r.tournament_id as number,
    tournamentName: r.tournament_name as string,
    roundName: r.round_name as string,
    date: r.date as string,
    eventTier: r.event_tier as EventTier,
  }));

  const { rows: placementRows } = await client.query(
    "SELECT p.player_id, p.tournament_id, p.placement, p.event_tier, p.date, t.player_count FROM placements p JOIN tournaments t ON t.id = p.tournament_id"
  );

  const placements: PlacementResult[] = placementRows.map((r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    tournamentId: r.tournament_id as number,
    placement: r.placement as number,
    playerCount: r.player_count as number,
    eventTier: r.event_tier as EventTier,
    date: r.date as string,
  }));

  const ratings = computeEloTrialScaledPlacements(matches, placements);

  const tournamentsByPlayer = new Map<string, Set<number>>();
  for (const m of matches) {
    if (!tournamentsByPlayer.has(m.player1Id)) tournamentsByPlayer.set(m.player1Id, new Set());
    if (!tournamentsByPlayer.has(m.player2Id)) tournamentsByPlayer.set(m.player2Id, new Set());
    tournamentsByPlayer.get(m.player1Id)!.add(m.tournamentId);
    tournamentsByPlayer.get(m.player2Id)!.add(m.tournamentId);
  }

  for (const [id, player] of ratings) {
    player.tournamentCount = tournamentsByPlayer.get(id)?.size ?? 0;
  }

  await client.query("DELETE FROM ratings");
  for (const [id, r] of ratings) {
    await client.query(
      `INSERT INTO ratings (player_id, rating, peak_rating, wins, losses, draws, streak, tournament_count, tournament_wins, top8s, last_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, r.rating, r.peakRating, r.wins, r.losses, r.draws, r.streak, r.tournamentCount, r.tournamentWins, r.top8s, r.lastActive]
    );
  }
}

export async function getCachedAspects(deckKey: string): Promise<string[] | null> {
  const { rows } = await query("SELECT aspects FROM aspect_cache WHERE deck_key = $1", [deckKey]);
  return rows.length > 0 ? JSON.parse(rows[0].aspects) : null;
}

export async function setCachedAspects(deckKey: string, aspects: string[]): Promise<void> {
  await query(
    `INSERT INTO aspect_cache (deck_key, aspects) VALUES ($1, $2)
     ON CONFLICT (deck_key) DO UPDATE SET aspects = EXCLUDED.aspects`,
    [deckKey, JSON.stringify(aspects)]
  );
}

export async function getPlayerAspects(playerId: string): Promise<string[]> {
  const { rows } = await query(`
    SELECT d.leader, d.base, ac.aspects
    FROM decklists d
    JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
    JOIN tournaments t ON t.id = d.tournament_id
    WHERE d.player_id = $1
  `, [playerId]);

  const grouped = new Map<string, { aspects: string; count: number }>();
  for (const r of rows as Record<string, unknown>[]) {
    const normalized = normalizeBase(r.base as string);
    const key = `${r.leader}||${normalized.key}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count++;
      const newAspects = JSON.parse(r.aspects as string) as string[];
      const oldAspects = JSON.parse(existing.aspects) as string[];
      if (newAspects.length > oldAspects.length) existing.aspects = r.aspects as string;
    } else {
      grouped.set(key, { aspects: r.aspects as string, count: 1 });
    }
  }

  const top = Array.from(grouped.values())
    .filter(d => d.count >= 2)
    .sort((a, b) => b.count - a.count)[0];

  return top ? JSON.parse(top.aspects) : [];
}

export async function forceRecalculate(): Promise<void> {
  await recalculateElo();
  await recomputeNacionalStandings();
  await recomputeMetaStats();
  await stampLastRecalculated();
}

export async function recalculateElo(): Promise<void> {
  await withTransaction(async (client) => {
    await recomputeRatings(client);
  });
}

const YEAR_1_START = "2025-07-28";
const YEAR_1_END = "2026-07-28";

export async function snapshotCurrentRanks(): Promise<void> {
  const year1 = await getSeasonLeaderboard(YEAR_1_START, YEAR_1_END);
  await query("DELETE FROM rank_snapshots WHERE snapshot_key = 'year1'");
  for (const p of year1) {
    await query(
      "INSERT INTO rank_snapshots (player_id, snapshot_key, rank) VALUES ($1, $2, $3)",
      [p.id, "year1", p.rank]
    );
  }
}

export async function snapshotMetaRanks(deckKeys: string[], snapshotKey: string): Promise<void> {
  await query("DELETE FROM rank_snapshots WHERE snapshot_key = $1", [snapshotKey]);
  for (let i = 0; i < deckKeys.length; i++) {
    await query(
      "INSERT INTO rank_snapshots (player_id, snapshot_key, rank) VALUES ($1, $2, $3)",
      [deckKeys[i], snapshotKey, i + 1]
    );
  }
}

export async function getPreviousRanks(snapshotKey: string): Promise<Map<string, number>> {
  const { rows } = await query("SELECT player_id, rank FROM rank_snapshots WHERE snapshot_key = $1", [snapshotKey]);
  return new Map(rows.map((r: Record<string, unknown>) => [r.player_id as string, r.rank as number]));
}

export async function stampLastRecalculated(): Promise<void> {
  await query(
    `INSERT INTO metadata (key, value) VALUES ('last_recalculated', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [new Date().toISOString()]
  );
}

export async function getLastRecalculated(): Promise<string | null> {
  const { rows } = await query("SELECT value FROM metadata WHERE key = 'last_recalculated'");
  return rows.length > 0 ? (rows[0].value as string) : null;
}

export async function loadAliasMap(): Promise<Map<string, string>> {
  const { rows } = await query("SELECT alias, canonical_id FROM player_aliases");
  return new Map(rows.map((r: Record<string, unknown>) => [r.alias as string, r.canonical_id as string]));
}

export async function getAliases(): Promise<{ alias: string; canonicalId: string }[]> {
  const { rows } = await query("SELECT alias, canonical_id FROM player_aliases ORDER BY canonical_id, alias");
  return rows.map((r: Record<string, unknown>) => ({ alias: r.alias as string, canonicalId: r.canonical_id as string }));
}

export async function addAlias(alias: string, canonicalId: string): Promise<void> {
  alias = alias.toLowerCase().trim();
  canonicalId = canonicalId.toLowerCase().trim();
  if (!alias || !canonicalId) throw new Error("Both alias and canonical ID are required");
  if (alias === canonicalId) throw new Error("Alias cannot be the same as canonical ID");

  const { rows: chainCheck } = await query("SELECT 1 FROM player_aliases WHERE alias = $1", [canonicalId]);
  if (chainCheck.length > 0) throw new Error("Canonical ID is itself an alias — remove that alias first to avoid chains");

  await query(
    "INSERT INTO player_aliases (alias, canonical_id) VALUES ($1, $2) ON CONFLICT (alias) DO UPDATE SET canonical_id = EXCLUDED.canonical_id",
    [alias, canonicalId]
  );
}

export async function removeAlias(alias: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM player_aliases WHERE alias = $1", [alias.toLowerCase().trim()]);
  return (rowCount ?? 0) > 0;
}

export async function mergePlayerAlias(alias: string, canonicalId: string): Promise<void> {
  alias = alias.toLowerCase().trim();
  canonicalId = canonicalId.toLowerCase().trim();
  await withTransaction(async (client) => {
    await client.query("UPDATE matches SET player1_id = $2 WHERE player1_id = $1", [alias, canonicalId]);
    await client.query("UPDATE matches SET player2_id = $2 WHERE player2_id = $1", [alias, canonicalId]);
    await client.query("UPDATE placements SET player_id = $2 WHERE player_id = $1", [alias, canonicalId]);
    await client.query("UPDATE decklists SET player_id = $2 WHERE player_id = $1", [alias, canonicalId]);
    await client.query("DELETE FROM ratings WHERE player_id = $1", [alias]);
    await client.query("DELETE FROM players WHERE id = $1", [alias]);
    await recomputeRatings(client);
  });
}

export async function flagNewPlayers(
  playerIds: string[],
  tournamentId: number,
  tournamentName: string
): Promise<string[]> {
  if (playerIds.length === 0) return [];
  const placeholders = playerIds.map((_, i) => `$${i + 1}`).join(", ");
  const { rows: existing } = await query(
    `SELECT id FROM players WHERE id IN (${placeholders})`,
    playerIds
  );
  const existingSet = new Set(existing.map((r: Record<string, unknown>) => r.id as string));
  const newIds = playerIds.filter((id) => !existingSet.has(id));
  const now = new Date().toISOString();
  for (const id of newIds) {
    await query(
      `INSERT INTO pending_aliases (username, tournament_id, tournament_name, created_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
      [id, tournamentId, tournamentName, now]
    );
  }
  return newIds;
}

export async function getPendingAliases(): Promise<{ username: string; tournamentId: number; tournamentName: string; createdAt: string }[]> {
  const { rows } = await query("SELECT username, tournament_id, tournament_name, created_at FROM pending_aliases ORDER BY created_at DESC");
  return rows.map((r: Record<string, unknown>) => ({
    username: r.username as string,
    tournamentId: r.tournament_id as number,
    tournamentName: r.tournament_name as string,
    createdAt: r.created_at as string,
  }));
}

export async function dismissPendingAlias(username: string): Promise<boolean> {
  const { rowCount } = await query("DELETE FROM pending_aliases WHERE username = $1", [username.toLowerCase().trim()]);
  return (rowCount ?? 0) > 0;
}

export async function confirmPendingAlias(username: string, canonicalId: string): Promise<void> {
  username = username.toLowerCase().trim();
  canonicalId = canonicalId.toLowerCase().trim();
  await addAlias(username, canonicalId);
  await mergePlayerAlias(username, canonicalId);
  await query("DELETE FROM pending_aliases WHERE username = $1", [username]);
}

export async function getLeaderboard(): Promise<(PlayerRating & { rank: number; mainLeader: string | null; aspects: string[] })[]> {
  const { rows } = await query(`
    SELECT r.*, p.melee_id, p.name, p.username
    FROM ratings r
    JOIN players p ON p.id = r.player_id
    WHERE r.tournament_count >= 3
    ORDER BY r.rating DESC
  `);

  const { rows: deckRows } = await query(`
    SELECT d.player_id, d.leader, d.base, ac.aspects, t.date
    FROM decklists d
    JOIN tournaments t ON t.id = d.tournament_id
    LEFT JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
  `);

  const decksByPlayer = new Map<string, Map<string, { display: string; aspects: string | null; count: number; maxDate: string }>>();
  for (const d of deckRows as Record<string, unknown>[]) {
    const pid = d.player_id as string;
    if (!decksByPlayer.has(pid)) decksByPlayer.set(pid, new Map());
    const normalized = normalizeBase(d.base as string);
    const key = `${d.leader}||${normalized.key}`;
    const existing = decksByPlayer.get(pid)!.get(key);
    const date = d.date as string;
    if (existing) {
      existing.count++;
      if (date > existing.maxDate) existing.maxDate = date;
      if (d.aspects) {
        const newAspects = JSON.parse(d.aspects as string) as string[];
        const oldAspects = existing.aspects ? JSON.parse(existing.aspects) as string[] : [];
        if (newAspects.length > oldAspects.length) existing.aspects = d.aspects as string;
      }
    } else {
      decksByPlayer.get(pid)!.set(key, {
        display: `${d.leader} - ${normalized.display}`,
        aspects: d.aspects as string | null,
        count: 1,
        maxDate: date,
      });
    }
  }

  return rows.map((r: Record<string, unknown>, i: number) => {
    const decks = decksByPlayer.get(r.player_id as string);
    let mainLeader: string | null = null;
    let aspects: string[] = [];
    if (decks) {
      const top = Array.from(decks.values())
        .sort((a, b) => b.count - a.count || b.maxDate.localeCompare(a.maxDate))[0];
      if (top) {
        mainLeader = top.display;
        aspects = top.aspects ? JSON.parse(top.aspects) : [];
      }
    }
    return {
      id: r.player_id as string,
      meleeId: r.melee_id as number,
      name: r.name as string,
      username: r.username as string,
      rating: r.rating as number,
      peakRating: r.peak_rating as number,
      wins: r.wins as number,
      losses: r.losses as number,
      draws: r.draws as number,
      streak: r.streak as number,
      tournamentCount: r.tournament_count as number,
      tournamentWins: r.tournament_wins as number,
      top8s: r.top8s as number,
      lastActive: r.last_active as string,
      mainLeader,
      aspects,
      rank: i + 1,
    };
  });
}

export type SeasonPlayer = PlayerRating & { rank: number; mainLeader: string | null; aspects: string[] };

export async function getSeasonLeaderboard(startDate: string, endDate: string, minEvents = 3): Promise<SeasonPlayer[]> {
  const { rows: matchRows } = await query(`
    SELECT player1_id, player2_id, player1_wins, player2_wins, tournament_id,
           t.name as tournament_name, round_name, matches.date, matches.event_tier, t.player_count
    FROM matches
    JOIN tournaments t ON t.id = matches.tournament_id
    WHERE t.date >= $1 AND t.date < $2
    ORDER BY matches.date, matches.id
  `, [startDate, endDate]);

  const matches: MatchResult[] = matchRows.map((r: Record<string, unknown>) => ({
    player1Id: r.player1_id as string,
    player2Id: r.player2_id as string,
    player1Wins: r.player1_wins as number,
    player2Wins: r.player2_wins as number,
    tournamentId: r.tournament_id as number,
    tournamentName: r.tournament_name as string,
    roundName: r.round_name as string,
    date: r.date as string,
    eventTier: r.event_tier as EventTier,
    playerCount: r.player_count as number,
  }));

  const { rows: placementRows } = await query(
    `SELECT p.player_id, p.tournament_id, p.placement, p.event_tier, p.date, t.player_count
     FROM placements p JOIN tournaments t ON t.id = p.tournament_id
     WHERE t.date >= $1 AND t.date < $2`,
    [startDate, endDate]
  );
  const placements: PlacementResult[] = placementRows.map((r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    tournamentId: r.tournament_id as number,
    placement: r.placement as number,
    playerCount: r.player_count as number,
    eventTier: r.event_tier as EventTier,
    date: r.date as string,
  }));

  const ratings = computeEloTrialScaledPlacements(matches, placements);

  const { rows: playerRows } = await query("SELECT id, melee_id, name, username FROM players");
  for (const p of playerRows as Record<string, unknown>[]) {
    const r = ratings.get(p.id as string);
    if (r) {
      r.meleeId = p.melee_id as number;
      r.name = p.name as string;
      r.username = p.username as string;
    }
  }

  const tournamentsByPlayer = new Map<string, Set<number>>();
  for (const m of matches) {
    for (const pid of [m.player1Id, m.player2Id]) {
      if (!tournamentsByPlayer.has(pid)) tournamentsByPlayer.set(pid, new Set());
      tournamentsByPlayer.get(pid)!.add(m.tournamentId);
    }
  }
  for (const [id, player] of ratings) {
    player.tournamentCount = tournamentsByPlayer.get(id)?.size ?? 0;
  }

  const eligible = Array.from(ratings.values())
    .filter((r) => {
      const tc = tournamentsByPlayer.get(r.id)?.size ?? 0;
      return tc >= minEvents && r.name;
    })
    .sort((a, b) => b.rating - a.rating);

  const ROTATION_DATE = "2026-03-13";
  const deckStartDate = startDate < ROTATION_DATE && endDate > ROTATION_DATE ? ROTATION_DATE : startDate;

  const { rows: deckRows } = await query(`
    SELECT d.player_id, d.leader, d.base, ac.aspects, t.date
    FROM decklists d
    JOIN tournaments t ON t.id = d.tournament_id
    LEFT JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
    WHERE t.date >= $1 AND t.date < $2
  `, [deckStartDate, endDate]);

  const decksByPlayer = new Map<string, Map<string, { display: string; aspects: string | null; count: number; maxDate: string }>>();
  for (const d of deckRows as Record<string, unknown>[]) {
    const pid = d.player_id as string;
    if (!decksByPlayer.has(pid)) decksByPlayer.set(pid, new Map());
    const normalized = normalizeBase(d.base as string);
    const key = `${d.leader}||${normalized.key}`;
    const existing = decksByPlayer.get(pid)!.get(key);
    const date = d.date as string;
    if (existing) {
      existing.count++;
      if (date > existing.maxDate) existing.maxDate = date;
      if (d.aspects) {
        const newAspects = JSON.parse(d.aspects as string) as string[];
        const oldAspects = existing.aspects ? JSON.parse(existing.aspects) as string[] : [];
        if (newAspects.length > oldAspects.length) existing.aspects = d.aspects as string;
      }
    } else {
      decksByPlayer.get(pid)!.set(key, {
        display: `${d.leader} - ${normalized.display}`,
        aspects: d.aspects as string | null,
        count: 1,
        maxDate: date,
      });
    }
  }

  const { rows: kyberRows } = await query(`
    SELECT p.player_id, t.event_tier
    FROM placements p
    JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.placement = 1 AND t.date >= $1 AND t.date < $2
    ORDER BY t.date
  `, [startDate, endDate]);

  const kybersByPlayer = new Map<string, string[]>();
  for (const r of kyberRows as Record<string, unknown>[]) {
    const pid = r.player_id as string;
    if (!kybersByPlayer.has(pid)) kybersByPlayer.set(pid, []);
    kybersByPlayer.get(pid)!.push(r.event_tier as string);
  }

  return eligible.map((r, i) => {
    const decks = decksByPlayer.get(r.id);
    let mainLeader: string | null = null;
    let aspects: string[] = [];
    if (decks) {
      const top = Array.from(decks.values())
        .sort((a, b) => b.count - a.count || b.maxDate.localeCompare(a.maxDate))[0];
      if (top) {
        mainLeader = top.display;
        aspects = top.aspects ? JSON.parse(top.aspects) : [];
      }
    }
    return {
      ...r,
      rank: i + 1,
      mainLeader,
      aspects,
      kyberTiers: kybersByPlayer.get(r.id) ?? [],
    };
  });
}

export interface TournamentSummary extends StoredTournament {
  winnerUsername: string | null;
  hasCachedScrape: boolean;
  isNacional: boolean;
  countsForNacional: boolean;
}

export async function getIngestedTournaments(): Promise<TournamentSummary[]> {
  const { rows } = await query(`
    SELECT t.*,
      (SELECT p.username FROM placements pl JOIN players p ON p.id = pl.player_id
       WHERE pl.tournament_id = t.id AND pl.placement = 1 LIMIT 1) as winner_username,
      (CASE WHEN EXISTS (SELECT 1 FROM scraped_data sd WHERE sd.tournament_id = t.id) THEN true ELSE false END) as has_cached_scrape
    FROM tournaments t ORDER BY t.date DESC
  `);
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    name: r.name as string,
    organizationName: r.organization_name as string,
    date: r.date as string,
    tags: JSON.parse(r.tags as string),
    playerCount: r.player_count as number,
    matchCount: r.match_count as number,
    eventTier: r.event_tier as EventTier,
    ingestedAt: r.ingested_at as string,
    winnerUsername: r.winner_username as string | null,
    hasCachedScrape: r.has_cached_scrape as boolean,
    isNacional: r.is_nacional as boolean,
    countsForNacional: r.counts_for_nacional as boolean,
  }));
}

export interface PlayerTournament {
  id: number;
  name: string;
  date: string;
  eventTier: EventTier;
  wins: number;
  losses: number;
  draws: number;
  placement: number | null;
}

export async function getPlayerTournaments(playerId: string): Promise<PlayerTournament[]> {
  const { rows } = await query(`
    SELECT
      t.id, t.name, t.date, t.event_tier,
      SUM(CASE WHEN
        (m.player1_id = $1 AND m.player1_wins > m.player2_wins) OR
        (m.player2_id = $1 AND m.player2_wins > m.player1_wins)
        THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN
        (m.player1_id = $1 AND m.player2_wins > m.player1_wins) OR
        (m.player2_id = $1 AND m.player1_wins > m.player2_wins)
        THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN m.player1_wins = m.player2_wins THEN 1 ELSE 0 END) as draws,
      p.placement
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    LEFT JOIN placements p ON p.tournament_id = t.id AND p.player_id = $1
    WHERE m.player1_id = $1 OR m.player2_id = $1
    GROUP BY t.id, t.name, t.date, t.event_tier, p.placement
    ORDER BY t.date DESC
  `, [playerId]);

  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    name: r.name as string,
    date: r.date as string,
    eventTier: r.event_tier as EventTier,
    wins: Number(r.wins),
    losses: Number(r.losses),
    draws: Number(r.draws),
    placement: r.placement as number | null,
  }));
}

export async function getPlayerTitleTiers(playerId: string): Promise<EventTier[]> {
  const { rows } = await query(`
    SELECT t.event_tier
    FROM placements p
    JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.player_id = $1 AND p.placement = 1
    ORDER BY t.date
  `, [playerId]);
  return rows.map((r: Record<string, unknown>) => r.event_tier as EventTier);
}

export async function getPlayerBestFinish(playerId: string): Promise<number | null> {
  const { rows } = await query(
    "SELECT MIN(placement) as best FROM placements WHERE player_id = $1", [playerId]
  );
  return rows[0]?.best ?? null;
}

export async function getPlayerRatingChange(playerId: string): Promise<number> {
  const { rows } = await query("SELECT rating FROM ratings WHERE player_id = $1", [playerId]);
  return ((rows[0]?.rating as number) ?? 1500) - 1500;
}

export interface HeadToHead {
  opponentId: string;
  opponentName: string;
  opponentUsername: string;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
}

export interface PlayerRivalries {
  nemesis: HeadToHead | null;
  rival: HeadToHead | null;
  prey: HeadToHead | null;
  allMatchups: HeadToHead[];
}

export async function getPlayerRivalries(playerId: string): Promise<PlayerRivalries> {
  const { rows } = await query(`
    SELECT
      opponent_id,
      p.name as opponent_name,
      p.username as opponent_username,
      SUM(won) as wins,
      SUM(lost) as losses,
      SUM(drew) as draws,
      COUNT(*) as total_matches
    FROM (
      SELECT
        player2_id as opponent_id,
        CASE WHEN player1_wins > player2_wins THEN 1 ELSE 0 END as won,
        CASE WHEN player2_wins > player1_wins THEN 1 ELSE 0 END as lost,
        CASE WHEN player1_wins = player2_wins THEN 1 ELSE 0 END as drew
      FROM matches WHERE player1_id = $1
      UNION ALL
      SELECT
        player1_id as opponent_id,
        CASE WHEN player2_wins > player1_wins THEN 1 ELSE 0 END as won,
        CASE WHEN player1_wins > player2_wins THEN 1 ELSE 0 END as lost,
        CASE WHEN player1_wins = player2_wins THEN 1 ELSE 0 END as drew
      FROM matches WHERE player2_id = $1
    ) h2h
    JOIN players p ON p.id = h2h.opponent_id
    GROUP BY opponent_id, p.name, p.username
    ORDER BY total_matches DESC
  `, [playerId]);

  const matchups: HeadToHead[] = rows.map((r: Record<string, unknown>) => ({
    opponentId: r.opponent_id as string,
    opponentName: r.opponent_name as string,
    opponentUsername: r.opponent_username as string,
    wins: Number(r.wins),
    losses: Number(r.losses),
    draws: Number(r.draws),
    totalMatches: Number(r.total_matches),
  }));

  const multiMatch = matchups.filter((m) => m.totalMatches >= 2);

  const nemesis = multiMatch
    .filter((m) => m.losses > m.wins)
    .sort((a, b) => b.losses - a.losses || b.totalMatches - a.totalMatches)[0] ?? null;

  const prey = multiMatch
    .filter((m) => m.wins > m.losses)
    .sort((a, b) => b.wins - a.wins || b.totalMatches - a.totalMatches)[0] ?? null;

  const rival = multiMatch
    .sort((a, b) => {
      const aDiff = Math.abs(a.wins - a.losses);
      const bDiff = Math.abs(b.wins - b.losses);
      if (aDiff !== bDiff) return aDiff - bDiff;
      return b.totalMatches - a.totalMatches;
    })[0] ?? null;

  return { nemesis, rival, prey, allMatchups: matchups };
}

export async function getPlayerMostUsedLeader(playerId: string): Promise<string | null> {
  const { rows } = await query(`
    SELECT leader, COUNT(*) as cnt FROM decklists
    WHERE player_id = $1 GROUP BY leader ORDER BY cnt DESC LIMIT 1
  `, [playerId]);
  return rows[0]?.leader ?? null;
}

export interface PlayerLeaderEntry {
  leader: string;
  base: string;
  count: number;
  events: { tournamentName: string; tournamentId: number; decklistGuid: string | null }[];
}

export async function getPlayerLeaders(playerId: string): Promise<PlayerLeaderEntry[]> {
  const { rows } = await query(`
    SELECT d.leader, d.base, d.full_name, d.decklist_guid, d.tournament_id, t.name as tournament_name
    FROM decklists d
    JOIN tournaments t ON t.id = d.tournament_id
    WHERE d.player_id = $1
    ORDER BY t.date
  `, [playerId]);

  const grouped = new Map<string, PlayerLeaderEntry>();
  for (const r of rows as Record<string, unknown>[]) {
    const normalized = normalizeBase(r.base as string);
    const key = `${r.leader}||${normalized.key}`;
    const existing = grouped.get(key);
    const event = { tournamentName: r.tournament_name as string, tournamentId: r.tournament_id as number, decklistGuid: r.decklist_guid as string | null };
    if (existing) {
      existing.count++;
      existing.events.push(event);
    } else {
      grouped.set(key, { leader: r.leader as string, base: normalized.display, count: 1, events: [event] });
    }
  }
  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
}

export interface TournamentDetail {
  id: number;
  name: string;
  organizationName: string;
  date: string;
  eventTier: EventTier;
  playerCount: number;
  matchCount: number;
  topCutSize: number;
  standings: {
    rank: number;
    playerId: string;
    username: string;
    name: string;
    leader: string | null;
    base: string | null;
    matchWins: number;
    matchLosses: number;
    matchDraws: number;
  }[];
  rounds: {
    name: string;
    matches: {
      player1Id: string;
      player1Username: string;
      player1Wins: number;
      player2Id: string;
      player2Username: string;
      player2Wins: number;
    }[];
  }[];
}

export async function getTournamentDetail(id: number): Promise<TournamentDetail | null> {
  const { rows: tournamentRows } = await query("SELECT * FROM tournaments WHERE id = $1", [id]);
  const tournament = tournamentRows[0] as Record<string, unknown> | undefined;
  if (!tournament) return null;

  const { rows: topCutRows } = await query(
    "SELECT MAX(placement) as top_cut FROM placements WHERE tournament_id = $1", [id]
  );
  const topCutSize = (topCutRows[0]?.top_cut as number) ?? 0;

  const { rows: standingRows } = await query(`
    SELECT
      pl.placement as rank,
      pl.player_id,
      p.username,
      p.name,
      d.leader,
      d.base
    FROM placements pl
    JOIN players p ON p.id = pl.player_id
    LEFT JOIN decklists d ON d.player_id = pl.player_id AND d.tournament_id = pl.tournament_id
    WHERE pl.tournament_id = $1
    ORDER BY pl.placement
  `, [id]);

  const { rows: allDecklists } = await query(
    "SELECT player_id, leader, base FROM decklists WHERE tournament_id = $1", [id]
  );
  const decklistMap = new Map((allDecklists as Record<string, unknown>[]).map((d) => [d.player_id as string, d]));

  const { rows: matchRows } = await query(`
    SELECT m.round_name, m.player1_id, m.player2_id, m.player1_wins, m.player2_wins,
           p1.username as p1_username, p2.username as p2_username
    FROM matches m
    JOIN players p1 ON p1.id = m.player1_id
    JOIN players p2 ON p2.id = m.player2_id
    WHERE m.tournament_id = $1
    ORDER BY m.id
  `, [id]);

  const roundsMap = new Map<string, TournamentDetail["rounds"][0]>();
  for (const m of matchRows as Record<string, unknown>[]) {
    const roundName = m.round_name as string;
    if (!roundsMap.has(roundName)) {
      roundsMap.set(roundName, { name: roundName, matches: [] });
    }
    roundsMap.get(roundName)!.matches.push({
      player1Id: m.player1_id as string,
      player1Username: m.p1_username as string,
      player1Wins: m.player1_wins as number,
      player2Id: m.player2_id as string,
      player2Username: m.p2_username as string,
      player2Wins: m.player2_wins as number,
    });
  }

  const playerStats = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const m of matchRows as Record<string, unknown>[]) {
    for (const pid of [m.player1_id as string, m.player2_id as string]) {
      if (!playerStats.has(pid)) playerStats.set(pid, { wins: 0, losses: 0, draws: 0 });
    }
    const s1 = playerStats.get(m.player1_id as string)!;
    const s2 = playerStats.get(m.player2_id as string)!;
    if ((m.player1_wins as number) > (m.player2_wins as number)) { s1.wins++; s2.losses++; }
    else if ((m.player2_wins as number) > (m.player1_wins as number)) { s2.wins++; s1.losses++; }
    else { s1.draws++; s2.draws++; }
  }

  const allPlayerIds = Array.from(playerStats.keys());
  const playerInfos = new Map<string, { username: string; name: string }>();
  for (const pid of allPlayerIds) {
    const { rows: infoRows } = await query("SELECT username, name FROM players WHERE id = $1", [pid]);
    if (infoRows[0]) playerInfos.set(pid, infoRows[0] as { username: string; name: string });
  }

  const top8Ids = new Set((standingRows as Record<string, unknown>[]).map((s) => s.player_id as string));
  const restPlayers = allPlayerIds
    .filter((pid) => !top8Ids.has(pid))
    .sort((a, b) => {
      const sa = playerStats.get(a)!;
      const sb = playerStats.get(b)!;
      return (sb.wins - sb.losses) - (sa.wins - sa.losses);
    });

  const standings: TournamentDetail["standings"] = [];
  for (const s of standingRows as Record<string, unknown>[]) {
    const stats = playerStats.get(s.player_id as string) ?? { wins: 0, losses: 0, draws: 0 };
    standings.push({
      rank: s.rank as number,
      playerId: s.player_id as string,
      username: s.username as string,
      name: s.name as string,
      leader: s.leader as string | null,
      base: s.base as string | null,
      matchWins: stats.wins,
      matchLosses: stats.losses,
      matchDraws: stats.draws,
    });
  }
  let rank = standings.length + 1;
  for (const pid of restPlayers) {
    const info = playerInfos.get(pid);
    const stats = playerStats.get(pid)!;
    const deck = decklistMap.get(pid) as Record<string, unknown> | undefined;
    if (info) {
      standings.push({
        rank: rank++,
        playerId: pid,
        username: info.username,
        name: info.name,
        leader: (deck?.leader as string) ?? null,
        base: (deck?.base as string) ?? null,
        matchWins: stats.wins,
        matchLosses: stats.losses,
        matchDraws: stats.draws,
      });
    }
  }

  return {
    id: tournament.id as number,
    name: tournament.name as string,
    organizationName: tournament.organization_name as string,
    date: tournament.date as string,
    eventTier: tournament.event_tier as EventTier,
    playerCount: tournament.player_count as number,
    matchCount: tournament.match_count as number,
    topCutSize,
    standings,
    rounds: Array.from(roundsMap.values()).sort((a, b) => {
      const order = (name: string): number => {
        const lower = name.toLowerCase();
        if (lower.includes("final") && !lower.includes("semi") && !lower.includes("quarter")) return 900;
        if (lower.includes("semi")) return 800;
        if (lower.includes("quarter")) return 700;
        const num = parseInt(name.replace(/\D/g, ""), 10);
        return isNaN(num) ? 500 : num;
      };
      return order(a.name) - order(b.name);
    }),
  };
}

export interface EloComparisonEntry {
  id: string;
  username: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  tournamentCount: number;
  miRating: number;
  miRank: number;
  eloRating: number;
  eloRank: number;
  eloTierRating: number;
  eloTierRank: number;
  eloTierTrialRating: number;
  eloTierTrialRank: number;
  eloTierTrialHalfRating: number;
  eloTierTrialHalfRank: number;
  eloSizeRating: number;
  eloSizeRank: number;
}

export async function getEloLeaderboard(): Promise<EloComparisonEntry[]> {
  const { rows: matchRows } = await query(`
    SELECT player1_id, player2_id, player1_wins, player2_wins, tournament_id,
           t.name as tournament_name, round_name, matches.date, matches.event_tier, t.player_count
    FROM matches
    JOIN tournaments t ON t.id = matches.tournament_id
    ORDER BY matches.date, matches.id
  `);

  const matches: MatchResult[] = matchRows.map((r: Record<string, unknown>) => ({
    player1Id: r.player1_id as string,
    player2Id: r.player2_id as string,
    player1Wins: r.player1_wins as number,
    player2Wins: r.player2_wins as number,
    tournamentId: r.tournament_id as number,
    tournamentName: r.tournament_name as string,
    roundName: r.round_name as string,
    date: r.date as string,
    eventTier: r.event_tier as EventTier,
    playerCount: r.player_count as number,
  }));

  const { rows: placementRows } = await query(
    "SELECT p.player_id, p.tournament_id, p.placement, p.event_tier, p.date, t.player_count FROM placements p JOIN tournaments t ON t.id = p.tournament_id"
  );
  const placements: PlacementResult[] = placementRows.map((r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    tournamentId: r.tournament_id as number,
    placement: r.placement as number,
    playerCount: r.player_count as number,
    eventTier: r.event_tier as EventTier,
    date: r.date as string,
  }));

  const eloRatings = computePureElo(matches);
  const eloTierRatings = computeEloWithPlacements(matches, placements);
  const eloTierTrialRatings = computeEloTrialWithPlacements(matches, placements);
  const eloTierTrialHalfRatings = computeEloTrialScaledPlacements(matches, placements);
  const eloSizeRatings = computeEloTrialSizePlacements(matches, placements);

  const { rows: playerRows } = await query("SELECT id, melee_id, name, username FROM players");
  const playerInfo = new Map((playerRows as Record<string, unknown>[]).map((p) => [p.id as string, p]));

  const tournamentsByPlayer = new Map<string, Set<number>>();
  for (const m of matches) {
    for (const pid of [m.player1Id, m.player2Id]) {
      if (!tournamentsByPlayer.has(pid)) tournamentsByPlayer.set(pid, new Set());
      tournamentsByPlayer.get(pid)!.add(m.tournamentId);
    }
  }

  const miLeaderboard = await getLeaderboard();
  const miMap = new Map(miLeaderboard.map((p) => [p.id, { rating: p.rating, rank: p.rank }]));

  const allPlayerIds = new Set([...eloRatings.keys()]);
  const entries: EloComparisonEntry[] = [];

  for (const id of allPlayerIds) {
    const elo = eloRatings.get(id)!;
    const tc = tournamentsByPlayer.get(id)?.size ?? 0;
    if (tc < 3) continue;
    const info = playerInfo.get(id);
    const mi = miMap.get(id);
    const eloTier = eloTierRatings.get(id);
    const eloTierTrial = eloTierTrialRatings.get(id);
    const eloTierTrialHalf = eloTierTrialHalfRatings.get(id);
    const eloSize = eloSizeRatings.get(id);

    entries.push({
      id,
      username: (info?.username as string) ?? id,
      name: (info?.name as string) ?? "",
      wins: elo.wins,
      losses: elo.losses,
      draws: elo.draws,
      tournamentCount: tournamentsByPlayer.get(id)?.size ?? 0,
      miRating: mi?.rating ?? 0,
      miRank: mi?.rank ?? 0,
      eloRating: elo.rating,
      eloRank: 0,
      eloTierRating: eloTier?.rating ?? elo.rating,
      eloTierRank: 0,
      eloTierTrialRating: eloTierTrial?.rating ?? elo.rating,
      eloTierTrialRank: 0,
      eloTierTrialHalfRating: eloTierTrialHalf?.rating ?? elo.rating,
      eloTierTrialHalfRank: 0,
      eloSizeRating: eloSize?.rating ?? elo.rating,
      eloSizeRank: 0,
    });
  }

  const byElo = [...entries].sort((a, b) => b.eloRating - a.eloRating);
  byElo.forEach((e, i) => { e.eloRank = i + 1; });

  const byEloTier = [...entries].sort((a, b) => b.eloTierRating - a.eloTierRating);
  byEloTier.forEach((e, i) => { e.eloTierRank = i + 1; });

  const byEloTierTrial = [...entries].sort((a, b) => b.eloTierTrialRating - a.eloTierTrialRating);
  byEloTierTrial.forEach((e, i) => { e.eloTierTrialRank = i + 1; });

  const byEloTierTrialHalf = [...entries].sort((a, b) => b.eloTierTrialHalfRating - a.eloTierTrialHalfRating);
  byEloTierTrialHalf.forEach((e, i) => { e.eloTierTrialHalfRank = i + 1; });

  const byEloSize = [...entries].sort((a, b) => b.eloSizeRating - a.eloSizeRating);
  byEloSize.forEach((e, i) => { e.eloSizeRank = i + 1; });

  return byEloTierTrialHalf;
}

export interface TeamMember {
  id: string;
  username: string;
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  tournamentCount: number;
  tournamentWins: number;
  titleTiers: EventTier[];
}

export interface TeamMatchDetail {
  player: string;
  opponent: string;
  playerWins: number;
  opponentWins: number;
  tournament: string;
  round: string;
}

export interface TeamH2H {
  opponentTag: string;
  wins: number;
  losses: number;
  draws: number;
  matches: TeamMatchDetail[];
}

export interface Team {
  tag: string;
  members: TeamMember[];
  avgRating: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalTournamentWins: number;
  h2h: TeamH2H[];
}

export async function getTeams(startDate?: string, endDate?: string, minEvents = 3): Promise<Team[]> {
  const leaderboard = startDate && endDate
    ? await getSeasonLeaderboard(startDate, endDate, minEvents)
    : await getLeaderboard();

  const dateFilter = startDate && endDate ? " AND t.date >= $1 AND t.date < $2" : "";
  const dateParams = startDate && endDate ? [startDate, endDate] : [];
  const { rows: titleRows } = await query(`
    SELECT p.player_id, t.event_tier FROM placements p
    JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.placement = 1${dateFilter} ORDER BY t.date
  `, dateParams);
  const titlesByPlayer = new Map<string, EventTier[]>();
  for (const r of titleRows as Record<string, unknown>[]) {
    const pid = r.player_id as string;
    if (!titlesByPlayer.has(pid)) titlesByPlayer.set(pid, []);
    titlesByPlayer.get(pid)!.push(r.event_tier as EventTier);
  }

  const teamMap = new Map<string, TeamMember[]>();
  const playerTeam = new Map<string, string>();

  for (const p of leaderboard) {
    if (!p.username.includes("_")) continue;
    const tag = p.username.split("_")[0];
    if (!teamMap.has(tag)) teamMap.set(tag, []);
    teamMap.get(tag)!.push({
      id: p.id,
      username: p.username,
      rating: p.rating,
      rank: p.rank,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      tournamentCount: p.tournamentCount,
      tournamentWins: p.tournamentWins,
      titleTiers: titlesByPlayer.get(p.id) ?? [],
    });
    playerTeam.set(p.id, tag);
  }

  // Only keep teams with 2+ members
  for (const [tag, members] of teamMap) {
    if (members.length < 2) {
      for (const m of members) playerTeam.delete(m.id);
      teamMap.delete(tag);
    }
  }

  // Compute H2H from matches
  const matchDateFilter = startDate && endDate
    ? " JOIN tournaments t ON t.id = matches.tournament_id WHERE t.date >= $1 AND t.date < $2"
    : " JOIN tournaments t ON t.id = matches.tournament_id";
  const { rows: matchRows } = await query(`
    SELECT player1_id, player2_id, player1_wins, player2_wins, t.name as tournament, matches.round_name
    FROM matches${matchDateFilter}
    ORDER BY matches.date, matches.id
  `, dateParams);

  const h2hMap = new Map<string, Map<string, { wins: number; losses: number; draws: number; matches: TeamMatchDetail[] }>>();

  for (const m of matchRows as Record<string, unknown>[]) {
    const p1 = m.player1_id as string;
    const p2 = m.player2_id as string;
    const t1 = playerTeam.get(p1);
    const t2 = playerTeam.get(p2);
    if (!t1 || !t2 || t1 === t2) continue;

    if (!h2hMap.has(t1)) h2hMap.set(t1, new Map());
    if (!h2hMap.has(t2)) h2hMap.set(t2, new Map());
    if (!h2hMap.get(t1)!.has(t2)) h2hMap.get(t1)!.set(t2, { wins: 0, losses: 0, draws: 0, matches: [] });
    if (!h2hMap.get(t2)!.has(t1)) h2hMap.get(t2)!.set(t1, { wins: 0, losses: 0, draws: 0, matches: [] });

    const r1 = h2hMap.get(t1)!.get(t2)!;
    const r2 = h2hMap.get(t2)!.get(t1)!;

    const p1w = m.player1_wins as number;
    const p2w = m.player2_wins as number;
    const tournament = m.tournament as string;
    const round = m.round_name as string;

    if (p1w > p2w) {
      r1.wins++; r2.losses++;
    } else if (p2w > p1w) {
      r1.losses++; r2.wins++;
    } else {
      r1.draws++; r2.draws++;
    }

    r1.matches.push({ player: p1, opponent: p2, playerWins: p1w, opponentWins: p2w, tournament, round });
    r2.matches.push({ player: p2, opponent: p1, playerWins: p2w, opponentWins: p1w, tournament, round });
  }

  const teams: Team[] = [];
  for (const [tag, members] of teamMap) {
    const totalWins = members.reduce((s, m) => s + m.wins, 0);
    const totalLosses = members.reduce((s, m) => s + m.losses, 0);
    const totalDraws = members.reduce((s, m) => s + m.draws, 0);
    const totalTournamentWins = leaderboard
      .filter((p) => playerTeam.get(p.id) === tag)
      .reduce((s, p) => s + p.tournamentWins, 0);
    const avgRating = Math.round(members.reduce((s, m) => s + m.rating, 0) / members.length);

    const h2h: TeamH2H[] = [];
    const teamH2H = h2hMap.get(tag);
    if (teamH2H) {
      for (const [opp, record] of teamH2H) {
        h2h.push({ opponentTag: opp, ...record });
      }
      h2h.sort((a, b) => (b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws));
    }

    teams.push({
      tag,
      members: members.sort((a, b) => a.rank - b.rank),
      avgRating,
      totalWins,
      totalLosses,
      totalDraws,
      totalTournamentWins,
      h2h,
    });
  }

  teams.sort((a, b) => b.avgRating - a.avgRating);
  return teams;
}

// --- Nacional Qualification ---

export interface NacionalEntry {
  rank: number;
  playerId: string;
  playerName: string;
  playerUsername: string;
  totalPoints: number;
  matchPoints: number;
  participationPoints: number;
  championPoints: number;
  tournamentCount: number;
  qualified: boolean;
  qualifiedFrom: string | null;
  qualifiedFromId: number | null;
}

export async function getNacionalExcludedPlayers(): Promise<string[]> {
  const { rows } = await query("SELECT value FROM metadata WHERE key = 'nacional_excluded_players'");
  if (rows.length === 0) return [];
  try { return JSON.parse(rows[0].value as string); } catch { return []; }
}

export async function setNacionalExcludedPlayers(playerIds: string[]): Promise<void> {
  await query(
    `INSERT INTO metadata (key, value) VALUES ('nacional_excluded_players', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(playerIds.map((id) => id.toLowerCase().trim()))]
  );
}

export async function recomputeNacionalStandings(): Promise<void> {
  const excluded = new Set(await getNacionalExcludedPlayers());

  const { rows: nacRows } = await query(
    "SELECT date FROM tournaments WHERE is_nacional = TRUE ORDER BY date DESC LIMIT 1"
  );
  const sinceDate = nacRows.length > 0 ? (nacRows[0].date as string) : null;

  const dateFilter = sinceDate
    ? "WHERE t.date > $1 AND t.is_nacional = FALSE AND t.counts_for_nacional = TRUE"
    : "WHERE t.is_nacional = FALSE AND t.counts_for_nacional = TRUE";
  const dateParams = sinceDate ? [sinceDate] : [];

  const { rows: statRows } = await query(`
    SELECT sub.player_id, COUNT(*) as match_count, COUNT(DISTINCT sub.tournament_id) as tournament_count
    FROM (
      SELECT player1_id as player_id, m.tournament_id
      FROM matches m JOIN tournaments t ON t.id = m.tournament_id ${dateFilter}
      UNION ALL
      SELECT player2_id as player_id, m.tournament_id
      FROM matches m JOIN tournaments t ON t.id = m.tournament_id ${dateFilter}
    ) sub
    GROUP BY sub.player_id
  `, dateParams);

  const { rows: placementRows } = await query(`
    SELECT p.tournament_id, p.player_id, p.placement, t.date, t.name as tournament_name
    FROM placements p
    JOIN tournaments t ON t.id = p.tournament_id
    ${dateFilter}
    ORDER BY t.date ASC, p.placement ASC
  `, dateParams);

  const { rows: playerRows } = await query("SELECT id, name, username FROM players");
  const playerMap = new Map(playerRows.map((r: Record<string, unknown>) => [r.id as string, { name: r.name as string, username: r.username as string }]));

  const stats = new Map<string, { matchPoints: number; participationPoints: number }>();
  for (const r of statRows) {
    const pid = r.player_id as string;
    if (excluded.has(pid)) continue;
    stats.set(pid, {
      matchPoints: Number(r.match_count),
      participationPoints: Number(r.tournament_count) * 2,
    });
  }

  const championBonus = new Map<string, number>();
  const qualifiedFrom = new Map<string, string>();
  const qualifiedFromId = new Map<string, number>();
  const tournamentPlacements = new Map<number, { playerId: string; placement: number; tournamentName: string }[]>();

  for (const r of placementRows) {
    const tid = r.tournament_id as number;
    if (!tournamentPlacements.has(tid)) tournamentPlacements.set(tid, []);
    tournamentPlacements.get(tid)!.push({
      playerId: r.player_id as string,
      placement: r.placement as number,
      tournamentName: r.tournament_name as string,
    });
  }

  const tournamentOrder = [...new Set(placementRows.map((r: Record<string, unknown>) => r.tournament_id as number))];

  for (const tid of tournamentOrder) {
    const placements = tournamentPlacements.get(tid);
    if (!placements) continue;

    for (const entry of placements) {
      if (excluded.has(entry.playerId)) continue;
      const s = stats.get(entry.playerId);
      const currentTotal = (s?.matchPoints ?? 0) + (s?.participationPoints ?? 0) + (championBonus.get(entry.playerId) ?? 0);
      if (currentTotal < 1000) {
        championBonus.set(entry.playerId, (championBonus.get(entry.playerId) ?? 0) + 1000);
        qualifiedFrom.set(entry.playerId, entry.tournamentName);
        qualifiedFromId.set(entry.playerId, tid);
        break;
      }
    }
  }

  const entries: NacionalEntry[] = [];
  for (const [playerId, s] of stats) {
    const p = playerMap.get(playerId);
    if (!p) continue;
    const cp = championBonus.get(playerId) ?? 0;
    entries.push({
      rank: 0,
      playerId,
      playerName: p.name,
      playerUsername: p.username,
      totalPoints: s.matchPoints + s.participationPoints + cp,
      matchPoints: s.matchPoints,
      participationPoints: s.participationPoints,
      championPoints: cp,
      tournamentCount: s.participationPoints / 2,
      qualified: cp > 0,
      qualifiedFrom: qualifiedFrom.get(playerId) ?? null,
      qualifiedFromId: qualifiedFromId.get(playerId) ?? null,
    });
  }

  entries.sort((a, b) => b.totalPoints - a.totalPoints || b.championPoints - a.championPoints || b.matchPoints - a.matchPoints);
  entries.forEach((e, i) => { e.rank = i + 1; });

  await query("DELETE FROM nacional_standings");
  for (const e of entries) {
    await query(
      `INSERT INTO nacional_standings (player_id, player_name, player_username, total_points, match_points, participation_points, champion_points, tournament_count, qualified, qualified_from, qualified_from_id, rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [e.playerId, e.playerName, e.playerUsername, e.totalPoints, e.matchPoints, e.participationPoints, e.championPoints, e.tournamentCount, e.qualified, e.qualifiedFrom, e.qualifiedFromId, e.rank]
    );
  }
}

export async function getNacionalStandings(): Promise<{ entries: NacionalEntry[]; sinceDate: string | null; sinceName: string | null; tournamentCount: number }> {
  const { rows: nacRows } = await query(
    "SELECT date, name FROM tournaments WHERE is_nacional = TRUE ORDER BY date DESC LIMIT 1"
  );
  const sinceDate = nacRows.length > 0 ? (nacRows[0].date as string) : null;
  const sinceName = nacRows.length > 0 ? (nacRows[0].name as string) : null;

  const { rows } = await query("SELECT * FROM nacional_standings ORDER BY rank ASC");
  const entries: NacionalEntry[] = rows.map((r: Record<string, unknown>) => ({
    rank: r.rank as number,
    playerId: r.player_id as string,
    playerName: r.player_name as string,
    playerUsername: r.player_username as string,
    totalPoints: r.total_points as number,
    matchPoints: r.match_points as number,
    participationPoints: r.participation_points as number,
    championPoints: r.champion_points as number,
    tournamentCount: r.tournament_count as number,
    qualified: r.qualified as boolean,
    qualifiedFrom: r.qualified_from as string | null,
    qualifiedFromId: r.qualified_from_id as number | null,
  }));

  const dateFilter = sinceDate ? "WHERE t.date > $1 AND t.is_nacional = FALSE" : "WHERE t.is_nacional = FALSE";
  const { rows: tcRows } = await query(
    `SELECT COUNT(*) as cnt FROM tournaments t ${dateFilter}`,
    sinceDate ? [sinceDate] : []
  );
  const tournamentCount = Number(tcRows[0]?.cnt ?? 0);

  return { entries, sinceDate, sinceName, tournamentCount };
}

export async function setTournamentCountsForNacional(id: number, counts: boolean): Promise<boolean> {
  const { rowCount } = await query("UPDATE tournaments SET counts_for_nacional = $2 WHERE id = $1", [id, counts]);
  return (rowCount ?? 0) > 0;
}

export async function setTournamentNacional(id: number, isNacional: boolean): Promise<boolean> {
  const { rowCount } = await query("UPDATE tournaments SET is_nacional = $2 WHERE id = $1", [id, isNacional]);
  return (rowCount ?? 0) > 0;
}
