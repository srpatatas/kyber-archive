import { notFound } from "next/navigation";
import Link from "next/link";
import { getTournamentDetail } from "@/lib/store";
import { getTierConfig } from "@/lib/tiers";
import { KyberCrystal } from "@/components/kyber-crystal";
import { BracketView } from "@/components/bracket-view";
import { TournamentRounds } from "@/components/tournament-rounds";

export function generateStaticParams() {
  const { getIngestedTournaments } = require("@/lib/store");
  const tournaments = getIngestedTournaments();
  return tournaments.map((t: { id: number }) => ({ id: String(t.id) }));
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = getTournamentDetail(parseInt(id, 10));
  if (!data) notFound();

  const tier = getTierConfig(data.eventTier);
  const tierColor = tier.crystalColor;
  const topCutSize = data.topCutSize ?? 8;
  const topCut = data.standings.filter((s) => s.rank <= topCutSize);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/tournaments"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-gold transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Tournaments
        </Link>

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className={`h-2 ${
            data.eventTier === "planetary" || data.eventTier === "galactic"
              ? "bg-gradient-to-r from-gold via-gold-light to-gold"
              : data.eventTier === "sector"
                ? "bg-gradient-to-r from-orange-500 to-orange-500/40"
                : "bg-gradient-to-r from-sky-500 to-sky-500/40"
          }`} />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{data.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted">{data.organizationName}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">
                    {new Date(data.date).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                  <span className="text-muted">·</span>
                  <span className={`font-medium ${tier.color}`}>{tier.label}</span>
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gold">{data.playerCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Players</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{data.matchCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Matches</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{data.rounds.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Rounds</p>
                </div>
              </div>
            </div>

            {topCut.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">Top {topCutSize}</h2>

                {topCut[0] && (
                  <Link
                    href={`/player/${topCut[0].playerId}`}
                    className="group relative block rounded-xl border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-5 hover:border-gold/50 transition-colors overflow-hidden mb-3"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
                    <div className="flex items-center gap-4">
                      <div className="flex shrink-0 items-center justify-center">
                        <KyberCrystal color={tierColor} tier={data.eventTier} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-gold">Champion</p>
                        <p className="text-xl font-bold text-foreground group-hover:text-gold transition-colors truncate">
                          {topCut[0].username}
                        </p>
                        <p className="text-sm tabular-nums text-muted mt-0.5">
                          {topCut[0].matchWins}-{topCut[0].matchLosses}-{topCut[0].matchDraws}
                        </p>
                        {topCut[0].leader && (
                          <p className="text-sm text-sand mt-1">{topCut[0].leader}</p>
                        )}
                        {topCut[0].base && (
                          <p className="text-xs text-muted">{topCut[0].base}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mb-3">
                  {topCut.slice(1, 4).map((s) => (
                    <Link
                      key={s.playerId}
                      href={`/player/${s.playerId}`}
                      className={`group relative rounded-lg border p-4 hover:border-gold/30 transition-colors overflow-hidden ${
                        s.rank === 2
                          ? "border-sand/20 bg-gradient-to-b from-sand/5 to-transparent"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                        s.rank === 2 ? "bg-sand" : "bg-amber-700/50"
                      }`} />
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${
                        s.rank === 2 ? "text-sand-light" : "text-amber-600"
                      }`}>
                        {s.rank === 2 ? "Finalist" : `Top ${s.rank}`}
                      </p>
                      <p className="mt-1 font-bold text-foreground group-hover:text-gold transition-colors truncate">
                        {s.username}
                      </p>
                      <p className="text-xs tabular-nums text-muted mt-0.5">
                        {s.matchWins}-{s.matchLosses}-{s.matchDraws}
                      </p>
                      {s.leader && (
                        <p className="truncate text-xs text-sand mt-1">{s.leader}</p>
                      )}
                      {s.base && (
                        <p className="truncate text-[10px] text-muted">{s.base}</p>
                      )}
                    </Link>
                  ))}
                </div>

                {topCut.length > 4 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {topCut.slice(4).map((s) => (
                      <Link
                        key={s.playerId}
                        href={`/player/${s.playerId}`}
                        className="group rounded-lg border border-border bg-background p-3 hover:border-gold/30 transition-colors"
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                          Top {s.rank}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-foreground group-hover:text-gold transition-colors truncate">
                          {s.username}
                        </p>
                        <span className="text-xs tabular-nums text-muted">
                          {s.matchWins}-{s.matchLosses}-{s.matchDraws}
                        </span>
                        {s.leader && (
                          <p className="truncate text-[10px] text-sand mt-0.5">{s.leader}</p>
                        )}
                        {s.base && (
                          <p className="truncate text-[10px] text-muted">{s.base}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <BracketView rounds={data.rounds} tierColor={tierColor} />

            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3">
                Full Standings ({data.standings.length} players)
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted w-12">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Player</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Leader</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.standings.map((s) => (
                      <tr key={s.playerId} className="hover:bg-surface-light/50 transition-colors">
                        <td className="px-3 py-2 tabular-nums text-muted">{s.rank}</td>
                        <td className="px-3 py-2">
                          <Link href={`/player/${s.playerId}`} className="hover:text-gold transition-colors">
                            <span className="font-medium">{s.username}</span>
                            <span className="ml-2 text-xs text-muted">{s.name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-sand">
                          {s.leader ? (
                            <span title={s.base ? `${s.leader} - ${s.base}` : s.leader}>
                              {s.leader}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          <span className="text-emerald-400">{s.matchWins}</span>
                          <span className="text-muted">-</span>
                          <span className="text-red-400">{s.matchLosses}</span>
                          {s.matchDraws > 0 && (
                            <>
                              <span className="text-muted">-</span>
                              <span className="text-muted">{s.matchDraws}</span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <TournamentRounds rounds={data.rounds} />

            <p className="mt-6 text-xs text-muted">
              <a
                href={`https://melee.gg/Tournament/View/${data.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gold transition-colors"
              >
                View on melee.gg
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
