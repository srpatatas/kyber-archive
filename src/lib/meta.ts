import { query } from "./db";
import { normalizeBase } from "./base-normalization";

export interface DecklistEntry {
  playerUsername: string;
  tournamentName: string;
  tournamentId: number;
  decklistGuid: string | null;
  base: string;
}

export interface DeckStats {
  leader: string;
  baseKey: string;
  baseDisplay: string;
  baseAspect: string | null;
  aspects: string[];
  count: number;
  playRate: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalEntries: number;
  topCutEntries: number;
  conversionRate: number;
  kyberCount: number;
  kyberScore: number;
  score: number;
  kyberTournaments: { name: string; id: number; tier: string }[];
  decklists: DecklistEntry[];
}

const KYBER_TIER_WEIGHTS: Record<string, number> = {
  minor: 1,
  showdown: 1.2,
  major: 1.5,
  planetary: 2,
  sector: 3,
  galactic: 4,
};

export interface LeaderMatchup {
  leader1: string;
  base1: string;
  leader2: string;
  base2: string;
  leader1Wins: number;
  leader2Wins: number;
  draws: number;
  total: number;
  leader1WinRate: number;
}

export interface MetaStats {
  decks: DeckStats[];
  matchups: LeaderMatchup[];
  matchupsAll: LeaderMatchup[];
  totalDecklists: number;
  totalTournaments: number;
  uniqueLeaders: number;
  previousDeckOrder?: string[];
}

export type MetaPeriod = "3m" | "6m" | "pre";

const ROTATION_DATE = "2026-03-13";

function periodDateRange(period: MetaPeriod): { startDate: string | null; endDate: string | null } {
  if (period === "pre") return { startDate: null, endDate: ROTATION_DATE };
  const now = new Date();
  const months = period === "3m" ? 3 : 6;
  now.setMonth(now.getMonth() - months);
  const periodDate = now.toISOString().slice(0, 10);
  return { startDate: periodDate > ROTATION_DATE ? periodDate : ROTATION_DATE, endDate: null };
}

export async function recomputeMetaStats(snapshot = false): Promise<void> {
  const periods: MetaPeriod[] = ["3m", "6m", "pre"];
  for (const period of periods) {
    const previous = await getMetaStats(period);
    const previousDeckOrder = snapshot
      ? previous.decks.map((d) => `${d.leader}||${d.baseKey}`)
      : previous.previousDeckOrder ?? [];

    const { startDate, endDate } = periodDateRange(period);
    const stats = await computeMetaStats(startDate, endDate);
    stats.previousDeckOrder = previousDeckOrder;
    await query(
      `INSERT INTO meta_cache (key, data) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
      [`meta_stats:${period}`, JSON.stringify(stats)]
    );
  }
}

export async function getMetaStats(period: MetaPeriod = "6m"): Promise<MetaStats> {
  const { rows } = await query("SELECT data FROM meta_cache WHERE key = $1", [`meta_stats:${period}`]);
  if (rows.length > 0) {
    return JSON.parse(rows[0].data as string);
  }
  return { decks: [], matchups: [], matchupsAll: [], totalDecklists: 0, totalTournaments: 0, uniqueLeaders: 0 };
}

async function computeMetaStats(startDate: string | null, endDate: string | null): Promise<MetaStats> {
  let dateCondition = "";
  const dateParams: string[] = [];

  if (startDate && endDate) {
    dateCondition = `AND t.date >= $${dateParams.length + 1} AND t.date < $${dateParams.length + 2}`;
    dateParams.push(startDate, endDate);
  } else if (startDate) {
    dateCondition = `AND t.date >= $${dateParams.length + 1}`;
    dateParams.push(startDate);
  } else if (endDate) {
    dateCondition = `AND t.date < $${dateParams.length + 1}`;
    dateParams.push(endDate);
  }

  const deckFilter = "AND d.leader != '' AND d.leader != 'Decklist' AND d.base != ''";

  const [popularityRows, winRateRows, topCutRows, matchupRows, countRows, decklistRows, kyberRows] = await Promise.all([
    query(`
      SELECT d.leader, d.base, COUNT(*) as count, ac.aspects
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      LEFT JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
      WHERE 1=1 ${dateCondition} ${deckFilter}
      GROUP BY d.leader, d.base, ac.aspects
      ORDER BY count DESC
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d.leader, d.base, ac.aspects,
        SUM(CASE
          WHEN m.player1_id = d.player_id AND m.player1_wins > m.player2_wins THEN 1
          WHEN m.player2_id = d.player_id AND m.player2_wins > m.player1_wins THEN 1
          ELSE 0 END) as wins,
        SUM(CASE
          WHEN m.player1_id = d.player_id AND m.player2_wins > m.player1_wins THEN 1
          WHEN m.player2_id = d.player_id AND m.player1_wins > m.player2_wins THEN 1
          ELSE 0 END) as losses,
        SUM(CASE WHEN m.player1_wins = m.player2_wins THEN 1 ELSE 0 END) as draws
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      JOIN matches m ON m.tournament_id = d.tournament_id
        AND (m.player1_id = d.player_id OR m.player2_id = d.player_id)
      LEFT JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
      WHERE 1=1 ${dateCondition} ${deckFilter}
      GROUP BY d.leader, d.base, ac.aspects
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d.leader, d.base,
        COUNT(DISTINCT d.tournament_id || ':' || d.player_id) as total_entries,
        COUNT(DISTINCT CASE WHEN p.placement IS NOT NULL THEN d.tournament_id || ':' || d.player_id END) as top_cut_entries,
        COUNT(DISTINCT CASE WHEN p.placement = 1 THEN d.tournament_id || ':' || d.player_id END) as kyber_count
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      LEFT JOIN placements p ON p.tournament_id = d.tournament_id AND p.player_id = d.player_id
      WHERE 1=1 ${dateCondition} ${deckFilter}
      GROUP BY d.leader, d.base
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d1.leader as leader1, d1.base as base1, d2.leader as leader2, d2.base as base2,
        SUM(CASE WHEN m.player1_wins > m.player2_wins THEN 1 ELSE 0 END) as l1_wins,
        SUM(CASE WHEN m.player2_wins > m.player1_wins THEN 1 ELSE 0 END) as l2_wins,
        SUM(CASE WHEN m.player1_wins = m.player2_wins THEN 1 ELSE 0 END) as draws
      FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      JOIN decklists d1 ON d1.tournament_id = m.tournament_id AND d1.player_id = m.player1_id
      JOIN decklists d2 ON d2.tournament_id = m.tournament_id AND d2.player_id = m.player2_id
      WHERE 1=1 ${dateCondition} AND d1.leader != '' AND d1.leader != 'Decklist' AND d1.base != '' AND d2.leader != '' AND d2.leader != 'Decklist' AND d2.base != ''
      GROUP BY d1.leader, d1.base, d2.leader, d2.base
    `, dateParams).then(r => r.rows),

    query(`
      SELECT
        (SELECT COUNT(*) FROM decklists d JOIN tournaments t ON t.id = d.tournament_id WHERE 1=1 ${dateCondition} ${deckFilter}) as total_decklists,
        (SELECT COUNT(DISTINCT t.id) FROM tournaments t WHERE 1=1 ${dateCondition}) as total_tournaments,
        (SELECT COUNT(DISTINCT d.leader) FROM decklists d JOIN tournaments t ON t.id = d.tournament_id WHERE 1=1 ${dateCondition} ${deckFilter}) as unique_leaders
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d.leader, d.base, p.username as player_username, t.name as tournament_name, t.id as tournament_id, d.decklist_guid
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      JOIN players p ON p.id = d.player_id
      WHERE 1=1 ${dateCondition} ${deckFilter}
      ORDER BY t.date DESC
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d.leader, d.base, t.name as tournament_name, t.id as tournament_id, t.event_tier
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      JOIN placements p ON p.tournament_id = d.tournament_id AND p.player_id = d.player_id AND p.placement = 1
      WHERE 1=1 ${dateCondition} ${deckFilter}
      ORDER BY t.date DESC
    `, dateParams).then(r => r.rows),
  ]);

  const totalDecklists = Number(countRows[0]?.total_decklists ?? 0);
  const totalTournaments = Number(countRows[0]?.total_tournaments ?? 0);
  const uniqueLeaders = Number(countRows[0]?.unique_leaders ?? 0);

  type DeckKey = string;
  const deckMap = new Map<DeckKey, DeckStats>();

  const getDeckKey = (leader: string, base: string) => {
    const norm = normalizeBase(base);
    return `${leader}||${norm.key}`;
  };

  const getDeckEntry = (leader: string, base: string, aspects: string[]): DeckStats => {
    const key = getDeckKey(leader, base);
    if (!deckMap.has(key)) {
      const norm = normalizeBase(base);
      deckMap.set(key, {
        leader,
        baseKey: norm.key,
        baseDisplay: norm.display,
        baseAspect: norm.aspect,
        aspects,
        count: 0,
        playRate: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalEntries: 0,
        topCutEntries: 0,
        conversionRate: 0,
        kyberCount: 0,
        kyberScore: 0,
        score: 0,
        kyberTournaments: [],
        decklists: [],
      });
    }
    const entry = deckMap.get(key)!;
    if (aspects.length > entry.aspects.length) entry.aspects = aspects;
    return entry;
  };

  for (const r of popularityRows) {
    const aspects = parseAspects(r.aspects);
    const entry = getDeckEntry(r.leader as string, r.base as string, aspects);
    entry.count += Number(r.count);
  }

  for (const r of winRateRows) {
    const aspects = parseAspects(r.aspects);
    const entry = getDeckEntry(r.leader as string, r.base as string, aspects);
    entry.wins += Number(r.wins);
    entry.losses += Number(r.losses);
    entry.draws += Number(r.draws);
  }

  for (const r of decklistRows) {
    const key = getDeckKey(r.leader as string, r.base as string);
    const entry = deckMap.get(key);
    if (entry) {
      entry.decklists.push({
        playerUsername: r.player_username as string,
        tournamentName: r.tournament_name as string,
        tournamentId: r.tournament_id as number,
        decklistGuid: r.decklist_guid as string | null,
        base: r.base as string,
      });
    }
  }

  for (const r of topCutRows) {
    const key = getDeckKey(r.leader as string, r.base as string);
    const entry = deckMap.get(key);
    if (entry) {
      entry.totalEntries += Number(r.total_entries);
      entry.topCutEntries += Number(r.top_cut_entries);
      entry.kyberCount += Number(r.kyber_count);
    }
  }

  for (const r of kyberRows) {
    const key = getDeckKey(r.leader as string, r.base as string);
    const entry = deckMap.get(key);
    if (entry) {
      const tier = r.event_tier as string;
      entry.kyberTournaments.push({ name: r.tournament_name as string, id: r.tournament_id as number, tier });
      entry.kyberScore += KYBER_TIER_WEIGHTS[tier] ?? 1;
    }
  }

  const allDecks = Array.from(deckMap.values());
  const decks = allDecks.filter((d) => (d.wins + d.losses + d.draws) >= 5);
  const relevantDecklists = decks.reduce((sum, d) => sum + d.count, 0);
  for (const d of decks) {
    d.playRate = relevantDecklists > 0 ? Math.round((d.count / relevantDecklists) * 1000) / 10 : 0;
    const totalGames = d.wins + d.losses;
    d.winRate = totalGames > 0 ? Math.round((d.wins / totalGames) * 1000) / 10 : 0;
    d.conversionRate = d.totalEntries > 0 ? Math.round((d.topCutEntries / d.totalEntries) * 1000) / 10 : 0;
  }

  const totalTournamentIds = new Set(decks.flatMap((d) => d.kyberTournaments?.map((t) => t.id) ?? []));
  const maxKyberPossible = (totalTournamentIds.size || Math.max(...decks.map((d) => d.count)) || 1) * 2;
  for (const d of decks) {
    const confidence = Math.min(d.count / 6, 1);
    const raw =
      Math.min(d.kyberScore / maxKyberPossible, 1) * 30 +
      (d.conversionRate / 100) * 27 +
      (d.winRate / 100) * 25 +
      (d.playRate / 100) * 18;
    d.score = Math.round(raw * confidence * 10) / 10;
  }
  decks.sort((a, b) => b.score - a.score);

  const validDeckKeys = new Set(decks.map((d) => `${d.leader}||${d.baseKey}`));

  function aggregateMatchups(filter: (deck1: string, deck2: string) => boolean): LeaderMatchup[] {
    const agg = new Map<string, { l1: string; b1: string; l2: string; b2: string; l1Wins: number; l2Wins: number; draws: number }>();
    for (const r of matchupRows) {
      const b1Norm = normalizeBase(r.base1 as string);
      const b2Norm = normalizeBase(r.base2 as string);
      const deck1 = `${r.leader1}||${b1Norm.key}`;
      const deck2 = `${r.leader2}||${b2Norm.key}`;
      if (!filter(deck1, deck2)) continue;
      const [sortedA, sortedB] = [deck1, deck2].sort();
      const pairKey = `${sortedA}|||${sortedB}`;
      const isForward = deck1 <= deck2;

      if (!agg.has(pairKey)) {
        agg.set(pairKey, {
          l1: isForward ? (r.leader1 as string) : (r.leader2 as string),
          b1: isForward ? b1Norm.display : b2Norm.display,
          l2: isForward ? (r.leader2 as string) : (r.leader1 as string),
          b2: isForward ? b2Norm.display : b1Norm.display,
          l1Wins: 0, l2Wins: 0, draws: 0,
        });
      }
      const entry = agg.get(pairKey)!;
      if (isForward) {
        entry.l1Wins += Number(r.l1_wins);
        entry.l2Wins += Number(r.l2_wins);
      } else {
        entry.l1Wins += Number(r.l2_wins);
        entry.l2Wins += Number(r.l1_wins);
      }
      entry.draws += Number(r.draws);
    }

    const result: LeaderMatchup[] = [];
    for (const a of agg.values()) {
      const total = a.l1Wins + a.l2Wins + a.draws;
      const totalDecisive = a.l1Wins + a.l2Wins;
      result.push({
        leader1: a.l1, base1: a.b1, leader2: a.l2, base2: a.b2,
        leader1Wins: a.l1Wins, leader2Wins: a.l2Wins, draws: a.draws, total,
        leader1WinRate: totalDecisive > 0 ? Math.round((a.l1Wins / totalDecisive) * 1000) / 10 : 50,
      });
    }
    return result.sort((a, b) => b.total - a.total);
  }

  const matchupsFiltered = aggregateMatchups((d1, d2) => validDeckKeys.has(d1) && validDeckKeys.has(d2)).filter((m) => m.total >= 3);
  const matchupsAll = aggregateMatchups((d1, d2) => validDeckKeys.has(d1) || validDeckKeys.has(d2));

  return { decks, matchups: matchupsFiltered, matchupsAll, totalDecklists, totalTournaments, uniqueLeaders };
}

function parseAspects(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
