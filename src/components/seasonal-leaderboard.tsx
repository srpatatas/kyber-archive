"use client";

import { useState } from "react";
import Link from "next/link";
import { LiveLeaderboard } from "./live-leaderboard";
import { getLeaderThumbnailUrl, getLeaderAspects, getBaseAspectColor } from "@/lib/card-images";
import { ASPECT_COLORS } from "@/lib/aspects";
import type { PlayerRating } from "@/lib/elo";

type RankedPlayer = PlayerRating & { rank: number; mainLeader?: string | null; aspects?: string[] };

type Season = "year1" | "year0" | "allTime";

const TABS: { key: Season; label: string; sublabel: string }[] = [
  { key: "year1", label: "Year 1", sublabel: "Jul 2025 – Jul 2026" },
  { key: "year0", label: "Year 0", sublabel: "Jun 2025 – Jul 2025" },
  { key: "allTime", label: "All-Time", sublabel: "All Tournaments" },
];

export function SeasonalLeaderboard({
  year1,
  year0,
  allTime,
  tournamentCounts,
  previousRanks,
}: {
  year1: RankedPlayer[];
  year0: RankedPlayer[];
  allTime: RankedPlayer[];
  tournamentCounts: { year1: number; year0: number; allTime: number };
  previousRanks?: Record<string, number>;
}) {
  const [season, setSeason] = useState<Season>("year1");

  const data = { year1, year0, allTime };
  const players = data[season];
  const count = tournamentCounts[season];

  const top3 = players.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

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
            Star Wars: Unlimited tournaments in Argentina. Higher ratings
            indicate stronger Force sensitivity.
          </p>

          {top3.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3.map((p, i) => {
                const leaderName = p.mainLeader?.split(" - ")[0] ?? null;
                const baseName = p.mainLeader?.split(" - ")[1] ?? null;
                const imgUrl = leaderName ? getLeaderThumbnailUrl(leaderName) : null;
                const totalGames = p.wins + p.losses + p.draws;
                const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 1000) / 10 : 0;

                const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;
                const leaderAspects = leaderName ? getLeaderAspects(leaderName) : [];
                const playerAspects = p.aspects ?? [];
                const aspectSource = leaderAspects.length > 0 ? leaderAspects : playerAspects;
                const leaderColorAspects = aspectSource
                  .filter((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy");
                const leaderStops = (leaderColorAspects.length > 0 ? leaderColorAspects : aspectSource)
                  .map((a) => visibleColor(ASPECT_COLORS[a.toLowerCase()]))
                  .filter(Boolean) as string[];
                const baseColor = baseName ? getBaseAspectColor(baseName) ?? "#666" : "#666";
                const allStops = [...(leaderStops.length > 0 ? leaderStops : ["#666"]), baseColor]
                  .filter((c, idx, arr) => idx === 0 || c !== arr[idx - 1]);
                const hasGradient = allStops.length >= 2;
                const nameStyle: React.CSSProperties = hasGradient
                  ? { backgroundImage: `linear-gradient(to right, ${allStops.join(", ")})` }
                  : { color: allStops[0] ?? "#666" };

                return (
                  <Link
                    key={p.id}
                    href={`/player/${p.id}`}
                    className="relative rounded-xl border border-border bg-surface overflow-hidden hover:border-gold/30 transition-colors group"
                  >
                    <div className="absolute top-2 right-3 z-10 text-2xl font-bold tabular-nums text-gold/70">{p.rating.toLocaleString()}</div>
                    {imgUrl && (
                      <div className="h-16 overflow-hidden">
                        <img src={imgUrl} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" />
                        <div className="absolute inset-0 h-16 bg-gradient-to-t from-surface to-transparent" />
                      </div>
                    )}
                    <div className="relative px-4 pb-4 -mt-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{medals[i]}</div>
                        <div className="min-w-0 flex-1">
                          <span style={hasGradient ? { fontWeight: "bold", fontSize: "0.875rem", background: `linear-gradient(to right, ${allStops.join(", ")})`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" } : { fontWeight: "bold", fontSize: "0.875rem", ...nameStyle }}>
                            {p.username}
                          </span>
                          {p.mainLeader && (
                            <p className="text-[10px] text-muted truncate">{p.mainLeader}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-muted uppercase">Win Rate</p>
                          <p className={`text-sm font-bold ${winRate >= 55 ? "text-emerald-400" : winRate <= 45 ? "text-red-400" : "text-foreground"}`}>
                            {winRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted uppercase">Events</p>
                          <p className="text-sm font-bold text-foreground">{p.tournamentCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted uppercase">Top Cuts</p>
                          <p className="text-sm font-bold text-foreground">{p.top8s}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
          <LiveLeaderboard players={players} previousRanks={season === "year1" ? previousRanks : undefined} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <p className="text-sm text-muted">No ranked players in this season yet</p>
          </div>
        )}
      </section>
    </>
  );
}
