"use client";

import { useState } from "react";
import { ASPECT_COLORS } from "@/lib/aspects";
import { getLeaderImageUrl } from "@/lib/card-images";

interface DeckStats {
  leader: string;
  baseDisplay: string;
  aspects: string[];
  count: number;
  playRate: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalEntries: number;
  topCutEntries: number;
  conversionRate: number;
}

type Tab = "popularity" | "winrate" | "topcut";

const TABS: { key: Tab; label: string }[] = [
  { key: "popularity", label: "Popularidad" },
  { key: "winrate", label: "Win Rate" },
  { key: "topcut", label: "Top Cut" },
];

export function MetaOverview({ decks }: { decks: DeckStats[] }) {
  const [tab, setTab] = useState<Tab>("popularity");
  const [minGames, setMinGames] = useState(3);

  const sorted = [...decks];
  if (tab === "winrate") {
    sorted.sort((a, b) => {
      const aGames = a.wins + a.losses + a.draws;
      const bGames = b.wins + b.losses + b.draws;
      if (aGames < minGames && bGames >= minGames) return 1;
      if (bGames < minGames && aGames >= minGames) return -1;
      return b.winRate - a.winRate || bGames - aGames;
    });
  } else if (tab === "topcut") {
    sorted.sort((a, b) => {
      if (a.totalEntries < minGames && b.totalEntries >= minGames) return 1;
      if (b.totalEntries < minGames && a.totalEntries >= minGames) return -1;
      return b.conversionRate - a.conversionRate || b.totalEntries - a.totalEntries;
    });
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden mb-6">
      <div className="flex border-b border-border bg-surface">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "text-gold border-b-2 border-gold"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "popularity" && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-surface/50">
          <span className="text-[10px] text-muted uppercase tracking-wider">Min. partidas:</span>
          {[1, 3, 5, 10].map((n) => (
            <button
              key={n}
              onClick={() => setMinGames(n)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                minGames === n
                  ? "bg-gold/20 text-gold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted w-10">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Deck</th>
              {tab === "popularity" && (
                <>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">Jugado</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">% Meta</th>
                </>
              )}
              {tab === "winrate" && (
                <>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">W-L-D</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">Win Rate</th>
                </>
              )}
              {tab === "topcut" && (
                <>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">Entradas</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">Top Cuts</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">Conversión</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((d, i) => {
              const totalGames = d.wins + d.losses + d.draws;
              const dimmed = tab === "winrate" && totalGames < minGames
                || tab === "topcut" && d.totalEntries < minGames;
              const imgUrl = getLeaderImageUrl(d.leader);

              return (
                <tr
                  key={`${d.leader}||${d.baseDisplay}`}
                  className={`hover:bg-surface-light/50 transition-colors ${dimmed ? "opacity-40" : ""}`}
                >
                  <td className="px-3 py-2 tabular-nums text-muted">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {imgUrl && (
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover object-[center_15%] border border-border/50 flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {d.leader.split(",")[0]}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted">{d.baseDisplay}</span>
                          {d.aspects.length > 0 && (
                            <span className="inline-flex gap-0.5">
                              {d.aspects.map((a) => (
                                <span
                                  key={a}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: ASPECT_COLORS[a.toLowerCase()] ?? "#666" }}
                                />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {tab === "popularity" && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">{d.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{d.playRate}%</td>
                    </>
                  )}
                  {tab === "winrate" && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">
                        <span className="text-emerald-400">{d.wins}</span>
                        <span className="text-muted">-</span>
                        <span className="text-red-400">{d.losses}</span>
                        <span className="text-muted">-</span>
                        <span className="text-muted">{d.draws}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`tabular-nums font-semibold ${
                          d.winRate >= 55 ? "text-emerald-400" : d.winRate <= 45 ? "text-red-400" : "text-foreground"
                        }`}>
                          {d.winRate}%
                        </span>
                      </td>
                    </>
                  )}
                  {tab === "topcut" && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums text-muted hidden sm:table-cell">{d.totalEntries}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted hidden sm:table-cell">{d.topCutEntries}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`tabular-nums font-semibold ${
                          d.conversionRate >= 40 ? "text-emerald-400" : d.conversionRate === 0 ? "text-muted" : "text-foreground"
                        }`}>
                          {d.conversionRate}%
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
