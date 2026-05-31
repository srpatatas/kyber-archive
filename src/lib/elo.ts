const DEFAULT_RATING = 1500;

export type EventTier = "minor" | "showdown" | "major" | "planetary" | "sector" | "galactic";

// Base points earned per WIN at each event tier
const WIN_POINTS: Record<EventTier, number> = {
  minor: 6,
  showdown: 6,
  major: 8,
  planetary: 10,
  sector: 12,
  galactic: 15,
};

// Trial of Skill: bonus for beating a higher-rated opponent
const TRIAL_OF_SKILL_BONUS = 2;

const PLACEMENT_BONUSES: Record<EventTier, Record<number, number>> = {
  minor:     { 1: 25, 2: 15, 3: 10, 4: 10, 5: 5,  6: 5,  7: 5,  8: 5  },
  showdown:  { 1: 25, 2: 15, 3: 10, 4: 10, 5: 5,  6: 5,  7: 5,  8: 5  },
  major:     { 1: 40, 2: 30, 3: 20, 4: 20, 5: 10, 6: 10, 7: 10, 8: 10 },
  planetary: { 1: 60, 2: 45, 3: 30, 4: 30, 5: 15, 6: 15, 7: 15, 8: 15 },
  sector:    { 1: 80, 2: 60, 3: 40, 4: 40, 5: 20, 6: 20, 7: 20, 8: 20 },
  galactic:  { 1: 100, 2: 75, 3: 50, 4: 50, 5: 25, 6: 25, 7: 25, 8: 25 },
};

export interface MatchResult {
  player1Id: string;
  player2Id: string;
  player1Wins: number;
  player2Wins: number;
  tournamentId: number;
  tournamentName: string;
  roundName: string;
  date: string;
  eventTier: EventTier;
}

export interface PlacementResult {
  playerId: string;
  tournamentId: number;
  placement: number;
  playerCount?: number;
  eventTier: EventTier;
  date: string;
}

export interface PlayerRating {
  id: string;
  meleeId: number;
  name: string;
  username: string;
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  tournamentCount: number;
  tournamentWins: number;
  top8s: number;
  lastActive: string;
}

export function classifyEvent(tags: string[], name: string, playerCount?: number): EventTier {
  const allText = [...tags, name].map((s) => s.toLowerCase());
  if (allText.some((t) => t.includes("galactic championship"))) return "galactic";
  if (allText.some((t) => t.includes("sector championship"))) return "sector";
  if (allText.some((t) => t.includes("planetary qualifier"))) return "planetary";
  if (allText.some((t) => t.includes("nacional"))) return "major";
  if (allText.some((t) => t.includes("store showdown"))) return "showdown";
  if (allText.some((t) => t.includes("invitacional"))) return "minor";
  if (playerCount != null && playerCount >= 32) return "major";
  if (playerCount != null && playerCount > 12) return "minor";
  return "minor";
}

function computeQualityMultipliers(matches: MatchResult[]): Map<string, Map<number, number>> {
  const stats = new Map<string, Map<number, { wins: number; total: number }>>();

  for (const match of matches) {
    for (const playerId of [match.player1Id, match.player2Id]) {
      if (!stats.has(playerId)) stats.set(playerId, new Map());
      const playerTournaments = stats.get(playerId)!;
      if (!playerTournaments.has(match.tournamentId)) {
        playerTournaments.set(match.tournamentId, { wins: 0, total: 0 });
      }
    }

    const s1 = stats.get(match.player1Id)!.get(match.tournamentId)!;
    const s2 = stats.get(match.player2Id)!.get(match.tournamentId)!;
    s1.total++;
    s2.total++;

    if (match.player1Wins > match.player2Wins) s1.wins++;
    else if (match.player2Wins > match.player1Wins) s2.wins++;
    else { s1.wins += 0.5; s2.wins += 0.5; }
  }

  const multipliers = new Map<string, Map<number, number>>();
  for (const [playerId, tournaments] of stats) {
    const playerMults = new Map<number, number>();
    for (const [tournamentId, record] of tournaments) {
      const winRate = record.total > 0 ? record.wins / record.total : 0.5;
      const multiplier = 0.4 + winRate * 1.2;
      playerMults.set(tournamentId, multiplier);
    }
    multipliers.set(playerId, playerMults);
  }

  return multipliers;
}

export function computeRatings(
  matches: MatchResult[],
  placements: PlacementResult[]
): Map<string, PlayerRating> {
  const ratings = new Map<string, PlayerRating>();
  const qualityMultipliers = computeQualityMultipliers(matches);

  function getOrCreate(id: string): PlayerRating {
    if (!ratings.has(id)) {
      ratings.set(id, {
        id,
        meleeId: 0,
        name: "",
        username: "",
        rating: DEFAULT_RATING,
        peakRating: DEFAULT_RATING,
        wins: 0,
        losses: 0,
        draws: 0,
        streak: 0,
        tournamentCount: 0,
        tournamentWins: 0,
        top8s: 0,
        lastActive: "",
      });
    }
    return ratings.get(id)!;
  }

  for (const match of matches) {
    const p1 = getOrCreate(match.player1Id);
    const p2 = getOrCreate(match.player2Id);

    const q1 = qualityMultipliers.get(match.player1Id)?.get(match.tournamentId) ?? 1;
    const q2 = qualityMultipliers.get(match.player2Id)?.get(match.tournamentId) ?? 1;
    const tier = match.eventTier;

    if (match.player1Wins > match.player2Wins) {
      let pts = Math.round(WIN_POINTS[tier] * q1);
      if (p2.rating > p1.rating) pts += TRIAL_OF_SKILL_BONUS;
      p1.rating += pts;
      p1.wins++;
      p2.losses++;
      p1.streak = p1.streak > 0 ? p1.streak + 1 : 1;
      p2.streak = p2.streak < 0 ? p2.streak - 1 : -1;
    } else if (match.player2Wins > match.player1Wins) {
      let pts = Math.round(WIN_POINTS[tier] * q2);
      if (p1.rating > p2.rating) pts += TRIAL_OF_SKILL_BONUS;
      p2.rating += pts;
      p1.losses++;
      p2.wins++;
      p1.streak = p1.streak < 0 ? p1.streak - 1 : -1;
      p2.streak = p2.streak > 0 ? p2.streak + 1 : 1;
    } else {
      p1.rating += 1;
      p2.rating += 1;
      p1.draws++;
      p2.draws++;
      p1.streak = 0;
      p2.streak = 0;
    }

    p1.peakRating = Math.max(p1.peakRating, p1.rating);
    p2.peakRating = Math.max(p2.peakRating, p2.rating);

    if (match.date > p1.lastActive) p1.lastActive = match.date;
    if (match.date > p2.lastActive) p2.lastActive = match.date;
  }

  // Performance-scaled participation bonus — only awarded above 50% WR
  // Rewards grinding IF you're performing well. Below 50% WR = no bonus.
  const PARTICIPATION_BASE = 5;
  const participationTournaments = new Map<string, Set<number>>();
  for (const match of matches) {
    for (const pid of [match.player1Id, match.player2Id]) {
      if (!participationTournaments.has(pid)) participationTournaments.set(pid, new Set());
      participationTournaments.get(pid)!.add(match.tournamentId);
    }
  }
  for (const [playerId, tournamentIds] of participationTournaments) {
    const player = getOrCreate(playerId);
    for (const tid of tournamentIds) {
      const q = qualityMultipliers.get(playerId)?.get(tid) ?? 1;
      if (q >= 1.0) {
        player.rating += Math.round(PARTICIPATION_BASE * q);
      }
    }
    player.peakRating = Math.max(player.peakRating, player.rating);
  }

  for (const placement of placements) {
    const player = getOrCreate(placement.playerId);
    const hasTopCut = !placement.playerCount || placement.playerCount >= 9;
    if (hasTopCut) {
      const tierBonuses = PLACEMENT_BONUSES[placement.eventTier];
      const bonus = tierBonuses[placement.placement] ?? 0;
      if (bonus > 0) {
        player.rating += bonus;
        player.peakRating = Math.max(player.peakRating, player.rating);
      }
      if (placement.placement <= 8) player.top8s++;
    }
    if (placement.placement === 1) player.tournamentWins++;
  }

  return ratings;
}

const ELO_K = 32;

export function computePureElo(matches: MatchResult[]): Map<string, PlayerRating> {
  const ratings = new Map<string, PlayerRating>();

  function getOrCreate(id: string): PlayerRating {
    if (!ratings.has(id)) {
      ratings.set(id, {
        id, meleeId: 0, name: "", username: "",
        rating: DEFAULT_RATING, peakRating: DEFAULT_RATING,
        wins: 0, losses: 0, draws: 0, streak: 0,
        tournamentCount: 0, tournamentWins: 0, top8s: 0, lastActive: "",
      });
    }
    return ratings.get(id)!;
  }

  for (const match of matches) {
    const p1 = getOrCreate(match.player1Id);
    const p2 = getOrCreate(match.player2Id);

    const e1 = 1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
    const e2 = 1 - e1;

    let s1: number, s2: number;
    if (match.player1Wins > match.player2Wins) {
      s1 = 1; s2 = 0;
      p1.wins++; p2.losses++;
      p1.streak = p1.streak > 0 ? p1.streak + 1 : 1;
      p2.streak = p2.streak < 0 ? p2.streak - 1 : -1;
    } else if (match.player2Wins > match.player1Wins) {
      s1 = 0; s2 = 1;
      p1.losses++; p2.wins++;
      p1.streak = p1.streak < 0 ? p1.streak - 1 : -1;
      p2.streak = p2.streak > 0 ? p2.streak + 1 : 1;
    } else {
      s1 = 0.5; s2 = 0.5;
      p1.draws++; p2.draws++;
      p1.streak = 0; p2.streak = 0;
    }

    p1.rating = Math.round(p1.rating + ELO_K * (s1 - e1));
    p2.rating = Math.round(p2.rating + ELO_K * (s2 - e2));

    p1.peakRating = Math.max(p1.peakRating, p1.rating);
    p2.peakRating = Math.max(p2.peakRating, p2.rating);

    if (match.date > p1.lastActive) p1.lastActive = match.date;
    if (match.date > p2.lastActive) p2.lastActive = match.date;
  }

  return ratings;
}

export function computeEloTrial(matches: MatchResult[]): Map<string, PlayerRating> {
  const ratings = new Map<string, PlayerRating>();

  function getOrCreate(id: string): PlayerRating {
    if (!ratings.has(id)) {
      ratings.set(id, {
        id, meleeId: 0, name: "", username: "",
        rating: DEFAULT_RATING, peakRating: DEFAULT_RATING,
        wins: 0, losses: 0, draws: 0, streak: 0,
        tournamentCount: 0, tournamentWins: 0, top8s: 0, lastActive: "",
      });
    }
    return ratings.get(id)!;
  }

  // Snapshot ratings at the start of each tournament for Trial of Skill checks
  const tournamentSnapshots = new Map<number, Map<string, number>>();
  let currentTournamentId = -1;

  for (const match of matches) {
    if (match.tournamentId !== currentTournamentId) {
      currentTournamentId = match.tournamentId;
      const snapshot = new Map<string, number>();
      for (const [id, p] of ratings) snapshot.set(id, p.rating);
      tournamentSnapshots.set(currentTournamentId, snapshot);
    }

    const p1 = getOrCreate(match.player1Id);
    const p2 = getOrCreate(match.player2Id);

    const snapshot = tournamentSnapshots.get(currentTournamentId)!;
    const p1Snap = snapshot.get(match.player1Id) ?? DEFAULT_RATING;
    const p2Snap = snapshot.get(match.player2Id) ?? DEFAULT_RATING;

    const e1 = 1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
    const e2 = 1 - e1;

    let s1: number, s2: number;
    if (match.player1Wins > match.player2Wins) {
      s1 = 1; s2 = 0;
      p1.wins++; p2.losses++;
      p1.streak = p1.streak > 0 ? p1.streak + 1 : 1;
      p2.streak = p2.streak < 0 ? p2.streak - 1 : -1;
    } else if (match.player2Wins > match.player1Wins) {
      s1 = 0; s2 = 1;
      p1.losses++; p2.wins++;
      p1.streak = p1.streak < 0 ? p1.streak - 1 : -1;
      p2.streak = p2.streak > 0 ? p2.streak + 1 : 1;
    } else {
      s1 = 0.5; s2 = 0.5;
      p1.draws++; p2.draws++;
      p1.streak = 0; p2.streak = 0;
    }

    p1.rating = Math.round(p1.rating + ELO_K * (s1 - e1));
    p2.rating = Math.round(p2.rating + ELO_K * (s2 - e2));

    if (match.player1Wins > match.player2Wins && p2Snap > p1Snap) p1.rating += TRIAL_OF_SKILL_BONUS;
    if (match.player2Wins > match.player1Wins && p1Snap > p2Snap) p2.rating += TRIAL_OF_SKILL_BONUS;

    p1.peakRating = Math.max(p1.peakRating, p1.rating);
    p2.peakRating = Math.max(p2.peakRating, p2.rating);

    if (match.date > p1.lastActive) p1.lastActive = match.date;
    if (match.date > p2.lastActive) p2.lastActive = match.date;
  }

  return ratings;
}

function applyPlacementBonuses(ratings: Map<string, PlayerRating>, placements: PlacementResult[]): void {
  for (const placement of placements) {
    const player = ratings.get(placement.playerId);
    if (!player) continue;
    const hasTopCut = !placement.playerCount || placement.playerCount >= 9;
    if (hasTopCut) {
      const tierBonuses = PLACEMENT_BONUSES[placement.eventTier];
      const bonus = tierBonuses[placement.placement] ?? 0;
      if (bonus > 0) {
        player.rating += bonus;
        player.peakRating = Math.max(player.peakRating, player.rating);
      }
      if (placement.placement <= 8) player.top8s++;
    }
    if (placement.placement === 1) player.tournamentWins++;
  }
}

export function computeEloWithPlacements(matches: MatchResult[], placements: PlacementResult[]): Map<string, PlayerRating> {
  const ratings = computePureElo(matches);
  applyPlacementBonuses(ratings, placements);
  return ratings;
}

export function computeEloTrialWithPlacements(matches: MatchResult[], placements: PlacementResult[]): Map<string, PlayerRating> {
  const ratings = computeEloTrial(matches);
  applyPlacementBonuses(ratings, placements);
  return ratings;
}
