import { Faction, FactionInfo } from "./types";

export const factions: Record<Faction, FactionInfo> = {
  "jedi-order": {
    id: "jedi-order",
    name: "Jedi Order",
    side: "light",
    path: "force",
    tiers: [
      { name: "Grand Master", minRating: 3200 },
      { name: "Jedi Master", minRating: 2700 },
      { name: "Jedi Knight", minRating: 1900 },
      { name: "Padawan", minRating: 1650 },
      { name: "Youngling", minRating: 0 },
    ],
  },
  "rebel-alliance": {
    id: "rebel-alliance",
    name: "Rebel Alliance",
    side: "light",
    path: "military",
    tiers: [
      { name: "General", minRating: 3200 },
      { name: "Commander", minRating: 2700 },
      { name: "Lieutenant", minRating: 1900 },
      { name: "Operative", minRating: 1650 },
      { name: "Recruit", minRating: 0 },
    ],
  },
  "sith-order": {
    id: "sith-order",
    name: "Sith Order",
    side: "dark",
    path: "force",
    tiers: [
      { name: "Sith Lord", minRating: 3200 },
      { name: "Darth", minRating: 2700 },
      { name: "Sith Warrior", minRating: 1900 },
      { name: "Apprentice", minRating: 1650 },
      { name: "Acolyte", minRating: 0 },
    ],
  },
  "galactic-empire": {
    id: "galactic-empire",
    name: "Galactic Empire",
    side: "dark",
    path: "military",
    tiers: [
      { name: "Grand Admiral", minRating: 3200 },
      { name: "Grand Moff", minRating: 2700 },
      { name: "Captain", minRating: 1900 },
      { name: "Trooper", minRating: 1650 },
      { name: "Cadet", minRating: 0 },
    ],
  },
};
