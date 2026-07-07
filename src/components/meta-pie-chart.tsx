"use client";

import { useState } from "react";
import { ASPECT_COLORS } from "@/lib/aspects";
import { getLeaderAspects, getLeaderThumbnailUrl, getLeaderSetCode } from "@/lib/card-images";

interface DeckStats {
  leader: string;
  baseDisplay: string;
  baseAspect: string | null;
  aspects: string[];
  count: number;
  playRate: number;
}

interface LeaderBar {
  leader: string;
  shortName: string;
  setCode: string | null;
  count: number;
  pct: number;
  color: string;
  imgUrl: string | null;
  bases: { base: string; count: number; pct: number }[];
}

function getLeaderColor(leader: string, aspects: string[]): string {
  const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;
  const known = getLeaderAspects(leader);
  const colorAspect = (known.length > 0 ? known : aspects)
    .find((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy");
  if (colorAspect) return visibleColor(ASPECT_COLORS[colorAspect.toLowerCase()]) ?? "#666";
  const fallback = known[0] ?? aspects[0];
  return fallback ? visibleColor(ASPECT_COLORS[fallback.toLowerCase()]) ?? "#666" : "#666";
}

export function MetaPieChart({ decks }: { decks: DeckStats[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const leaderMap = new Map<string, LeaderBar>();
  const total = decks.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  for (const d of decks) {
    const key = d.leader;
    if (!leaderMap.has(key)) {
      leaderMap.set(key, {
        leader: d.leader,
        shortName: d.leader.split(",")[0],
        setCode: getLeaderSetCode(d.leader),
        count: 0,
        pct: 0,
        color: getLeaderColor(d.leader, d.aspects),
        imgUrl: getLeaderThumbnailUrl(d.leader),
        bases: [],
      });
    }
    const entry = leaderMap.get(key)!;
    entry.count += d.count;
    entry.bases.push({ base: d.baseDisplay, count: d.count, pct: d.playRate });
  }

  const leaders = Array.from(leaderMap.values()).sort((a, b) => b.count - a.count);
  const top10 = leaders.slice(0, 10);
  const otherCount = leaders.slice(10).reduce((sum, l) => sum + l.count, 0);

  const bars: LeaderBar[] = top10.map((l) => ({
    ...l,
    pct: Math.round((l.count / total) * 1000) / 10,
    bases: l.bases.sort((a, b) => b.count - a.count),
  }));
  if (otherCount > 0) {
    bars.push({
      leader: "Otros",
      shortName: "Otros",
      setCode: null,
      count: otherCount,
      pct: Math.round((otherCount / total) * 1000) / 10,
      color: "#444",
      imgUrl: null,
      bases: [],
    });
  }

  const maxPct = bars[0]?.pct ?? 1;

  return (
    <div className="space-y-1.5 relative">
      {bars.map((b, i) => (
        <div
          key={i}
          className="relative"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="relative h-7 rounded overflow-hidden bg-surface border border-border/30">
            <div
              className="absolute inset-y-0 left-0 rounded transition-all duration-200"
              style={{
                width: `${(b.pct / maxPct) * 100}%`,
                backgroundColor: b.color,
                opacity: hovered === null || hovered === i ? 0.8 : 0.3,
              }}
            >
              {b.imgUrl && (
                <img
                  src={b.imgUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity"
                />
              )}
            </div>
            <div className="relative h-full flex items-center justify-between px-2 z-10">
              <span className="text-[10px] font-semibold text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {b.shortName}{b.setCode && ` (${b.setCode})`}
              </span>
              <span className="text-[10px] font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {b.pct}%
              </span>
            </div>
          </div>

          {hovered === i && b.bases.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-border bg-surface p-2.5 shadow-xl">
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: b.color }}>
                {b.shortName}{b.setCode && ` (${b.setCode})`}
                <span className="ml-1 font-normal text-muted">{b.pct}%</span>
              </p>
              <div className="space-y-0.5">
                {b.bases.map((base) => (
                  <div key={base.base} className="flex justify-between text-[10px]">
                    <span className="text-muted truncate mr-2">{base.base}</span>
                    <span className="text-foreground font-medium whitespace-nowrap">{base.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
