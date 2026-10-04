import { getManagedTeams } from "@/lib/store";
import { SeasonalTeams } from "@/components/seasonal-teams";
import { SEASON_RANGES } from "@/lib/seasons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams | The Kyber Archive",
};

export default async function TeamsPage() {
  const [year2, year1, year0, allTime] = await Promise.all(
    (["year2", "year1", "year0", "allTime"] as const).map((s) =>
      getManagedTeams(SEASON_RANGES[s].start, SEASON_RANGES[s].end)
    )
  );

  return (
    <main className="flex-1">
      <SeasonalTeams teamsBySeason={{ year2, year1, year0, allTime }} />
    </main>
  );
}
