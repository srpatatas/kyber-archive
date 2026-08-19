"use client";

import { useState } from "react";
import Link from "next/link";
import { KyberCrystal } from "@/components/kyber-crystal";
import { getTierConfig } from "@/lib/tiers";
import type { Team, TeamH2H } from "@/lib/store";

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

function H2HDetail({ h2h }: { h2h: TeamH2H }) {
  const [open, setOpen] = useState(false);
  const total = h2h.wins + h2h.losses + h2h.draws;
  const wr = total > 0 ? Math.round((h2h.wins / total) * 100) : 0;
  const borderColor = h2h.wins > h2h.losses ? "border-emerald-500/20" : h2h.wins < h2h.losses ? "border-red-500/20" : "border-border";
  const bgColor = h2h.wins > h2h.losses ? "bg-emerald-500/5" : h2h.wins < h2h.losses ? "bg-red-500/5" : "bg-background";
  const textColor = h2h.wins > h2h.losses ? "text-emerald-400" : h2h.wins < h2h.losses ? "text-red-400" : "text-foreground";

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-light/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">vs {h2h.opponentTag}</span>
          <span className={`text-sm font-bold tabular-nums ${textColor}`}>
            {h2h.wins}W-{h2h.losses}L{h2h.draws > 0 ? `-${h2h.draws}D` : ""} ({wr}%)
          </span>
        </div>
        <span className={`text-xs text-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="border-t border-border/30 px-3 py-2">
          <table className="w-full">
            <tbody className="divide-y divide-border/20">
              {h2h.matches.map((m, i) => {
                const won = m.playerWins > m.opponentWins;
                const lost = m.opponentWins > m.playerWins;
                const resultColor = won ? "text-emerald-400" : lost ? "text-red-400" : "text-muted";
                const resultLabel = won ? "W" : lost ? "L" : "D";
                return (
                  <tr key={i}>
                    <td className={`py-1 pr-2 text-xs font-bold ${resultColor}`}>{resultLabel}</td>
                    <td className="py-1 pr-2 text-xs text-foreground">{m.player}</td>
                    <td className="py-1 pr-2 text-xs tabular-nums text-muted">{m.playerWins}-{m.opponentWins}</td>
                    <td className="py-1 pr-2 text-xs text-foreground">{m.opponent}</td>
                    <td className="py-1 text-xs text-muted truncate max-w-[150px]">{m.tournament} · {m.round}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TeamsContent({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="text-lg font-medium text-foreground">No teams yet</p>
        <p className="mt-2 text-sm text-muted">
          Teams are managed by the admin. Once teams are created and members
          added, standings will appear here.
        </p>
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
                  <a href={`#${team.tag}`} className="group flex items-center gap-3">
                    {team.avatarUrl && (
                      <img src={team.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover border border-border" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-gold/10 px-1.5 py-0.5 text-xs font-bold text-gold">{team.tag}</span>
                        <p className="text-lg font-bold text-foreground group-hover:text-gold transition-colors">{team.displayName}</p>
                      </div>
                      <p className="text-xs text-muted">{team.members.length} members</p>
                    </div>
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
      {teams.length > 1 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="text-lg font-bold text-foreground">Head-to-Head</h3>
          <p className="mt-1 text-xs text-muted">Inter-team match records during active membership periods</p>
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
      )}

      {/* Team Details */}
      {teams.map((team) => (
        <div key={team.tag} id={team.tag} className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {team.avatarUrl && (
                <img src={team.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover border border-border" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gold/10 px-1.5 py-0.5 text-xs font-bold text-gold">{team.tag}</span>
                  <h3 className="text-xl font-bold text-foreground">{team.displayName}</h3>
                </div>
                <p className="text-xs text-muted mt-1">{team.members.length} members · Avg rating {team.avgRating}</p>
              </div>
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
            <div className="mt-4 space-y-2">
              {team.h2h.map((h) => (
                <H2HDetail key={h.opponentTag} h2h={h} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
