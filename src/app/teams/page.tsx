export const dynamic = "force-dynamic";

import { getTeams, Team } from "@/lib/store";
import { SeasonalTeams } from "@/components/seasonal-teams";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams | The Midichlorian Index",
};

const YEAR_1_START = "2025-07-28";
const YEAR_1_END = "2026-07-28";
const YEAR_0_END = "2025-07-28";
const YEAR_0_START = "2000-01-01";

export default async function TeamsPage() {
  const [year1, year0, allTime] = await Promise.all([
    getTeams(YEAR_1_START, YEAR_1_END),
    getTeams(YEAR_0_START, YEAR_0_END, 1),
    getTeams(),
  ]);

  return (
    <main className="flex-1">
      <SeasonalTeams year1={year1} year0={year0} allTime={allTime} />
    </main>
  );
}
