const DEFAULT_RATING = 1500;

export type EventTier = "weekly" | "showdown" | "planetary" | "sector" | "galactic";

const K_FACTORS: Record<EventTier, number> = {
  weekly: 24,
  showdown: 32,
  planetary: 40,
  sector: 48,
  galactic: 56,
};

const PLACEMENT_BONUSES: Record<EventTier, Record<number, number>> = {
  weekly:    { 1: 10, 2: 5,  3: 3,  4: 3  },
  showdown:  { 1: 25, 2: 15, 3: 10, 4: 10, 5: 5,  6: 5,  7: 5,  8: 5  },
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

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function classifyEvent(tags: string[], name: string, playerCount?: number): EventTier {
  const allText = [...tags, name].map((s) => s.toLowerCase());
  if (allText.some((t) => t.includes("galactic championship"))) return "galactic";
  if (allText.some((t) => t.includes("sector championship"))) return "sector";
  if (allText.some((t) => t.includes("planetary qualifier"))) return "planetary";
  if (allText.some((t) => t.includes("nacional"))) return "planetary";
  if (allText.some((t) => t.includes("store showdown") || t.includes("invitacional"))) {
    return playerCount != null && playerCount < 12 ? "weekly" : "showdown";
  }
  return "weekly";
}

export function computeRatings(
  matches: MatchResult[],
  placements: PlacementResult[]
): Map<string, PlayerRating> {
  const ratings = new Map<string, PlayerRating>();

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

    const k = K_FACTORS[match.eventTier];
    const e1 = expectedScore(p1.rating, p2.rating);
    const e2 = expectedScore(p2.rating, p1.rating);

    let s1: number;
    let s2: number;

    if (match.player1Wins > match.player2Wins) {
      s1 = 1;
      s2 = 0;
      p1.wins++;
      p2.losses++;
      p1.streak = p1.streak > 0 ? p1.streak + 1 : 1;
      p2.streak = p2.streak < 0 ? p2.streak - 1 : -1;
    } else if (match.player2Wins > match.player1Wins) {
      s1 = 0;
      s2 = 1;
      p1.losses++;
      p2.wins++;
      p1.streak = p1.streak < 0 ? p1.streak - 1 : -1;
      p2.streak = p2.streak > 0 ? p2.streak + 1 : 1;
    } else {
      s1 = 0.5;
      s2 = 0.5;
      p1.draws++;
      p2.draws++;
      p1.streak = 0;
      p2.streak = 0;
    }

    p1.rating = Math.round(p1.rating + k * (s1 - e1));
    p2.rating = Math.round(p2.rating + k * (s2 - e2));

    p1.peakRating = Math.max(p1.peakRating, p1.rating);
    p2.peakRating = Math.max(p2.peakRating, p2.rating);

    if (match.date > p1.lastActive) p1.lastActive = match.date;
    if (match.date > p2.lastActive) p2.lastActive = match.date;
  }

  for (const placement of placements) {
    const player = getOrCreate(placement.playerId);
    const tierBonuses = PLACEMENT_BONUSES[placement.eventTier];
    const bonus = tierBonuses[placement.placement] ?? 0;
    if (bonus > 0) {
      player.rating += bonus;
      player.peakRating = Math.max(player.peakRating, player.rating);
    }
    if (placement.placement <= 8) player.top8s++;
    if (placement.placement === 1) player.tournamentWins++;
  }

  return ratings;
}
