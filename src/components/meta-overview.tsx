"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ASPECT_COLORS } from "@/lib/aspects";
import { getLeaderThumbnailUrl, getLeaderSetCode, getLeaderImageUrl, getLeaderCropPosition, getBaseAbbrev, getBaseAspectColor, getBaseAspectIcon, getLeaderAspects, isForceBase, isSplashBase, getSplashGradient } from "@/lib/card-images";

interface DeckStats {
  leader: string;
  baseDisplay: string;
  baseAspect: string | null;
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
  const [hoverCard, setHoverCard] = useState<{ url: string; x: number; y: number } | null>(null);

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
              const imgUrl = getLeaderThumbnailUrl(d.leader);
              const cardUrl = getLeaderImageUrl(d.leader);
              const setCode = getLeaderSetCode(d.leader);
              const cropPos = getLeaderCropPosition(d.leader);

              return (
                <tr
                  key={`${d.leader}||${d.baseDisplay}`}
                  className={`hover:bg-surface-light/50 transition-colors ${dimmed ? "opacity-40" : ""}`}
                >
                  <td className="px-3 py-2 tabular-nums text-muted">{i + 1}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const baseAbbrev = getBaseAbbrev(d.baseDisplay);
                      const baseColor = getBaseAspectColor(d.baseDisplay, d.baseAspect);
                      const baseIcon = getBaseAspectIcon(d.baseDisplay);
                      const baseAspectKey = d.baseAspect?.toLowerCase() ?? null;
                      const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;
                      const knownLeaderAspects = getLeaderAspects(d.leader);
                      const leaderColorAspects = knownLeaderAspects.length > 0
                        ? knownLeaderAspects.filter((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy")
                        : d.aspects.filter((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy" && a.toLowerCase() !== baseAspectKey);
                      const leaderStops = leaderColorAspects
                        .map((a) => visibleColor(ASPECT_COLORS[a.toLowerCase()]))
                        .filter(Boolean) as string[];
                      if (leaderStops.length === 0) {
                        const fallback = knownLeaderAspects[0] ?? d.aspects[0];
                        if (fallback) leaderStops.push(visibleColor(ASPECT_COLORS[fallback.toLowerCase()]) ?? "#666");
                      }
                      const baseStop = baseAspectKey
                        ? visibleColor(ASPECT_COLORS[baseAspectKey]) ?? "#666"
                        : "#666";
                      const allStops = [...leaderStops, baseStop];
                      const uniqueStops = allStops.filter((c, i) => i === 0 || c !== allStops[i - 1]);
                      const leftColor = uniqueStops[0] ?? null;
                      const rightColor = uniqueStops[uniqueStops.length - 1] ?? leftColor;
                      const gradientStyle = uniqueStops.length >= 2
                        ? { backgroundImage: `linear-gradient(to right, ${uniqueStops.join(", ")})`, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" }
                        : uniqueStops.length === 1
                        ? { color: uniqueStops[0] }
                        : {};
                      return (
                        <div className="flex items-center gap-3">
                          <div
                            className="relative flex-shrink-0 cursor-pointer"
                            onMouseEnter={(e) => {
                              if (!cardUrl) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoverCard({ url: cardUrl, x: rect.right + 8, y: rect.top });
                            }}
                            onMouseLeave={() => setHoverCard(null)}
                          >
                            <div
                              className="w-12 h-12 rounded-xl p-[2px] shadow-sm"
                              style={{
                                background: uniqueStops.length >= 2
                                  ? `linear-gradient(to bottom, ${uniqueStops.join(", ")})`
                                  : uniqueStops[0] ?? "var(--color-border)",
                              }}
                            >
                              <div className="w-full h-full rounded-[10px] overflow-hidden">
                                {imgUrl ? (
                                  <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />
                                ) : (
                                  <div className="w-full h-full bg-surface" />
                                )}
                              </div>
                            </div>
                            {baseIcon ? (
                              <img
                                src={baseIcon}
                                alt={d.baseDisplay}
                                className="absolute -bottom-1 -right-1 w-5.5 h-5.5 drop-shadow-md"
                              />
                            ) : isForceBase(d.baseDisplay) ? (
                              <div
                                className="absolute -bottom-1 -right-1 w-5.5 h-5.5 flex items-center justify-center drop-shadow-md"
                                style={{
                                  backgroundColor: "#000",
                                  clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)",
                                }}
                              >
                                <div
                                  className="w-[80%] h-[80%] flex items-center justify-center"
                                  style={{
                                    backgroundColor: baseColor ?? "#666",
                                    clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)",
                                  }}
                                >
                                  <img src="/images/force-icon.svg" alt="Force" className="w-[70%] h-[70%] brightness-0 invert" />
                                </div>
                              </div>
                            ) : isSplashBase(d.baseDisplay) ? (
                              <div
                                className="absolute -bottom-1 -right-1 w-5.5 h-5.5 flex items-center justify-center drop-shadow-md"
                                style={{
                                  backgroundColor: "#000",
                                  clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)",
                                }}
                              >
                                <div
                                  className="w-[80%] h-[80%]"
                                  style={{
                                    background: getSplashGradient(d.baseDisplay),
                                    clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)",
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className="absolute -bottom-1 -right-1 w-5.5 h-5.5 flex items-center justify-center drop-shadow-md"
                                style={{
                                  backgroundColor: baseColor ?? "#666",
                                  clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)",
                                }}
                              >
                                <div
                                  className="w-[80%] h-[80%] flex items-center justify-center text-[7px] font-bold text-white"
                                  style={{
                                    backgroundColor: "#000",
                                    clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)",
                                  }}
                                >
                                  {baseAbbrev}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={gradientStyle}>
                              {d.leader.split(",")[0]} / {d.baseDisplay}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {setCode && <span className="text-[10px] text-muted">({setCode})</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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

      {hoverCard && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: hoverCard.x, top: hoverCard.y }}
        >
          <img
            src={hoverCard.url}
            alt=""
            className="w-72 rounded-lg shadow-2xl border border-border"
          />
        </div>,
        document.body
      )}
    </div>
  );
}
