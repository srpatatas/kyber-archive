"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlayerRating } from "@/lib/elo";

type RankedPlayer = PlayerRating & { rank: number; mainLeader?: string | null; aspects?: string[] };
type Season = "year1" | "year0" | "allTime";

type SplitData = {
  year1: RankedPlayer[];
  year0: RankedPlayer[];
  allTime: RankedPlayer[];
  counts: { year1: number; year0: number; allTime: number };
};

const SEASON_TABS: { key: Season; label: string }[] = [
  { key: "year1", label: "Year 1" },
  { key: "year0", label: "Year 0" },
  { key: "allTime", label: "All-Time" },
];

const SPLIT_LABELS: Record<string, Record<Season, string>> = {
  gc: { year1: "Jul 28, 2025 – Jul 27, 2026", year0: "Before Jul 28, 2025", allTime: "All tournaments" },
  nac: { year1: "Dec 1, 2025 – Nov 30, 2026", year0: "Up to Nov 30, 2025", allTime: "All tournaments" },
  cal: { year1: "Jan 1 – Dec 31, 2026", year0: "Jan 1 – Dec 31, 2025", allTime: "All tournaments" },
};

function CompactTable({ players }: { players: RankedPlayer[] }) {
  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No ranked players</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">#</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Player</th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">Rating</th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">W-L-D</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="border-b border-border/50 hover:bg-surface-light/50 transition-colors">
              <td className="px-3 py-2 text-right text-sm tabular-nums text-muted">{p.rank}</td>
              <td className="px-3 py-2">
                <Link href={`/player/${p.id}`} className="text-sm font-medium text-foreground hover:text-gold transition-colors">
                  {p.username}
                </Link>
              </td>
              <td className="px-3 py-2 text-right text-sm font-bold text-gold tabular-nums">{p.rating}</td>
              <td className="px-3 py-2 text-right text-xs tabular-nums text-muted">{p.wins}-{p.losses}-{p.draws}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeasonsComparison({ gc, nac, cal }: { gc: SplitData; nac: SplitData; cal: SplitData }) {
  const [season, setSeason] = useState<Season>("year1");

  const splits = [
    { key: "gc", label: "Galactic", color: "text-gold", data: gc },
    { key: "nac", label: "Nacional", color: "text-emerald-400", data: nac },
    { key: "cal", label: "Calendar", color: "text-sky-400", data: cal },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
        {SEASON_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSeason(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors ${
              season === tab.key
                ? "bg-gold/10 border border-gold/30 text-gold"
                : "border border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {splits.map((split) => (
          <div key={split.key}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className={`text-sm font-bold ${split.color}`}>{split.label}</h3>
              <span className="text-xs text-muted">{split.data.counts[season]} tournaments</span>
            </div>
            <p className="mb-3 text-[10px] text-muted">
              {SPLIT_LABELS[split.key][season]}
            </p>
            <CompactTable players={split.data[season]} />
          </div>
        ))}
      </div>
    </section>
  );
}
