import { getMetaStats } from "@/lib/meta";
import { MetaOverview } from "@/components/meta-overview";
import { MatchupMatrix } from "@/components/matchup-matrix";
import { StatCard } from "@/components/stat-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metagame | The Kyber Archive",
};

export default async function MetaPage() {
  const stats = await getMetaStats();
  const topDeck = stats.decks[0];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Metagame</h1>
          <p className="text-xs text-muted">
            {stats.totalDecklists} decklists across {stats.totalTournaments} tournaments
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <StatCard label="Decks Analizados" value={stats.totalDecklists} />
          <StatCard label="Líderes Únicos" value={stats.uniqueLeaders} />
          <StatCard label="Arquetipos" value={stats.decks.length} />
          <StatCard
            label="Más Popular"
            value={topDeck?.leader?.split(",")[0] ?? "-"}
            subtext={topDeck ? `${topDeck.playRate}% del meta` : undefined}
          />
        </div>

        <MetaOverview decks={stats.decks} />

        <MatchupMatrix matchups={stats.matchups} />
      </div>
    </main>
  );
}
