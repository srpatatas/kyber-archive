"use client";

import { useState } from "react";
import { MetaPieChart } from "./meta-pie-chart";
import { getLeaderThumbnailUrl, getLeaderAspects } from "@/lib/card-images";
import { ASPECT_COLORS } from "@/lib/aspects";

interface DeckStats {
  leader: string;
  base: string;
  baseDisplay: string;
  baseAspect: string | null;
  aspects: string[];
  count: number;
  playRate: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  topCutCount: number;
  conversionRate: number;
}

function getDeckColor(leader: string, aspects: string[]): string {
  const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;
  const known = getLeaderAspects(leader);
  const colorAspect = (known.length > 0 ? known : aspects)
    .find((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy");
  if (colorAspect) return visibleColor(ASPECT_COLORS[colorAspect.toLowerCase()]) ?? "#666";
  const fallback = known[0] ?? aspects[0];
  return fallback ? visibleColor(ASPECT_COLORS[fallback.toLowerCase()]) ?? "#666" : "#666";
}

type SortField = "count" | "winRate" | "conversionRate";

export function TournamentMeta({ decks }: { decks: DeckStats[] }) {
  const [sortBy, setSortBy] = useState<SortField>("count");

  if (decks.length === 0) return null;

  const sorted = [...decks].sort((a, b) => {
    if (sortBy === "count") return b.count - a.count || b.winRate - a.winRate;
    if (sortBy === "winRate") return b.winRate - a.winRate || b.count - a.count;
    return b.conversionRate - a.conversionRate || b.count - a.count;
  });

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">
        Meta Snapshot
      </h2>

      <MetaPieChart decks={decks} />

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">
                Deck
              </th>
              <th
                className={`px-3 py-2 text-center text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                  sortBy === "count" ? "text-gold" : "text-muted hover:text-foreground"
                }`}
                onClick={() => setSortBy("count")}
              >
                Players
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">
                Meta
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">
                Record
              </th>
              <th
                className={`px-3 py-2 text-center text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors ${
                  sortBy === "winRate" ? "text-gold" : "text-muted hover:text-foreground"
                }`}
                onClick={() => setSortBy("winRate")}
              >
                WR%
              </th>
              <th
                className={`px-3 py-2 text-center text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors hidden sm:table-cell ${
                  sortBy === "conversionRate" ? "text-gold" : "text-muted hover:text-foreground"
                }`}
                onClick={() => setSortBy("conversionRate")}
              >
                Top Cut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((d) => {
              const imgUrl = getLeaderThumbnailUrl(d.leader);
              const color = getDeckColor(d.leader, d.aspects);
              const shortLeader = d.leader.split(",")[0].trim();

              return (
                <tr key={`${d.leader}||${d.base}`} className="hover:bg-surface-light/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {imgUrl ? (
                        <div
                          className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center border-2"
                          style={{
                            backgroundImage: `url(${imgUrl})`,
                            borderColor: color,
                          }}
                        />
                      ) : (
                        <div
                          className="h-8 w-8 shrink-0 rounded-full border-2"
                          style={{ borderColor: color, backgroundColor: `${color}20` }}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate text-xs sm:text-sm">
                          {shortLeader}
                        </p>
                        <p className="text-[10px] text-muted truncate">{d.baseDisplay}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{d.count}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-muted hidden sm:table-cell">
                    {d.playRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    <span className="text-emerald-400">{d.wins}</span>
                    <span className="text-muted">-</span>
                    <span className="text-red-400">{d.losses}</span>
                    {d.draws > 0 && (
                      <>
                        <span className="text-muted">-</span>
                        <span className="text-muted">{d.draws}</span>
                      </>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center tabular-nums ${
                    d.winRate >= 60 ? "text-emerald-400" : d.winRate <= 40 ? "text-red-400" : "text-foreground"
                  }`}>
                    {d.winRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums hidden sm:table-cell">
                    {d.topCutCount > 0 ? (
                      <span className="text-gold">{d.topCutCount}/{d.count}</span>
                    ) : (
                      <span className="text-muted">-</span>
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
