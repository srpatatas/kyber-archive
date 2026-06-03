"use client";

import { useState } from "react";
import { LiveLeaderboard } from "./live-leaderboard";
import { StatCard } from "./stat-card";
import type { PlayerRating } from "@/lib/elo";

type RankedPlayer = PlayerRating & { rank: number; mainLeader?: string | null; aspects?: string[] };

type Season = "year1" | "year0" | "allTime";

const TABS: { key: Season; label: string; sublabel: string }[] = [
  { key: "year1", label: "Year 1", sublabel: "Current Season" },
  { key: "year0", label: "Year 0", sublabel: "Jun 2025 – Jul 2025" },
  { key: "allTime", label: "All-Time", sublabel: "All Tournaments" },
];

export function SeasonalLeaderboard({
  year1,
  year0,
  allTime,
  tournamentCounts,
}: {
  year1: RankedPlayer[];
  year0: RankedPlayer[];
  allTime: RankedPlayer[];
  tournamentCounts: { year1: number; year0: number; allTime: number };
}) {
  const [season, setSeason] = useState<Season>("year1");

  const data = { year1, year0, allTime };
  const players = data[season];
  const count = tournamentCounts[season];

  const topPlayer = players[0] ?? null;
  const avgRating =
    players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length)
      : 0;
  const totalGames = players.reduce(
    (sum, p) => sum + p.wins + p.losses + p.draws,
    0
  );
  const mostTop8s = players.reduce(
    (best, p) => (p.top8s > (best?.top8s ?? 0) ? p : best),
    null as (typeof players)[number] | null
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold glow-pulse" />
            {count > 0
              ? `${count} tournament${count === 1 ? "" : "s"} tracked`
              : "No tournaments ingested yet"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Competitive Rankings
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            The Kyber Archive measures player strength across sanctioned
            Star Wars: Unlimited tournaments. Higher ratings indicate stronger
            Force sensitivity.
          </p>

          {players.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Top Rated"
                value={topPlayer!.rating.toLocaleString()}
                subtext={topPlayer!.username}
              />
              <StatCard
                label="Avg Rating"
                value={avgRating.toLocaleString()}
                subtext={`Across ${players.length} ranked players`}
              />
              <StatCard
                label="Total Games"
                value={totalGames.toLocaleString()}
                subtext={`From ${count} tournament${count === 1 ? "" : "s"}`}
              />
              <StatCard
                label="Most Top 8s"
                value={mostTop8s && mostTop8s.top8s > 0 ? mostTop8s.top8s : "-"}
                subtext={mostTop8s && mostTop8s.top8s > 0 ? mostTop8s.username : undefined}
              />
            </div>
          )}
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

        {players.length > 0 ? (
          <LiveLeaderboard players={players} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <p className="text-sm text-muted">No ranked players in this season yet</p>
          </div>
        )}
      </section>
    </>
  );
}
