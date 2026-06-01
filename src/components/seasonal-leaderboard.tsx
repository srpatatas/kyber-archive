"use client";

import { useState } from "react";
import { LiveLeaderboard } from "./live-leaderboard";
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
}: {
  year1: RankedPlayer[];
  year0: RankedPlayer[];
  allTime: RankedPlayer[];
}) {
  const [season, setSeason] = useState<Season>("year1");

  const data = { year1, year0, allTime };
  const players = data[season];

  return (
    <div>
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
    </div>
  );
}
