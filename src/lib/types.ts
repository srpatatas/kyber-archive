export type Aspect = "Vigilance" | "Command" | "Aggression" | "Cunning" | "Villainy" | "Heroism";

export type Faction = "jedi-order" | "rebel-alliance" | "sith-order" | "galactic-empire";

export type ForceSide = "light" | "dark";

export interface FactionInfo {
  id: Faction;
  name: string;
  side: ForceSide;
  path: "force" | "military";
  tiers: FactionTier[];
}

export interface FactionTier {
  name: string;
  minRating: number;
}

export interface Player {
  id: string;
  name: string;
  country: string;
  midichlorianIndex: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  peakRating: number;
  favoriteAspect: Aspect;
  faction: Faction;
  tournamentWins: number;
  lastActive: string;
}
