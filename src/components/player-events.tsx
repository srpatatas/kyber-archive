"use client";

import Link from "next/link";
import { PlayerTournament } from "@/lib/store";
import { getTierConfig } from "@/lib/tiers";

export function PlayerEvents({ tournaments }: { tournaments: PlayerTournament[] }) {
  if (tournaments.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">
        Tournament History
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Event</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Date</th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Tier</th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Record</th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Placement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {tournaments.map((t) => {
              const tierCfg = getTierConfig(t.eventTier);
              const total = t.wins + t.losses + t.draws;
              const wr = total > 0 ? Math.round((t.wins / total) * 100) : 0;
              return (
                <tr key={t.id} className="hover:bg-surface-light/50 transition-colors">
                  <td className="px-3 py-2">
                    <Link
                      href={`/tournament/${t.id}`}
                      className="font-medium text-foreground hover:text-gold transition-colors"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-medium ${tierCfg.color}`}>
                      {tierCfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="tabular-nums">
                      <span className="text-emerald-400">{t.wins}</span>
                      <span className="text-muted">-</span>
                      <span className="text-red-400">{t.losses}</span>
                      {t.draws > 0 && (
                        <>
                          <span className="text-muted">-</span>
                          <span className="text-muted">{t.draws}</span>
                        </>
                      )}
                    </span>
                    <span className="ml-1.5 text-[10px] text-muted">({wr}%)</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {t.placement ? (
                      <span className="text-xs font-bold text-gold">Top {t.placement}</span>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
