export const dynamic = "force-dynamic";

import { getSeasonLeaderboard, getLeaderboard, getIngestedTournaments } from "@/lib/store";
import { SeasonalLeaderboard } from "@/components/seasonal-leaderboard";

const YEAR_1_START = "2025-07-28";
const YEAR_1_END = "2026-07-28";
const YEAR_0_END = "2025-07-28";
const YEAR_0_START = "2000-01-01";

export default async function Home() {
  const [year1, year0, allTime, tournaments] = await Promise.all([
    getSeasonLeaderboard(YEAR_1_START, YEAR_1_END),
    getSeasonLeaderboard(YEAR_0_START, YEAR_0_END, 1),
    getLeaderboard(),
    getIngestedTournaments(),
  ]);

  const year1Tournaments = tournaments.filter((t) => t.date >= YEAR_1_START && t.date < YEAR_1_END).length;
  const year0Tournaments = tournaments.filter((t) => t.date < YEAR_0_END).length;

  return (
    <main className="flex-1">
      <SeasonalLeaderboard
        year1={year1}
        year0={year0}
        allTime={allTime}
        tournamentCounts={{ year1: year1Tournaments, year0: year0Tournaments, allTime: tournaments.length }}
      />
    </main>
  );
}
