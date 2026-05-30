import { EventTier } from "./elo";

export const TIER_CONFIG: Record<EventTier, {
  label: string;
  color: string;
  dot: string;
  crystalColor: string;
}> = {
  padawan:  { label: "Padawan",   color: "text-muted",       dot: "bg-muted",       crystalColor: "#a0a0a0" },
  minor:    { label: "Minor",     color: "text-emerald-400", dot: "bg-emerald-400", crystalColor: "#34d399" },
  showdown: { label: "Showdown",  color: "text-sky-400",     dot: "bg-sky-400",     crystalColor: "#60cdff" },
  planetary:{ label: "Planetary", color: "text-gold",        dot: "bg-gold",        crystalColor: "#d4a017" },
  sector:   { label: "Sector",    color: "text-orange-400",  dot: "bg-orange-400",  crystalColor: "#f97316" },
  galactic: { label: "Galactic",  color: "text-red-400",     dot: "bg-red-400",     crystalColor: "#ef4444" },
};

export function getTierConfig(tier: string) {
  return TIER_CONFIG[tier as EventTier] ?? TIER_CONFIG.padawan;
}
