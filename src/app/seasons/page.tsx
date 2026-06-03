export const dynamic = "force-dynamic";

import { getSeasonLeaderboard, getLeaderboard, getIngestedTournaments } from "@/lib/store";
import { SeasonsComparison } from "@/components/seasons-comparison";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Season Split Comparison | The Kyber Archive",
};

const GC_Y0_END = "2025-07-28";
const GC_Y1_START = "2025-07-28";
const GC_Y1_END = "2026-07-28";

const NAC_Y0_END = "2025-12-01";
const NAC_Y1_START = "2025-12-01";
const NAC_Y1_END = "2026-12-01";

const CAL_Y0_END = "2026-01-01";
const CAL_Y1_START = "2026-01-01";
const CAL_Y1_END = "2027-01-01";

const EARLIEST = "2000-01-01";

export default async function SeasonsPage() {
  const [
    gcYear1, gcYear0, allTime, tournaments,
    nacYear1, nacYear0,
    calYear1, calYear0,
  ] = await Promise.all([
    getSeasonLeaderboard(GC_Y1_START, GC_Y1_END, 1),
    getSeasonLeaderboard(EARLIEST, GC_Y0_END, 1),
    getLeaderboard(),
    getIngestedTournaments(),
    getSeasonLeaderboard(NAC_Y1_START, NAC_Y1_END, 1),
    getSeasonLeaderboard(EARLIEST, NAC_Y0_END, 1),
    getSeasonLeaderboard(CAL_Y1_START, CAL_Y1_END, 1),
    getSeasonLeaderboard(EARLIEST, CAL_Y0_END, 1),
  ]);

  const gcY1Count = tournaments.filter((t) => t.date >= GC_Y1_START && t.date < GC_Y1_END).length;
  const gcY0Count = tournaments.filter((t) => t.date < GC_Y0_END).length;
  const nacY1Count = tournaments.filter((t) => t.date >= NAC_Y1_START && t.date < NAC_Y1_END).length;
  const nacY0Count = tournaments.filter((t) => t.date < NAC_Y0_END).length;
  const calY1Count = tournaments.filter((t) => t.date >= CAL_Y1_START && t.date < CAL_Y1_END).length;
  const calY0Count = tournaments.filter((t) => t.date < CAL_Y0_END).length;

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-1 text-xs font-medium text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Experimental
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Season Split Comparison
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Compare three ways to split competitive seasons. <strong className="text-gold">Galactic</strong> splits
            at the Galactic Championship (Jul 28). <strong className="text-emerald-400">Nacional</strong> splits
            at the Primer Nacional Top Toys (Dec 1). <strong className="text-sky-400">Calendar</strong> splits
            by calendar year. Same ELO system, different season boundaries.
          </p>
          <div className="mt-4">
            <Link href="/" className="text-sm text-gold hover:underline">
              &larr; Back to The Kyber Archive
            </Link>
          </div>
        </div>
      </section>

      <SeasonsComparison
        gc={{ year1: gcYear1, year0: gcYear0, allTime, counts: { year1: gcY1Count, year0: gcY0Count, allTime: tournaments.length } }}
        nac={{ year1: nacYear1, year0: nacYear0, allTime, counts: { year1: nacY1Count, year0: nacY0Count, allTime: tournaments.length } }}
        cal={{ year1: calYear1, year0: calYear0, allTime, counts: { year1: calY1Count, year0: calY0Count, allTime: tournaments.length } }}
      />
    </main>
  );
}
