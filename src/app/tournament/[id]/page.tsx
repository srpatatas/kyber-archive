"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BracketView } from "@/components/bracket-view";
import { KyberCrystal } from "@/components/kyber-crystal";

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  weekly: { label: "Weekly Play", color: "text-muted" },
  showdown: { label: "Store Showdown", color: "text-sky-400" },
  planetary: { label: "Planetary Qualifier", color: "text-gold" },
  sector: { label: "Sector Championship", color: "text-orange-400" },
  galactic: { label: "Galactic Championship", color: "text-red-400" },
};

interface Standing {
  rank: number;
  playerId: string;
  username: string;
  name: string;
  leader: string | null;
  base: string | null;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
}

interface RoundMatch {
  player1Id: string;
  player1Username: string;
  player1Wins: number;
  player2Id: string;
  player2Username: string;
  player2Wins: number;
}

interface TournamentData {
  id: number;
  name: string;
  organizationName: string;
  date: string;
  eventTier: string;
  playerCount: number;
  matchCount: number;
  standings: Standing[];
  rounds: { name: string; matches: RoundMatch[] }[];
}

export default function TournamentPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openRounds, setOpenRounds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/tournament/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function toggleRound(name: string) {
    setOpenRounds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (loading) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted">Loading...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted">Tournament not found</div>
      </main>
    );
  }

  const tier = TIER_LABELS[data.eventTier] ?? TIER_LABELS.weekly;
  const tierColor = data.eventTier === "galactic" ? "#ef4444"
    : data.eventTier === "sector" ? "#f97316"
    : data.eventTier === "planetary" ? "#d4a017"
    : data.eventTier === "showdown" ? "#60cdff"
    : "#a0a0a0";
  const top8 = data.standings.filter((s) => s.rank <= 8);
  const rest = data.standings.filter((s) => s.rank > 8);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-gold transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Leaderboard
        </Link>

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className={`h-2 ${data.eventTier === "planetary" || data.eventTier === "galactic" ? "bg-gradient-to-r from-gold to-gold/40" : data.eventTier === "sector" ? "bg-gradient-to-r from-orange-500 to-orange-500/40" : "bg-gradient-to-r from-sky-500 to-sky-500/40"}`} />

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

            {top8.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">Top 8</h2>

                {/* Champion */}
                {top8[0] && (
                  <Link
                    href={`/player/${top8[0].playerId}`}
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
                          {top8[0].username}
                        </p>
                        <p className="text-sm tabular-nums text-muted mt-0.5">
                          {top8[0].matchWins}-{top8[0].matchLosses}-{top8[0].matchDraws}
                        </p>
                        {top8[0].leader && (
                          <p className="text-sm text-sand mt-1">{top8[0].leader}</p>
                        )}
                        {top8[0].base && (
                          <p className="text-xs text-muted">{top8[0].base}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )}

                {/* Finalist & Semifinalists */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mb-3">
                  {top8.slice(1, 4).map((s) => (
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

                {/* Quarterfinals (5th-8th) */}
                {top8.length > 4 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {top8.slice(4).map((s) => (
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

            <div className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3">
                Round Results
              </h2>
              <div className="space-y-2">
                {data.rounds.map((round) => (
                  <div key={round.name} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => toggleRound(round.name)}
                      className="flex w-full items-center justify-between bg-surface px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-surface-light transition-colors"
                    >
                      <span>{round.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted">{round.matches.length} matches</span>
                        <svg
                          className={`h-4 w-4 text-muted transition-transform ${openRounds.has(round.name) ? "rotate-180" : ""}`}
                          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                        >
                          <path d="M4 6L8 10L12 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    {openRounds.has(round.name) && (
                      <div className="divide-y divide-border/50">
                        {round.matches.map((m, i) => {
                          const p1Won = m.player1Wins > m.player2Wins;
                          const p2Won = m.player2Wins > m.player1Wins;
                          return (
                            <div key={i} className="flex items-center px-4 py-2 text-sm">
                              <Link
                                href={`/player/${m.player1Id}`}
                                className={`flex-1 text-right truncate hover:text-gold transition-colors ${p1Won ? "font-medium text-foreground" : "text-muted"}`}
                              >
                                {m.player1Username}
                              </Link>
                              <div className="mx-4 flex items-center gap-1.5 tabular-nums">
                                <span className={p1Won ? "text-emerald-400 font-medium" : "text-muted"}>
                                  {m.player1Wins}
                                </span>
                                <span className="text-muted">-</span>
                                <span className={p2Won ? "text-emerald-400 font-medium" : "text-muted"}>
                                  {m.player2Wins}
                                </span>
                              </div>
                              <Link
                                href={`/player/${m.player2Id}`}
                                className={`flex-1 truncate hover:text-gold transition-colors ${p2Won ? "font-medium text-foreground" : "text-muted"}`}
                              >
                                {m.player2Username}
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
