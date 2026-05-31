import { getEloLeaderboard } from "@/lib/store";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rating Comparison | The Midichlorian Index",
};

export default async function EloPage() {
  const players = await getEloLeaderboard();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/5 px-3 py-1 text-xs font-medium text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Experimental
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Rating System Comparison
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Four ranking systems side by side. <strong className="text-gold">MI</strong> is the
            progressive scoring (only goes up). <strong className="text-sky-400">ELO</strong> is
            pure skill rating (goes up and down). <strong className="text-emerald-400">ELO+Tier</strong> adds
            placement bonuses. <strong className="text-purple-400">ELO+T+ToS</strong> adds
            Trial of Skill (+2 for beating higher-rated opponents).
          </p>
          <div className="mt-4">
            <Link href="/" className="text-sm text-gold hover:underline">
              &larr; Back to Midichlorian Index
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="overflow-x-auto rounded-xl border border-border -mx-4 sm:mx-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">#</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Player</th>
                <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">W-L-D</th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Win%</th>
                <th className="px-3 py-3 text-center border-l border-border/50">
                  <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">ELO+Tier</span>
                </th>
                <th className="px-3 py-3 text-center border-l border-border/50">
                  <span className="text-xs font-medium uppercase tracking-wider text-gold">MI</span>
                </th>
                <th className="px-3 py-3 text-center border-l border-border/50">
                  <span className="text-xs font-medium uppercase tracking-wider text-sky-400">ELO</span>
                </th>
                <th className="px-3 py-3 text-center border-l border-border/50">
                  <span className="text-xs font-medium uppercase tracking-wider text-purple-400">ELO+T+ToS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const total = p.wins + p.losses + p.draws;
                const wr = total > 0 ? Math.round((p.wins / total) * 1000) / 10 : 0;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface-light/50 transition-colors">
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-muted">{p.eloTierRank}</td>
                    <td className="px-3 py-3">
                      <Link href={`/player/${p.id}`} className="group">
                        <p className="font-medium text-foreground group-hover:text-gold transition-colors">
                          {p.username}
                        </p>
                        <p className="text-[10px] text-muted">{p.tournamentCount} events</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center text-xs tabular-nums text-muted">
                      {p.wins}-{p.losses}-{p.draws}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums">{wr}%</td>
                    <td className="px-3 py-3 border-l border-border/50">
                      <div className="text-center">
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">{p.eloTierRating}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-l border-border/50">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-bold text-gold tabular-nums">#{p.miRank}</span>
                        <RankDiff current={p.miRank} baseline={p.eloTierRank} />
                      </div>
                      <p className="text-[10px] text-muted tabular-nums text-center">{p.miRating}</p>
                    </td>
                    <td className="px-3 py-3 border-l border-border/50">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-bold text-sky-400 tabular-nums">#{p.eloRank}</span>
                        <RankDiff current={p.eloRank} baseline={p.eloTierRank} />
                      </div>
                      <p className="text-[10px] text-muted tabular-nums text-center">{p.eloRating}</p>
                    </td>
                    <td className="px-3 py-3 border-l border-border/50">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-sm font-bold text-purple-400 tabular-nums">#{p.eloTierTrialRank}</span>
                        <RankDiff current={p.eloTierTrialRank} baseline={p.eloTierRank} />
                      </div>
                      <p className="text-[10px] text-muted tabular-nums text-center">{p.eloTierTrialRating}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function RankDiff({ current, baseline }: { current: number; baseline: number }) {
  if (baseline === 0) return null;
  const diff = baseline - current;
  if (diff > 0) return <span className="text-[10px] font-medium text-green-400 tabular-nums">+{diff}</span>;
  if (diff < 0) return <span className="text-[10px] font-medium text-red-400 tabular-nums">{diff}</span>;
  return <span className="text-[10px] text-muted">=</span>;
}
