"use client";

import { useState } from "react";
import Link from "next/link";
import { Player } from "@/lib/types";
import { getWinRate, getTotalGames } from "@/lib/data";
import { AspectBadge } from "./aspect-badge";
import { StreakIndicator } from "./streak-indicator";
import { RankBadge } from "./rank-badge";
import { TierBadge } from "./tier-badge";

type SortKey = "rank" | "midichlorianIndex" | "winRate" | "wins" | "tournamentWins" | "streak";

const countryFlags: Record<string, string> = {
  SG: "\u{1F1F8}\u{1F1EC}", ES: "\u{1F1EA}\u{1F1F8}", US: "\u{1F1FA}\u{1F1F8}", JP: "\u{1F1EF}\u{1F1F5}",
  GB: "\u{1F1EC}\u{1F1E7}", DE: "\u{1F1E9}\u{1F1EA}", BR: "\u{1F1E7}\u{1F1F7}", CA: "\u{1F1E8}\u{1F1E6}",
  AE: "\u{1F1E6}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", KR: "\u{1F1F0}\u{1F1F7}", IT: "\u{1F1EE}\u{1F1F9}",
  SE: "\u{1F1F8}\u{1F1EA}", IE: "\u{1F1EE}\u{1F1EA}", IN: "\u{1F1EE}\u{1F1F3}", MX: "\u{1F1F2}\u{1F1FD}",
  NG: "\u{1F1F3}\u{1F1EC}", BG: "\u{1F1E7}\u{1F1EC}", NZ: "\u{1F1F3}\u{1F1FF}", FI: "\u{1F1EB}\u{1F1EE}",
};

export function LeaderboardTable({ players }: { players: Player[] }) {
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
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rank":
        case "midichlorianIndex":
          cmp = b.midichlorianIndex - a.midichlorianIndex;
          break;
        case "winRate":
          cmp = getWinRate(b) - getWinRate(a);
          break;
        case "wins":
          cmp = b.wins - a.wins;
          break;
        case "tournamentWins":
          cmp = b.tournamentWins - a.tournamentWins;
          break;
        case "streak":
          cmp = b.streak - a.streak;
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
          {active ? "▾" : "▾"}
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left">
                <SortHeader label="Rank" sortKeyName="rank" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Player</span>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Tier</span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="MI Rating" sortKeyName="midichlorianIndex" />
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Record</span>
              </th>
              <th className="px-4 py-3 text-right">
                <SortHeader label="Win %" sortKeyName="winRate" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Streak" sortKeyName="streak" />
              </th>
              <th className="px-4 py-3 text-center">
                <SortHeader label="Titles" sortKeyName="tournamentWins" />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Aspect</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => {
              const rank = players.indexOf(player) + 1;
              const winRate = getWinRate(player);
              const totalGames = getTotalGames(player);
              return (
                <tr
                  key={player.id}
                  className="group border-b border-border/50 transition-colors hover:bg-surface-light/50 animate-slide-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={rank} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/player/${player.id}`} className="group/link">
                      <div className="flex items-center gap-3">
                        <span className="text-lg" title={player.country}>
                          {countryFlags[player.country] ?? player.country}
                        </span>
                        <div>
                          <p className="font-medium text-foreground group-hover/link:text-gold transition-colors">
                            {player.name}
                          </p>
                          <p className="text-xs text-muted">{totalGames} games played</p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge player={player} rank={rank} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-lg font-bold text-gold tabular-nums">
                      {player.midichlorianIndex.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm tabular-nums">
                      <span className="text-emerald-400">{player.wins}</span>
                      <span className="text-muted">-</span>
                      <span className="text-crimson-light">{player.losses}</span>
                      <span className="text-muted">-</span>
                      <span className="text-muted">{player.draws}</span>
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
                      <span className="text-sm font-medium tabular-nums">{winRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StreakIndicator streak={player.streak} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {player.tournamentWins > 0 ? (
                      <span className="text-sm font-bold text-gold-light">
                        {player.tournamentWins}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AspectBadge aspect={player.favoriteAspect} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-12 text-center text-muted">
          No players found matching your filters
        </div>
      )}
    </div>
  );
}
