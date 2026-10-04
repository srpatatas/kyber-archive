export type Season = "year2" | "year1" | "year0" | "allTime";

export const SEASON_RANGES: Record<Season, { start: string; end: string }> = {
  year2: { start: "2026-07-28", end: "2027-07-28" },
  year1: { start: "2025-07-28", end: "2026-07-28" },
  year0: { start: "2000-01-01", end: "2025-07-28" },
  allTime: { start: "2000-01-01", end: "2100-01-01" },
};

export const SEASON_TABS: { key: Season; label: string; sublabel: string }[] = [
  { key: "year2", label: "Year 2", sublabel: "Jul 2026 – Present" },
  { key: "year1", label: "Year 1", sublabel: "Jul 2025 – Jul 2026" },
  { key: "year0", label: "Year 0", sublabel: "Jun 2025 – Jul 2025" },
  { key: "allTime", label: "All-Time", sublabel: "All Tournaments" },
];

export function isSeason(value: unknown): value is Season {
  return value === "year2" || value === "year1" || value === "year0" || value === "allTime";
}

export function seasonOf(date: string): Exclude<Season, "allTime"> {
  if (date >= SEASON_RANGES.year2.start) return "year2";
  if (date >= SEASON_RANGES.year1.start) return "year1";
  return "year0";
}
