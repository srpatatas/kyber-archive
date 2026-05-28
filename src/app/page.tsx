import { players, getWinRate } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default function Home() {
  const topPlayer = players[0];
  const avgRating = Math.round(
    players.reduce((sum, p) => sum + p.midichlorianIndex, 0) / players.length
  );
  const totalGames = players.reduce(
    (sum, p) => sum + p.wins + p.losses + p.draws,
    0
  );
  const longestStreak = players.reduce(
    (max, p) => (p.streak > max ? p.streak : max),
    0
  );

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold glow-pulse" />
            Season 4 &mdash; A Lawless Time
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Competitive Rankings
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            The Midichlorian Index measures player strength across sanctioned
            Star Wars: Unlimited tournaments. Higher ratings indicate stronger
            Force sensitivity.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Top Rated"
              value={topPlayer.midichlorianIndex.toLocaleString()}
              subtext={topPlayer.name}
            />
            <StatCard
              label="Avg Rating"
              value={avgRating.toLocaleString()}
              subtext="Across all ranked players"
            />
            <StatCard
              label="Total Games"
              value={totalGames.toLocaleString()}
              subtext="This season"
            />
            <StatCard
              label="Best Streak"
              value={`W${longestStreak}`}
              subtext="Current hot streak"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <LeaderboardTable players={players} />
      </section>
    </main>
  );
}
