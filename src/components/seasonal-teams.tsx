"use client";

import { useState } from "react";
import Link from "next/link";
import { KyberCrystal } from "@/components/kyber-crystal";
import { getTierConfig } from "@/lib/tiers";
import type { Team } from "@/lib/store";

type Season = "year1" | "year0" | "allTime";

const TABS: { key: Season; label: string; sublabel: string }[] = [
  { key: "year1", label: "Year 1", sublabel: "Current Season" },
  { key: "year0", label: "Year 0", sublabel: "Jun 2025 – Jul 2025" },
  { key: "allTime", label: "All-Time", sublabel: "All Tournaments" },
];

function TeamWinRate({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws;
  const wr = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-lighter">
        <div className="h-full rounded-full bg-gold" style={{ width: `${wr}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums">{wr}%</span>
    </div>
  );
}

function TeamsContent({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="text-sm text-muted">No teams in this season yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Rankings */}
      <div className="overflow-x-auto rounded-xl border border-border -mx-4 sm:mx-0">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Team</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Avg Rating</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Win Rate</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">W-L-D</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Kybers</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr key={team.tag} className="border-b border-border/50 hover:bg-surface-light/50 transition-colors">
                <td className="px-4 py-3 text-right text-sm tabular-nums text-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <a href={`#${team.tag}`} className="group">
                    <p className="text-lg font-bold text-foreground group-hover:text-gold transition-colors">{team.tag}</p>
                    <p className="text-xs text-muted">{team.members.length} members</p>
                  </a>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-lg font-bold text-gold tabular-nums">{team.avgRating}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <TeamWinRate wins={team.totalWins} losses={team.totalLosses} draws={team.totalDraws} />
                </td>
                <td className="px-4 py-3 text-center text-sm tabular-nums text-muted">
                  {team.totalWins}-{team.totalLosses}-{team.totalDraws}
                </td>
                <td className="px-4 py-3 text-center">
                  {team.totalTournamentWins > 0 ? (
                    <span className="text-sm font-bold text-gold tabular-nums">{team.totalTournamentWins}</span>
                  ) : (
                    <span className="text-sm text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* H2H Matrix */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-lg font-bold text-foreground">Head-to-Head</h3>
        <p className="mt-1 text-xs text-muted">Inter-team match records (wins for row team)</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">vs</th>
                {teams.map((t) => (
                  <th key={t.tag} className="px-3 py-2 text-center text-xs font-bold text-foreground">{t.tag}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.tag} className="border-b border-border/30">
                  <td className="px-3 py-2 text-sm font-bold text-foreground">{team.tag}</td>
                  {teams.map((opp) => {
                    if (team.tag === opp.tag) {
                      return <td key={opp.tag} className="px-3 py-2 text-center text-xs text-muted">—</td>;
                    }
                    const h2h = team.h2h.find((h) => h.opponentTag === opp.tag);
                    if (!h2h || (h2h.wins + h2h.losses + h2h.draws === 0)) {
                      return <td key={opp.tag} className="px-3 py-2 text-center text-xs text-muted">-</td>;
                    }
                    const color = h2h.wins > h2h.losses ? "text-emerald-400" : h2h.wins < h2h.losses ? "text-red-400" : "text-foreground";
                    return (
                      <td key={opp.tag} className="px-3 py-2 text-center">
                        <span className={`text-sm font-bold tabular-nums ${color}`}>
                          {h2h.wins}-{h2h.losses}
                        </span>
                        {h2h.draws > 0 && <span className="text-xs text-muted">-{h2h.draws}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Details */}
      {teams.map((team) => (
        <div key={team.tag} id={team.tag} className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{team.tag}</h3>
              <p className="text-xs text-muted">{team.members.length} members · Avg rating {team.avgRating}</p>
            </div>
            {team.totalTournamentWins > 0 && (
              <div className="flex items-center gap-1">
                {team.members.flatMap((m) =>
                  m.titleTiers.map((tier, i) => (
                    <KyberCrystal key={`${m.id}-${i}`} color={getTierConfig(tier).crystalColor} tier={tier} size="sm" />
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pb-2 pr-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Player</th>
                  <th className="pb-2 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Rating</th>
                  <th className="pb-2 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted">Rank</th>
                  <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">W-L-D</th>
                  <th className="pb-2 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Events</th>
                  <th className="pb-2 pl-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Kybers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {team.members.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/player/${m.id}`} className="font-medium text-foreground hover:text-gold transition-colors">
                        {m.username}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-gold tabular-nums">{m.rating}</td>
                    <td className="py-2 px-3 text-right text-sm tabular-nums text-muted">#{m.rank}</td>
                    <td className="py-2 px-3 text-center text-xs tabular-nums text-muted">{m.wins}-{m.losses}-{m.draws}</td>
                    <td className="py-2 px-3 text-center text-xs tabular-nums text-muted">{m.tournamentCount}</td>
                    <td className="py-2 pl-3 text-center">
                      {m.tournamentWins > 0 ? (
                        <span className="text-xs font-bold text-gold tabular-nums">{m.tournamentWins}</span>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {team.h2h.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {team.h2h.map((h) => {
                const total = h.wins + h.losses + h.draws;
                const wr = Math.round((h.wins / total) * 100);
                const color = h.wins > h.losses ? "border-emerald-500/20 bg-emerald-500/5" : h.wins < h.losses ? "border-red-500/20 bg-red-500/5" : "border-border bg-background";
                const textColor = h.wins > h.losses ? "text-emerald-400" : h.wins < h.losses ? "text-red-400" : "text-foreground";
                return (
                  <div key={h.opponentTag} className={`rounded-lg border p-3 ${color}`}>
                    <p className="text-xs text-muted">vs {h.opponentTag}</p>
                    <p className={`text-sm font-bold tabular-nums ${textColor}`}>
                      {h.wins}W-{h.losses}L{h.draws > 0 ? `-${h.draws}D` : ""} ({wr}%)
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SeasonalTeams({
  year1,
  year0,
  allTime,
}: {
  year1: Team[];
  year0: Team[];
  allTime: Team[];
}) {
  const [season, setSeason] = useState<Season>("year1");

  const data = { year1, year0, allTime };
  const teams = data[season];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold glow-pulse" />
            {teams.length} teams
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Teams
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Team standings based on combined member ratings. Head-to-head
            records between teams for bragging rights.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSeason(tab.key)}
              className={`flex-1 rounded-md px-3 py-2 text-center transition-colors ${
                season === tab.key
                  ? "bg-gold/10 border border-gold/30 text-gold"
                  : "border border-transparent text-muted hover:text-foreground"
              }`}
            >
              <p className="text-sm font-medium">{tab.label}</p>
              <p className="text-[10px] text-muted">{tab.sublabel}</p>
            </button>
          ))}
        </div>

        <TeamsContent teams={teams} />
      </section>
    </>
  );
}
