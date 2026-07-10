"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerRating } from "@/lib/elo";
import { ASPECT_COLORS, ASPECT_ABBREV } from "@/lib/aspects";
import { RankBadge } from "./rank-badge";

type SortKey = "rank" | "rating" | "winRate" | "wins" | "top8s" | "tournamentCount";

type RankedPlayer = PlayerRating & { rank: number; aspects?: string[]; mainLeader?: string | null; ratingDelta?: number };

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
        case "tournamentCount":
          cmp = b.tournamentCount - a.tournamentCount;
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
              <th className="px-4 py-3 text-right">
                <SortHeader label="KA Rating" sortKeyName="rating" />
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Win Rate %" sortKeyName="winRate" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Top Cut %" sortKeyName="top8s" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Events" sortKeyName="tournamentCount" />
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
                    <Link href={`/player/${player.id}`} className="group/link block">
                      <div>
                        <p className="font-medium text-foreground group-hover/link:text-gold transition-colors">
                          {player.username}
                        </p>
                        <p className="text-xs text-muted">{player.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted">{totalGames} games</p>
                        {player.mainLeader && (
                          <span className="contents">
                            <span className="text-muted">·</span>
                            <span className="text-[10px] text-sand truncate max-w-[120px]">
                              {player.mainLeader}
                            </span>
                          </span>
                        )}
                        {player.aspects && player.aspects.length > 0 && (
                          <span className="inline-flex gap-0.5">
                            {player.aspects.map((a: string) => {
                              const isVillainy = a === "villainy";
                              return (
                                <span
                                  key={a}
                                  className="rounded px-1 py-px text-[8px] font-bold leading-tight"
                                  style={{
                                    backgroundColor: isVillainy ? ASPECT_COLORS[a] : `${ASPECT_COLORS[a]}25`,
                                    color: isVillainy ? "#ffffff" : ASPECT_COLORS[a],
                                    border: `1px solid ${isVillainy ? "#ffffff40" : `${ASPECT_COLORS[a]}40`}`,
                                  }}
                                >
                                  {ASPECT_ABBREV[a] ?? a}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-lg font-bold text-gold tabular-nums">
                      {player.rating.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-lighter sm:block">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${winRate >= 55 ? "text-emerald-400" : winRate <= 45 ? "text-red-400" : "text-foreground"}`}>{winRate}%</span>
                    </div>
                    <p className="text-[10px] tabular-nums text-muted mt-0.5 text-right">
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
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm tabular-nums text-muted">
                      {player.tournamentCount}
                    </span>
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
