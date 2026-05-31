import { getDb } from "./db";
import { MatchResult, PlacementResult, PlayerRating, EventTier, computeRatings } from "./elo";

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

export function isTournamentIngested(id: number): boolean {
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM tournaments WHERE id = ?").get(id);
  return !!row;
}

interface DecklistEntry {
  playerId: string;
  leader: string;
  base: string;
  fullName: string;
  decklistGuid: string | null;
}

export function addTournament(
  tournament: StoredTournament,
  matches: MatchResult[],
  placements: PlacementResult[],
  decklistEntries: DecklistEntry[],
  players: Record<string, PlayerInfo>
): void {
  const db = getDb();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournament.id);
    db.prepare("DELETE FROM placements WHERE tournament_id = ?").run(tournament.id);
    db.prepare("DELETE FROM decklists WHERE tournament_id = ?").run(tournament.id);
    db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournament.id);

    db.prepare(`
      INSERT INTO tournaments (id, name, organization_name, date, tags, player_count, match_count, event_tier, ingested_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tournament.id,
      tournament.name,
      tournament.organizationName,
      tournament.date,
      JSON.stringify(tournament.tags),
      tournament.playerCount,
      tournament.matchCount,
      tournament.eventTier,
      tournament.ingestedAt
    );

    const insertPlayer = db.prepare(`
      INSERT OR REPLACE INTO players (id, melee_id, name, username) VALUES (?, ?, ?, ?)
    `);
    for (const p of Object.values(players)) {
      insertPlayer.run(p.id, p.meleeId, p.name, p.username);
    }

    const insertMatch = db.prepare(`
      INSERT INTO matches (tournament_id, player1_id, player2_id, player1_wins, player2_wins, round_name, date, event_tier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of matches) {
      insertMatch.run(m.tournamentId, m.player1Id, m.player2Id, m.player1Wins, m.player2Wins, m.roundName, m.date, m.eventTier);
    }

    const insertPlacement = db.prepare(`
      INSERT INTO placements (tournament_id, player_id, placement, event_tier, date) VALUES (?, ?, ?, ?, ?)
    `);
    for (const p of placements) {
      insertPlacement.run(p.tournamentId, p.playerId, p.placement, p.eventTier, p.date);
    }

    const insertDecklist = db.prepare(`
      INSERT INTO decklists (tournament_id, player_id, leader, base, full_name, decklist_guid) VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const d of decklistEntries) {
      insertDecklist.run(tournament.id, d.playerId, d.leader, d.base, d.fullName, d.decklistGuid);
    }

    recomputeRatings();
  });

  tx();
}

export function reingestFromCache(tournamentId: number): boolean {
  const db = getDb();
  const row = db.prepare("SELECT raw_json, scraped_at FROM scraped_data WHERE tournament_id = ?").get(tournamentId) as
    { raw_json: string; scraped_at: string } | undefined;
  if (!row) return false;

  const raw = JSON.parse(row.raw_json);
  const standings = raw.standings || [];
  const matchEntries: [string, unknown[]][] = raw.matchesByRound || [];
  const roundNameEntries: [string, string][] = raw.roundNames || [];
  const roundNameMap = new Map<string, string>(roundNameEntries);
  const tournamentName = raw.name || `Tournament ${tournamentId}`;

  const existing = db.prepare("SELECT event_tier, organization_name FROM tournaments WHERE id = ?").get(tournamentId) as
    { event_tier: EventTier; organization_name: string } | undefined;
  const eventTier = existing?.event_tier ?? ("showdown" as EventTier);
  const orgName = existing?.organization_name ?? "Unknown";
  const firstStanding = standings[0] as Record<string, unknown> | undefined;
  const tournamentDate = (firstStanding?.DateCreated as string) || row.scraped_at;

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

  // Detect top cut
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
      else topCutSize = 4;
    }
  }

  const placements: PlacementResult[] = [];
  const decklistEntries: { playerId: string; leader: string; base: string; fullName: string; decklistGuid: string | null }[] = [];

  for (const s of standings as Record<string, unknown>[]) {
    const team = s.Team as Record<string, unknown>;
    if (!team?.Players) continue;
    const sp = (team.Players as Record<string, unknown>[])[0];
    if (!sp) continue;
    const playerId = ((sp.Username || sp.DisplayName) as string).toLowerCase();

    if (topCutSize > 0 && (s.Rank as number) <= topCutSize) {
      placements.push({ playerId, tournamentId, placement: s.Rank as number, eventTier, date: tournamentDate });
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

  const playerCount = Object.keys(players).length;

  addTournament(
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
    placements,
    decklistEntries,
    players,
  );

  return true;
}

export function updateTournamentTier(id: number, eventTier: EventTier): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db.prepare("UPDATE tournaments SET event_tier = ? WHERE id = ?").run(eventTier, id);
    if (info.changes === 0) return false;
    db.prepare("UPDATE matches SET event_tier = ? WHERE tournament_id = ?").run(eventTier, id);
    db.prepare("UPDATE placements SET event_tier = ? WHERE tournament_id = ?").run(eventTier, id);
    recomputeRatings();
    return true;
  });
  return tx();
}

export function removeTournament(id: number): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db.prepare("DELETE FROM tournaments WHERE id = ?").run(id);
    if (info.changes > 0) {
      recomputeRatings();
      return true;
    }
    return false;
  });
  return tx();
}

function recomputeRatings(): void {
  const db = getDb();

  const matchRows = db.prepare(`
    SELECT player1_id, player2_id, player1_wins, player2_wins, tournament_id,
           t.name as tournament_name, round_name, matches.date, matches.event_tier
    FROM matches
    JOIN tournaments t ON t.id = matches.tournament_id
    ORDER BY matches.date, matches.id
  `).all() as Array<{
    player1_id: string; player2_id: string; player1_wins: number; player2_wins: number;
    tournament_id: number; tournament_name: string; round_name: string; date: string; event_tier: EventTier;
  }>;

  const matches: MatchResult[] = matchRows.map((r) => ({
    player1Id: r.player1_id,
    player2Id: r.player2_id,
    player1Wins: r.player1_wins,
    player2Wins: r.player2_wins,
    tournamentId: r.tournament_id,
    tournamentName: r.tournament_name,
    roundName: r.round_name,
    date: r.date,
    eventTier: r.event_tier,
  }));

  const placementRows = db.prepare(`
    SELECT player_id, tournament_id, placement, event_tier, date FROM placements
  `).all() as Array<{
    player_id: string; tournament_id: number; placement: number; event_tier: EventTier; date: string;
  }>;

  const placements: PlacementResult[] = placementRows.map((r) => ({
    playerId: r.player_id,
    tournamentId: r.tournament_id,
    placement: r.placement,
    eventTier: r.event_tier,
    date: r.date,
  }));

  const ratings = computeRatings(matches, placements);

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

  db.prepare("DELETE FROM ratings").run();
  const insertRating = db.prepare(`
    INSERT INTO ratings (player_id, rating, peak_rating, wins, losses, draws, streak, tournament_count, tournament_wins, top8s, last_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const [id, r] of ratings) {
    insertRating.run(id, r.rating, r.peakRating, r.wins, r.losses, r.draws, r.streak, r.tournamentCount, r.tournamentWins, r.top8s, r.lastActive);
  }
}

export function getCachedAspects(deckKey: string): string[] | null {
  const db = getDb();
  const row = db.prepare("SELECT aspects FROM aspect_cache WHERE deck_key = ?").get(deckKey) as { aspects: string } | undefined;
  return row ? JSON.parse(row.aspects) : null;
}

export function setCachedAspects(deckKey: string, aspects: string[]): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO aspect_cache (deck_key, aspects) VALUES (?, ?)").run(deckKey, JSON.stringify(aspects));
}

export function getPlayerAspects(playerId: string): string[] {
  const db = getDb();
  const row = db.prepare(`
    SELECT ac.aspects
    FROM decklists d
    JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
    JOIN tournaments t ON t.id = d.tournament_id
    WHERE d.player_id = ?
    GROUP BY d.leader, d.base
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC, MAX(t.date) DESC
    LIMIT 1
  `).get(playerId) as { aspects: string } | undefined;
  return row ? JSON.parse(row.aspects) : [];
}

export function forceRecalculate(): void {
  const db = getDb();
  recomputeRatings();
}

export function getLeaderboard(): (PlayerRating & { rank: number; mainLeader: string | null; aspects: string[] })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.*, p.melee_id, p.name, p.username,
      (SELECT d1.leader || ' - ' || d1.base FROM decklists d1
        JOIN tournaments t1 ON t1.id = d1.tournament_id
        WHERE d1.player_id = r.player_id
        GROUP BY d1.leader, d1.base
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC, MAX(t1.date) DESC
        LIMIT 1) as main_leader,
      (SELECT ac.aspects FROM decklists d2
        JOIN aspect_cache ac ON ac.deck_key = d2.leader || '||' || d2.base
        JOIN tournaments t2 ON t2.id = d2.tournament_id
        WHERE d2.player_id = r.player_id
        GROUP BY d2.leader, d2.base
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC, MAX(t2.date) DESC
        LIMIT 1) as main_aspects
    FROM ratings r
    JOIN players p ON p.id = r.player_id
    WHERE r.wins + r.losses + r.draws >= 3
    ORDER BY r.rating DESC
  `).all() as Array<{
    player_id: string; rating: number; peak_rating: number; wins: number; losses: number;
    draws: number; streak: number; tournament_count: number; tournament_wins: number;
    top8s: number; last_active: string; melee_id: number; name: string; username: string;
    main_leader: string | null; main_aspects: string | null;
  }>;

  return rows.map((r, i) => ({
    id: r.player_id,
    meleeId: r.melee_id,
    name: r.name,
    username: r.username,
    rating: r.rating,
    peakRating: r.peak_rating,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    streak: r.streak,
    tournamentCount: r.tournament_count,
    tournamentWins: r.tournament_wins,
    top8s: r.top8s,
    lastActive: r.last_active,
    mainLeader: r.main_leader,
    aspects: r.main_aspects ? JSON.parse(r.main_aspects) : [],
    rank: i + 1,
  }));
}

export interface TournamentSummary extends StoredTournament {
  winnerUsername: string | null;
  hasCachedScrape: boolean;
}

export function getIngestedTournaments(): TournamentSummary[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*,
      (SELECT p.username FROM placements pl JOIN players p ON p.id = pl.player_id
       WHERE pl.tournament_id = t.id AND pl.placement = 1 LIMIT 1) as winner_username,
      (SELECT 1 FROM scraped_data sd WHERE sd.tournament_id = t.id) as has_cached_scrape
    FROM tournaments t ORDER BY t.date
  `).all() as Array<{
    id: number; name: string; organization_name: string; date: string; tags: string;
    player_count: number; match_count: number; event_tier: EventTier; ingested_at: string;
    winner_username: string | null; has_cached_scrape: number | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    organizationName: r.organization_name,
    date: r.date,
    tags: JSON.parse(r.tags),
    playerCount: r.player_count,
    matchCount: r.match_count,
    eventTier: r.event_tier,
    ingestedAt: r.ingested_at,
    winnerUsername: r.winner_username,
    hasCachedScrape: !!r.has_cached_scrape,
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

export function getPlayerTournaments(playerId: string): PlayerTournament[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      t.id, t.name, t.date, t.event_tier,
      SUM(CASE WHEN
        (m.player1_id = ? AND m.player1_wins > m.player2_wins) OR
        (m.player2_id = ? AND m.player2_wins > m.player1_wins)
        THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN
        (m.player1_id = ? AND m.player2_wins > m.player1_wins) OR
        (m.player2_id = ? AND m.player1_wins > m.player2_wins)
        THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN m.player1_wins = m.player2_wins THEN 1 ELSE 0 END) as draws,
      p.placement
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    LEFT JOIN placements p ON p.tournament_id = t.id AND p.player_id = ?
    WHERE m.player1_id = ? OR m.player2_id = ?
    GROUP BY t.id
    ORDER BY t.date DESC
  `).all(playerId, playerId, playerId, playerId, playerId, playerId, playerId) as Array<{
    id: number; name: string; date: string; event_tier: EventTier;
    wins: number; losses: number; draws: number; placement: number | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    date: r.date,
    eventTier: r.event_tier,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    placement: r.placement,
  }));
}

export function getPlayerTitleTiers(playerId: string): EventTier[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.event_tier
    FROM placements p
    JOIN tournaments t ON t.id = p.tournament_id
    WHERE p.player_id = ? AND p.placement = 1
    ORDER BY t.date
  `).all(playerId) as Array<{ event_tier: EventTier }>;
  return rows.map((r) => r.event_tier);
}

export function getPlayerBestFinish(playerId: string): number | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT MIN(placement) as best FROM placements WHERE player_id = ?
  `).get(playerId) as { best: number | null } | undefined;
  return row?.best ?? null;
}

export function getPlayerRatingChange(playerId: string): number {
  const db = getDb();
  const row = db.prepare("SELECT rating FROM ratings WHERE player_id = ?").get(playerId) as { rating: number } | undefined;
  return (row?.rating ?? 1500) - 1500;
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

export function getPlayerRivalries(playerId: string): PlayerRivalries {
  const db = getDb();

  const rows = db.prepare(`
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
      FROM matches WHERE player1_id = ?
      UNION ALL
      SELECT
        player1_id as opponent_id,
        CASE WHEN player2_wins > player1_wins THEN 1 ELSE 0 END as won,
        CASE WHEN player1_wins > player2_wins THEN 1 ELSE 0 END as lost,
        CASE WHEN player1_wins = player2_wins THEN 1 ELSE 0 END as drew
      FROM matches WHERE player2_id = ?
    ) h2h
    JOIN players p ON p.id = h2h.opponent_id
    GROUP BY opponent_id
    ORDER BY total_matches DESC
  `).all(playerId, playerId) as Array<{
    opponent_id: string; opponent_name: string; opponent_username: string;
    wins: number; losses: number; draws: number; total_matches: number;
  }>;

  const matchups: HeadToHead[] = rows.map((r) => ({
    opponentId: r.opponent_id,
    opponentName: r.opponent_name,
    opponentUsername: r.opponent_username,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
    totalMatches: r.total_matches,
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

export function getPlayerMostUsedLeader(playerId: string): string | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT leader, COUNT(*) as cnt FROM decklists
    WHERE player_id = ? GROUP BY leader ORDER BY cnt DESC LIMIT 1
  `).get(playerId) as { leader: string; cnt: number } | undefined;
  return row?.leader ?? null;
}

export interface PlayerLeaderEntry {
  leader: string;
  base: string;
  count: number;
  events: { tournamentName: string; tournamentId: number; decklistGuid: string | null }[];
}

export function getPlayerLeaders(playerId: string): PlayerLeaderEntry[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT d.leader, d.base, d.full_name, d.decklist_guid, d.tournament_id, t.name as tournament_name
    FROM decklists d
    JOIN tournaments t ON t.id = d.tournament_id
    WHERE d.player_id = ?
    ORDER BY t.date
  `).all(playerId) as Array<{
    leader: string; base: string; full_name: string; decklist_guid: string | null;
    tournament_id: number; tournament_name: string;
  }>;

  const grouped = new Map<string, PlayerLeaderEntry>();
  for (const r of rows) {
    const key = `${r.leader}||${r.base}`;
    const existing = grouped.get(key);
    const event = { tournamentName: r.tournament_name, tournamentId: r.tournament_id, decklistGuid: r.decklist_guid };
    if (existing) {
      existing.count++;
      existing.events.push(event);
    } else {
      grouped.set(key, { leader: r.leader, base: r.base, count: 1, events: [event] });
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

export function getTournamentDetail(id: number): TournamentDetail | null {
  const db = getDb();

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as {
    id: number; name: string; organization_name: string; date: string;
    event_tier: EventTier; player_count: number; match_count: number;
  } | undefined;
  if (!tournament) return null;

  const topCutRow = db.prepare(
    "SELECT MAX(placement) as top_cut FROM placements WHERE tournament_id = ?"
  ).get(id) as { top_cut: number | null } | undefined;
  const topCutSize = topCutRow?.top_cut ?? 0;

  const standingRows = db.prepare(`
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
    WHERE pl.tournament_id = ?
    ORDER BY pl.placement
  `).all(id) as Array<{
    rank: number; player_id: string; username: string; name: string; leader: string | null; base: string | null;
  }>;

  const allDecklists = db.prepare(`
    SELECT player_id, leader, base FROM decklists WHERE tournament_id = ?
  `).all(id) as Array<{ player_id: string; leader: string; base: string }>;
  const decklistMap = new Map(allDecklists.map((d) => [d.player_id, d]));

  const matchRows = db.prepare(`
    SELECT m.round_name, m.player1_id, m.player2_id, m.player1_wins, m.player2_wins,
           p1.username as p1_username, p2.username as p2_username
    FROM matches m
    JOIN players p1 ON p1.id = m.player1_id
    JOIN players p2 ON p2.id = m.player2_id
    WHERE m.tournament_id = ?
    ORDER BY m.id
  `).all(id) as Array<{
    round_name: string; player1_id: string; player2_id: string;
    player1_wins: number; player2_wins: number; p1_username: string; p2_username: string;
  }>;

  const roundsMap = new Map<string, TournamentDetail["rounds"][0]>();
  for (const m of matchRows) {
    if (!roundsMap.has(m.round_name)) {
      roundsMap.set(m.round_name, { name: m.round_name, matches: [] });
    }
    roundsMap.get(m.round_name)!.matches.push({
      player1Id: m.player1_id,
      player1Username: m.p1_username,
      player1Wins: m.player1_wins,
      player2Id: m.player2_id,
      player2Username: m.p2_username,
      player2Wins: m.player2_wins,
    });
  }

  // Build full standings from match data for all players (not just top 8)
  const playerStats = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const m of matchRows) {
    for (const pid of [m.player1_id, m.player2_id]) {
      if (!playerStats.has(pid)) playerStats.set(pid, { wins: 0, losses: 0, draws: 0 });
    }
    const s1 = playerStats.get(m.player1_id)!;
    const s2 = playerStats.get(m.player2_id)!;
    if (m.player1_wins > m.player2_wins) { s1.wins++; s2.losses++; }
    else if (m.player2_wins > m.player1_wins) { s2.wins++; s1.losses++; }
    else { s1.draws++; s2.draws++; }
  }

  const allPlayerIds = Array.from(playerStats.keys());
  const playerInfos = new Map<string, { username: string; name: string }>();
  for (const pid of allPlayerIds) {
    const info = db.prepare("SELECT username, name FROM players WHERE id = ?").get(pid) as { username: string; name: string } | undefined;
    if (info) playerInfos.set(pid, info);
  }

  // Top 8 from placements, rest sorted by wins
  const top8Ids = new Set(standingRows.map((s) => s.player_id));
  const restPlayers = allPlayerIds
    .filter((pid) => !top8Ids.has(pid))
    .sort((a, b) => {
      const sa = playerStats.get(a)!;
      const sb = playerStats.get(b)!;
      return (sb.wins - sb.losses) - (sa.wins - sa.losses);
    });

  const standings: TournamentDetail["standings"] = [];
  for (const s of standingRows) {
    const stats = playerStats.get(s.player_id) ?? { wins: 0, losses: 0, draws: 0 };
    standings.push({
      rank: s.rank,
      playerId: s.player_id,
      username: s.username,
      name: s.name,
      leader: s.leader,
      base: s.base,
      matchWins: stats.wins,
      matchLosses: stats.losses,
      matchDraws: stats.draws,
    });
  }
  let rank = standings.length + 1;
  for (const pid of restPlayers) {
    const info = playerInfos.get(pid);
    const stats = playerStats.get(pid)!;
    const deck = decklistMap.get(pid);
    if (info) {
      standings.push({
        rank: rank++,
        playerId: pid,
        username: info.username,
        name: info.name,
        leader: deck?.leader ?? null,
        base: deck?.base ?? null,
        matchWins: stats.wins,
        matchLosses: stats.losses,
        matchDraws: stats.draws,
      });
    }
  }

  return {
    id: tournament.id,
    name: tournament.name,
    organizationName: tournament.organization_name,
    date: tournament.date,
    eventTier: tournament.event_tier,
    playerCount: tournament.player_count,
    matchCount: tournament.match_count,
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
