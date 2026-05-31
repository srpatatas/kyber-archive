import { Faction, FactionInfo } from "./types";

export const factions: Record<Faction, FactionInfo> = {
  "jedi-order": {
    id: "jedi-order",
    name: "Jedi Order",
    side: "light",
    path: "force",
    tiers: [
      { name: "Grand Master", minRating: 2700 },
      { name: "Jedi Master", minRating: 2400 },
      { name: "Jedi Knight", minRating: 2000 },
      { name: "Padawan", minRating: 1700 },
      { name: "Youngling", minRating: 0 },
    ],
  },
  "rebel-alliance": {
    id: "rebel-alliance",
    name: "Rebel Alliance",
    side: "light",
    path: "military",
    tiers: [
      { name: "General", minRating: 2700 },
      { name: "Commander", minRating: 2400 },
      { name: "Pathfinder", minRating: 2000 },
      { name: "Trooper", minRating: 1700 },
      { name: "Recruit", minRating: 0 },
    ],
  },
  "sith-order": {
    id: "sith-order",
    name: "Sith Order",
    side: "dark",
    path: "force",
    tiers: [
      { name: "Darth", minRating: 2700 },
      { name: "Sith Lord", minRating: 2400 },
      { name: "Sith Warrior", minRating: 2000 },
      { name: "Apprentice", minRating: 1700 },
      { name: "Acolyte", minRating: 0 },
    ],
  },
  "galactic-empire": {
    id: "galactic-empire",
    name: "Galactic Empire",
    side: "dark",
    path: "military",
    tiers: [
      { name: "Grand Admiral", minRating: 2700 },
      { name: "Grand Moff", minRating: 2400 },
      { name: "Commander", minRating: 2000 },
      { name: "Officer", minRating: 1700 },
      { name: "Cadet", minRating: 0 },
    ],
  },
};
