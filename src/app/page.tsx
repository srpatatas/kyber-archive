import { getLeaderboard, getIngestedTournaments } from "@/lib/store";
import { StatCard } from "@/components/stat-card";
import { LiveLeaderboard } from "@/components/live-leaderboard";


export default function Home() {
  const players = getLeaderboard();
  const tournaments = getIngestedTournaments();

  const topPlayer = players[0] ?? null;
  const avgRating =
    players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length)
      : 0;
  const totalGames = players.reduce(
    (sum, p) => sum + p.wins + p.losses + p.draws,
    0
  );
  const mostTop8s = players.reduce(
    (best, p) => (p.top8s > (best?.top8s ?? 0) ? p : best),
    null as (typeof players)[number] | null
  );

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold glow-pulse" />
            {tournaments.length > 0
              ? `${tournaments.length} tournament${tournaments.length === 1 ? "" : "s"} tracked`
              : "No tournaments ingested yet"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Competitive Rankings
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            The Midichlorian Index measures player strength across sanctioned
            Star Wars: Unlimited tournaments. Higher ratings indicate stronger
            Force sensitivity.
          </p>

          {players.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Top Rated"
                value={topPlayer!.rating.toLocaleString()}
                subtext={topPlayer!.username}
              />
              <StatCard
                label="Avg Rating"
                value={avgRating.toLocaleString()}
                subtext={`Across ${players.length} ranked players`}
              />
              <StatCard
                label="Total Games"
                value={totalGames.toLocaleString()}
                subtext={`From ${tournaments.length} tournament${tournaments.length === 1 ? "" : "s"}`}
              />
              <StatCard
                label="Most Top 8s"
                value={mostTop8s && mostTop8s.top8s > 0 ? mostTop8s.top8s : "-"}
                subtext={mostTop8s && mostTop8s.top8s > 0 ? mostTop8s.username : undefined}
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {players.length > 0 ? (
          <LiveLeaderboard players={players} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <p className="text-lg font-medium text-foreground">
              No rankings yet
            </p>
            <p className="mt-2 text-sm text-muted">
              Head to the{" "}
              <a href="/admin" className="text-gold hover:underline">
                Admin page
              </a>{" "}
              and ingest some melee.gg tournaments to populate the leaderboard.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
