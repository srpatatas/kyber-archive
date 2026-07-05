import { query } from "./db";
import { normalizeBase } from "./base-normalization";

export interface DeckStats {
  leader: string;
  baseDisplay: string;
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
}

export interface LeaderMatchup {
  leader1: string;
  leader2: string;
  leader1Wins: number;
  leader2Wins: number;
  draws: number;
  total: number;
  leader1WinRate: number;
}

export interface MetaStats {
  decks: DeckStats[];
  matchups: LeaderMatchup[];
  totalDecklists: number;
  totalTournaments: number;
  uniqueLeaders: number;
}

export type MetaEra = "current" | "pre-rotation" | "all-time";

export const META_ERAS: { key: MetaEra; label: string; sublabel: string }[] = [
  { key: "current", label: "Post-Rotación", sublabel: "Mar 2026+" },
  { key: "pre-rotation", label: "Pre-Rotación", sublabel: "Antes de Mar 2026" },
  { key: "all-time", label: "All-Time", sublabel: "Todos los torneos" },
];

const ROTATION_DATE = "2026-03-13";

function eraDateRange(era: MetaEra): { startDate: string | null; endDate: string | null } {
  switch (era) {
    case "current": return { startDate: ROTATION_DATE, endDate: null };
    case "pre-rotation": return { startDate: null, endDate: ROTATION_DATE };
    case "all-time": return { startDate: null, endDate: null };
  }
}

export async function recomputeMetaStats(): Promise<void> {
  const eras: MetaEra[] = ["current", "pre-rotation", "all-time"];
  for (const era of eras) {
    const { startDate, endDate } = eraDateRange(era);
    const stats = await computeMetaStats(startDate, endDate);
    await query(
      `INSERT INTO meta_cache (key, data) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
      [`meta_stats:${era}`, JSON.stringify(stats)]
    );
  }
}

export async function getMetaStats(era: MetaEra = "current"): Promise<MetaStats> {
  const { rows } = await query("SELECT data FROM meta_cache WHERE key = $1", [`meta_stats:${era}`]);
  if (rows.length > 0) {
    return JSON.parse(rows[0].data as string);
  }
  return { decks: [], matchups: [], totalDecklists: 0, totalTournaments: 0, uniqueLeaders: 0 };
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

  const [popularityRows, winRateRows, topCutRows, matchupRows, countRows] = await Promise.all([
    query(`
      SELECT d.leader, d.base, COUNT(*) as count, ac.aspects
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      LEFT JOIN aspect_cache ac ON ac.deck_key = d.leader || '||' || d.base
      WHERE 1=1 ${dateCondition}
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
      WHERE 1=1 ${dateCondition}
      GROUP BY d.leader, d.base, ac.aspects
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d.leader, d.base,
        COUNT(DISTINCT d.tournament_id || ':' || d.player_id) as total_entries,
        COUNT(DISTINCT CASE WHEN p.placement IS NOT NULL THEN d.tournament_id || ':' || d.player_id END) as top_cut_entries
      FROM decklists d
      JOIN tournaments t ON t.id = d.tournament_id
      LEFT JOIN placements p ON p.tournament_id = d.tournament_id AND p.player_id = d.player_id
      WHERE 1=1 ${dateCondition}
      GROUP BY d.leader, d.base
    `, dateParams).then(r => r.rows),

    query(`
      SELECT d1.leader as leader1, d2.leader as leader2,
        SUM(CASE WHEN m.player1_wins > m.player2_wins THEN 1 ELSE 0 END) as l1_wins,
        SUM(CASE WHEN m.player2_wins > m.player1_wins THEN 1 ELSE 0 END) as l2_wins,
        SUM(CASE WHEN m.player1_wins = m.player2_wins THEN 1 ELSE 0 END) as draws
      FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      JOIN decklists d1 ON d1.tournament_id = m.tournament_id AND d1.player_id = m.player1_id
      JOIN decklists d2 ON d2.tournament_id = m.tournament_id AND d2.player_id = m.player2_id
      WHERE 1=1 ${dateCondition}
      GROUP BY d1.leader, d2.leader
    `, dateParams).then(r => r.rows),

    query(`
      SELECT
        (SELECT COUNT(*) FROM decklists d JOIN tournaments t ON t.id = d.tournament_id WHERE 1=1 ${dateCondition}) as total_decklists,
        (SELECT COUNT(DISTINCT t.id) FROM tournaments t WHERE 1=1 ${dateCondition}) as total_tournaments,
        (SELECT COUNT(DISTINCT d.leader) FROM decklists d JOIN tournaments t ON t.id = d.tournament_id WHERE 1=1 ${dateCondition}) as unique_leaders
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
        baseDisplay: norm.display,
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

  for (const r of topCutRows) {
    const key = getDeckKey(r.leader as string, r.base as string);
    const entry = deckMap.get(key);
    if (entry) {
      entry.totalEntries += Number(r.total_entries);
      entry.topCutEntries += Number(r.top_cut_entries);
    }
  }

  const decks = Array.from(deckMap.values());
  for (const d of decks) {
    d.playRate = totalDecklists > 0 ? Math.round((d.count / totalDecklists) * 1000) / 10 : 0;
    const totalGames = d.wins + d.losses;
    d.winRate = totalGames > 0 ? Math.round((d.wins / totalGames) * 1000) / 10 : 0;
    d.conversionRate = d.totalEntries > 0 ? Math.round((d.topCutEntries / d.totalEntries) * 1000) / 10 : 0;
  }
  decks.sort((a, b) => b.count - a.count);

  const matchups: LeaderMatchup[] = [];
  const seen = new Set<string>();
  for (const r of matchupRows) {
    const l1 = r.leader1 as string;
    const l2 = r.leader2 as string;
    const pairKey = [l1, l2].sort().join("||");
    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    let l1Wins = Number(r.l1_wins);
    let l2Wins = Number(r.l2_wins);
    let draws = Number(r.draws);

    const reverseRow = matchupRows.find(
      (rr: Record<string, unknown>) => rr.leader1 === l2 && rr.leader2 === l1
    );
    if (reverseRow && l1 !== l2) {
      l1Wins += Number(reverseRow.l2_wins);
      l2Wins += Number(reverseRow.l1_wins);
      draws += Number(reverseRow.draws);
    }

    const total = l1Wins + l2Wins + draws;
    const totalDecisive = l1Wins + l2Wins;
    matchups.push({
      leader1: l1,
      leader2: l2,
      leader1Wins: l1Wins,
      leader2Wins: l2Wins,
      draws,
      total,
      leader1WinRate: totalDecisive > 0 ? Math.round((l1Wins / totalDecisive) * 1000) / 10 : 50,
    });
  }
  matchups.sort((a, b) => b.total - a.total);

  return { decks, matchups, totalDecklists, totalTournaments, uniqueLeaders };
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
