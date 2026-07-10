"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerRating } from "@/lib/elo";
import { ASPECT_COLORS, ASPECT_ABBREV } from "@/lib/aspects";
import { RankBadge } from "./rank-badge";
import { KyberCrystal } from "./kyber-crystal";
import { getTierConfig } from "@/lib/tiers";
import { getLeaderAspects, getLeaderThumbnailUrl, getLeaderCropPosition, getBaseAspectColor } from "@/lib/card-images";
import { normalizeBase } from "@/lib/base-normalization";

type SortKey = "rank" | "rating" | "winRate" | "wins" | "top8s" | "tournamentWins";

type RankedPlayer = PlayerRating & { rank: number; aspects?: string[]; mainLeader?: string | null; ratingDelta?: number; kyberTiers?: string[] };

function getWinRate(p: RankedPlayer): number {
  const total = p.wins + p.losses + p.draws;
  if (total === 0) return 0;
  return Math.round((p.wins / total) * 1000) / 10;
}

function RankMovement({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const delta = previous - current;
  if (delta === 0) return null;
  if (delta > 0) return <span className="text-[10px] text-emerald-400 ml-1">▲{delta}</span>;
  return <span className="text-[10px] text-red-400 ml-1">▼{Math.abs(delta)}</span>;
}

export function LiveLeaderboard({ players, previousRanks }: { players: RankedPlayer[]; previousRanks?: Record<string, number> }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...players]
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.username.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rank":
        case "rating":
          cmp = b.rating - a.rating;
          break;
        case "winRate":
          cmp = getWinRate(b) - getWinRate(a);
          break;
        case "wins":
          cmp = b.wins - a.wins;
          break;
        case "top8s":
          const aRate = a.tournamentCount > 0 ? a.top8s / a.tournamentCount : 0;
          const bRate = b.tournamentCount > 0 ? b.top8s / b.tournamentCount : 0;
          cmp = bRate - aRate;
          break;
        case "tournamentWins":
          cmp = b.tournamentWins - a.tournamentWins;
          break;
      }
      return sortAsc ? -cmp : cmp;
    });

  function SortHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    const active = sortKey === sortKeyName;
    return (
      <button
        onClick={() => handleSort(sortKeyName)}
        className={`group inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${
          active ? "text-gold" : "text-muted hover:text-foreground"
        }`}
      >
        {label}
        <span className={`transition-transform ${active && sortAsc ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 sm:w-72"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border -mx-4 sm:mx-0">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left">
                <SortHeader label="Rank" sortKeyName="rank" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Player</span>
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="KA Rating" sortKeyName="rating" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Kybers" sortKeyName="tournamentWins" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Win Rate %" sortKeyName="winRate" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Top Cut %" sortKeyName="top8s" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => {
              const winRate = getWinRate(player);
              const totalGames = player.wins + player.losses + player.draws;
              return (
                <tr
                  key={player.id}
                  className="group border-b border-border/50 transition-colors hover:bg-surface-light/50 animate-slide-up relative"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <RankBadge rank={player.rank} />
                      {previousRanks && <RankMovement current={player.rank} previous={previousRanks[player.id]} />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/player/${player.id}`} className="group/link flex items-center gap-3">
                      {(() => {
                        const leaderName = player.mainLeader?.split(" - ")[0] ?? null;
                        const baseName = player.mainLeader?.split(" - ")[1] ?? null;
                        const imgUrl = leaderName ? getLeaderThumbnailUrl(leaderName) : null;
                        const cropPos = leaderName ? getLeaderCropPosition(leaderName) : "center";
                        const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;
                        const leaderAspects = leaderName ? getLeaderAspects(leaderName) : [];
                        const colorStops = leaderAspects
                          .filter((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy")
                          .map((a) => visibleColor(ASPECT_COLORS[a.toLowerCase()]))
                          .filter(Boolean) as string[];
                        if (colorStops.length === 0 && leaderAspects.length > 0) {
                          colorStops.push(visibleColor(ASPECT_COLORS[leaderAspects[0].toLowerCase()]) ?? "#666");
                        }
                        const baseNorm = baseName ? normalizeBase(baseName) : null;
                        const baseColor = baseName ? getBaseAspectColor(baseName, baseNorm?.aspect) ?? "#666" : "#666";
                        const allStops = [...(colorStops.length > 0 ? colorStops : ["#666"]), baseColor]
                          .filter((c, idx, arr) => idx === 0 || c !== arr[idx - 1]);
                        const borderGradient = allStops.length >= 2
                          ? `linear-gradient(to bottom, ${allStops.join(", ")})`
                          : allStops[0] ?? "var(--color-border)";

                        return (
                          <>
                            {imgUrl && (
                              <div className="w-9 h-9 rounded-lg p-[1.5px] shadow-sm flex-shrink-0" style={{ background: borderGradient }}>
                                <div className="w-full h-full rounded-[7px] overflow-hidden">
                                  <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />
                                </div>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground group-hover/link:text-gold transition-colors">
                                {player.username}
                              </p>
                              {player.mainLeader ? (
                                <p className="text-[10px] text-muted truncate">{player.mainLeader}</p>
                              ) : (
                                <p className="text-xs text-muted">{player.name}</p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-gold tabular-nums">
                      {player.rating.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {player.kyberTiers && player.kyberTiers.length > 0 ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {[...player.kyberTiers].sort((a, b) => {
                          const order: Record<string, number> = { galactic: 0, sector: 1, planetary: 2, major: 3, showdown: 4, minor: 5 };
                          return (order[a] ?? 9) - (order[b] ?? 9);
                        }).slice(0, 5).map((tier, j) => (
                          <KyberCrystal key={j} color={getTierConfig(tier).crystalColor} tier={tier} size="sm" />
                        ))}
                        {player.kyberTiers.length > 5 && <span className="text-[10px] text-gold ml-0.5">+{player.kyberTiers.length - 5}</span>}
                      </div>
                    ) : player.tournamentWins > 0 ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {Array.from({ length: Math.min(player.tournamentWins, 5) }).map((_, j) => (
                          <KyberCrystal key={j} color="#d4a017" tier="kyber" size="sm" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold tabular-nums ${winRate >= 55 ? "text-emerald-400" : winRate <= 45 ? "text-red-400" : "text-foreground"}`}>{winRate}%</span>
                    <p className="text-[10px] tabular-nums text-muted mt-0.5">
                      {player.wins}-{player.losses}-{player.draws}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {player.top8s > 0 ? (
                      <div>
                        <span className={`text-sm font-bold tabular-nums ${Math.round((player.top8s / player.tournamentCount) * 100) >= 40 ? "text-emerald-400" : "text-foreground"}`}>
                          {Math.round((player.top8s / player.tournamentCount) * 100)}%
                        </span>
                        <p className="text-[10px] tabular-nums text-muted">
                          {player.top8s}/{player.tournamentCount}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-12 text-center text-muted">
          No players found matching your search
        </div>
      )}
    </div>
  );
}
