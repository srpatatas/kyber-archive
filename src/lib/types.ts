export type Faction = "jedi-order" | "rebel-alliance" | "sith-order" | "galactic-empire";

export type ForceSide = "light" | "dark";

export interface FactionInfo {
  id: Faction;
  name: string;
  side: ForceSide;
  path: "force" | "military";
  tiers: { name: string; minRating: number }[];
}
