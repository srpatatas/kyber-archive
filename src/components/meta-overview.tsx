"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ASPECT_COLORS } from "@/lib/aspects";
import { getLeaderThumbnailUrl, getLeaderSetCode, getLeaderImageUrl, getLeaderCropPosition, getBaseAbbrev, getBaseAspectColor, getBaseAspectIcon, getLeaderAspects, isForceBase, isSplashBase, getSplashGradient } from "@/lib/card-images";
import { getTierConfig } from "@/lib/tiers";

interface DecklistEntry {
  playerUsername: string;
  tournamentName: string;
  tournamentId: number;
  decklistGuid: string | null;
  base: string;
}

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
  kyberCount: number;
  kyberTournaments: { name: string; id: number; tier: string }[];
  decklists: DecklistEntry[];
}

function SortHeader({ label, sortKey, current, dir, onSort, className = "" }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void; className?: string }) {
  const active = current === sortKey;
  return (
    <th
      className={`px-2 py-2 text-center text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? "text-gold" : "text-muted hover:text-foreground"} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}{active && <span className="ml-0.5">{dir === "desc" ? "▼" : "▲"}</span>}
    </th>
  );
}

type SortKey = "playRate" | "wins" | "winRate" | "conversionRate" | "kyberCount";
type SortDir = "asc" | "desc";

function useDeckColors(d: DeckStats) {
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
  const baseStop = baseAspectKey ? visibleColor(ASPECT_COLORS[baseAspectKey]) ?? "#666" : "#666";
  const allStops = [...leaderStops, baseStop];
  const uniqueStops = allStops.filter((c, i) => i === 0 || c !== allStops[i - 1]);
  const gradientStyle = uniqueStops.length >= 2
    ? { backgroundImage: `linear-gradient(to right, ${uniqueStops.join(", ")})`, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" }
    : uniqueStops.length === 1
    ? { color: uniqueStops[0] }
    : {};
  const borderGradient = uniqueStops.length >= 2
    ? `linear-gradient(to bottom, ${uniqueStops.join(", ")})`
    : uniqueStops[0] ?? "var(--color-border)";
  const allLeaderStops = (knownLeaderAspects.length > 0 ? knownLeaderAspects : d.aspects.filter((a) => a.toLowerCase() !== baseAspectKey))
    .map((a) => visibleColor(ASPECT_COLORS[a.toLowerCase()]))
    .filter(Boolean) as string[];
  const leaderGradientStyle = allLeaderStops.length >= 2
    ? { backgroundImage: `linear-gradient(to right, ${allLeaderStops.join(", ")})`, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" }
    : allLeaderStops.length === 1
    ? { color: allLeaderStops[0] }
    : {};
  return { uniqueStops, gradientStyle, borderGradient, leaderGradientStyle, baseColor: getBaseAspectColor(d.baseDisplay, d.baseAspect) };
}

function DeckBadge({ d, size = "sm", onHover, onLeave }: { d: DeckStats; size?: "sm" | "lg"; onHover?: (e: React.MouseEvent, cardUrl: string) => void; onLeave?: () => void }) {
  const imgUrl = getLeaderThumbnailUrl(d.leader);
  const cardUrl = getLeaderImageUrl(d.leader);
  const cropPos = getLeaderCropPosition(d.leader);
  const { borderGradient, baseColor } = useDeckColors(d);
  const baseAbbrev = getBaseAbbrev(d.baseDisplay);
  const baseIcon = getBaseAspectIcon(d.baseDisplay);
  const dim = size === "lg" ? "w-16 h-16" : "w-12 h-12";
  const innerRadius = size === "lg" ? "rounded-[13px]" : "rounded-[10px]";
  const badgeDim = size === "lg" ? "w-7 h-7" : "w-5.5 h-5.5";
  const badgePos = size === "lg" ? "-bottom-1.5 -right-1.5" : "-bottom-1 -right-1";
  const badgeFont = size === "lg" ? "text-[9px]" : "text-[7px]";

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer"
      onMouseEnter={(e) => { if (cardUrl && onHover) onHover(e, cardUrl); }}
      onMouseLeave={() => { if (onLeave) onLeave(); }}
    >
      <div className={`${dim} rounded-xl p-[2px] shadow-sm`} style={{ background: borderGradient }}>
        <div className={`w-full h-full ${innerRadius} overflow-hidden`}>
          {imgUrl ? (
            <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />
          ) : (
            <div className="w-full h-full bg-surface" />
          )}
        </div>
      </div>
      {baseIcon ? (
        <img src={baseIcon} alt={d.baseDisplay} className={`absolute ${badgePos} ${badgeDim} drop-shadow-md`} />
      ) : isForceBase(d.baseDisplay) ? (
        <div className={`absolute ${badgePos} ${badgeDim} flex items-center justify-center drop-shadow-md`} style={{ backgroundColor: "#000", clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)" }}>
          <div className="w-[80%] h-[80%] flex items-center justify-center" style={{ backgroundColor: baseColor ?? "#666", clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)" }}>
            <img src="/images/force-icon.svg" alt="Force" className="w-[70%] h-[70%] brightness-0 invert" />
          </div>
        </div>
      ) : isSplashBase(d.baseDisplay) ? (
        <div className={`absolute ${badgePos} ${badgeDim} flex items-center justify-center drop-shadow-md`} style={{ backgroundColor: "#000", clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)" }}>
          <div className="w-[80%] h-[80%]" style={{ background: getSplashGradient(d.baseDisplay), clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)" }} />
        </div>
      ) : (
        <div className={`absolute ${badgePos} ${badgeDim} flex items-center justify-center drop-shadow-md`} style={{ backgroundColor: baseColor ?? "#666", clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)" }}>
          <div className={`w-[80%] h-[80%] flex items-center justify-center ${badgeFont} font-bold text-white`} style={{ backgroundColor: "#000", clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)" }}>
            {baseAbbrev}
          </div>
        </div>
      )}
    </div>
  );
}

export function MetaSummary({ decks }: { decks: DeckStats[] }) {
  if (decks.length === 0) return null;

  if (decks.length === 0) return null;

  const confident = decks.filter((d) => d.count >= 6);
  const pool = confident.length >= 3 ? confident : decks;
  const maxPlayRate = Math.max(...pool.map((d) => d.playRate)) || 1;
  const maxWinRate = Math.max(...pool.map((d) => d.winRate)) || 1;
  const maxConversion = Math.max(...pool.map((d) => d.conversionRate)) || 1;
  const maxKyber = Math.max(...pool.map((d) => d.kyberCount)) || 1;

  const scored = decks.map((d) => {
    const confidence = Math.min(d.count / 6, 1);
    const raw =
      Math.min(d.kyberCount / maxKyber, 1) * 30 +
      Math.min(d.conversionRate / maxConversion, 1) * 27 +
      Math.min(d.winRate / maxWinRate, 1) * 25 +
      Math.min(d.playRate / maxPlayRate, 1) * 18;
    return { ...d, score: raw * confidence };
  });
  scored.sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Top Decks</h2>
        <div className="relative group">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-muted/50 cursor-help">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <text x="8" y="11.5" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">?</text>
          </svg>
          <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-64 rounded-lg border border-border bg-surface p-3 shadow-xl text-xs text-foreground/80">
            <p className="font-semibold text-foreground mb-1.5">Cómo se calcula</p>
            <p>Score compuesto ponderado:</p>
            <ul className="mt-1 space-y-0.5">
              <li>• Kyber (torneos ganados) — 30%</li>
              <li>• Top Cut — 27%</li>
              <li>• Win Rate — 25%</li>
              <li>• Meta Share — 18%</li>
            </ul>
            <p className="mt-2 text-foreground/60">Solo decks con 5+ partidas. Confianza plena a partir de 6 apariciones; decks con menos apariciones reciben un score reducido proporcionalmente.</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {top3.map((d, i) => {
        const { gradientStyle } = useDeckColors(d);
        const imgUrl = getLeaderThumbnailUrl(d.leader);
        const setCode = getLeaderSetCode(d.leader);
        return (
          <div key={`${d.leader}||${d.baseDisplay}`} className="relative rounded-xl border border-border bg-surface overflow-hidden">
            {imgUrl && (
              <div className="h-16 overflow-hidden">
                <img src={imgUrl} alt="" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 h-16 bg-gradient-to-t from-surface to-transparent" />
              </div>
            )}
            <div className="relative px-4 pb-4 -mt-4">
              <div className="flex items-center gap-3">
                <DeckBadge d={d} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{medals[i]}</span>
                    <p className="font-bold truncate text-sm" style={gradientStyle}>
                      {d.leader.split(",")[0]}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted truncate">
                    {d.baseDisplay}
                    {setCode && <span className="ml-1">({setCode})</span>}
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted uppercase">Kyber</p>
                  <p className={`text-sm font-bold ${d.kyberCount > 0 ? "text-gold" : "text-muted"}`}>
                    {d.kyberCount > 0 ? d.kyberCount : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase">Meta</p>
                  <p className="text-sm font-bold text-foreground">{d.playRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase">Win Rate</p>
                  <p className={`text-sm font-bold ${d.winRate >= 55 ? "text-emerald-400" : d.winRate <= 45 ? "text-red-400" : "text-foreground"}`}>
                    {d.winRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase">Top Cut</p>
                  <p className={`text-sm font-bold ${d.conversionRate >= 40 ? "text-emerald-400" : "text-foreground"}`}>
                    {d.conversionRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export function MetaOverview({ decks }: { decks: DeckStats[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("playRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<{ url: string; x: number; y: number } | null>(null);

  const handleSort = (key: SortKey) => {
    if (key === sortBy) {
      setSortDir((d) => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const sorted = [...decks].sort((a, b) => {
    const diff = b[sortBy] - a[sortBy];
    const directed = sortDir === "desc" ? diff : -diff;
    return directed || b.count - a.count;
  });

  const handleHover = (e: React.MouseEvent, cardUrl: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverCard({ url: cardUrl, x: rect.right + 8, y: rect.top });
  };

  return (
    <>
      <div className="rounded-xl border border-border overflow-x-auto mb-6 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-surface [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted w-8">#</th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted w-[40%]">Deck</th>
                <SortHeader label="Kyber Count" sortKey="kyberCount" current={sortBy} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Meta Share" sortKey="playRate" current={sortBy} dir={sortDir} onSort={handleSort} />
                <SortHeader label="W-L-D Count" sortKey="wins" current={sortBy} dir={sortDir} onSort={handleSort} className="" />
                <SortHeader label="Win Rate" sortKey="winRate" current={sortBy} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Top Cut" sortKey="conversionRate" current={sortBy} dir={sortDir} onSort={handleSort} className="" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sorted.map((d, i) => {
                const { uniqueStops, gradientStyle } = useDeckColors(d);
                const setCode = getLeaderSetCode(d.leader);

                const rowKey = `${d.leader}||${d.baseDisplay}`;
                const isExpanded = expanded === rowKey;
                const hasDecklists = d.decklists && d.decklists.length > 0;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={`hover:bg-surface-light/50 transition-colors ${hasDecklists ? "cursor-pointer" : ""}`}
                      onClick={() => hasDecklists && setExpanded(isExpanded ? null : rowKey)}
                    >
                      <td className="px-2 py-2 tabular-nums text-muted">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2.5">
                          <DeckBadge d={d} onHover={handleHover} onLeave={() => setHoverCard(null)} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={gradientStyle}>
                              {d.leader.split(",")[0]} · {d.baseDisplay}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {setCode && <span className="text-[10px] text-muted">({setCode})</span>}
                              {hasDecklists && (
                                <span className="text-[9px] text-muted">
                                  {isExpanded ? "▲" : "▼"} {d.decklists.length} decklists
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums font-semibold text-sm">
                        {d.kyberCount > 0 ? (
                          <div className="relative group/kyber inline-block">
                            <span className="text-gold cursor-default">{d.kyberCount}</span>
                            {d.kyberTournaments && d.kyberTournaments.length > 0 && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full z-50 hidden group-hover/kyber:block pb-1">
                                <div className="w-52 rounded-lg border border-gold/30 bg-surface p-2 shadow-xl space-y-1.5">
                                  {d.kyberTournaments.map((t, j) => {
                                    const tier = getTierConfig(t.tier);
                                    return (
                                      <a
                                        key={j}
                                        href={`/tournament/${t.id}`}
                                        className="flex items-center gap-2 hover:bg-gold/10 rounded px-1.5 py-1 transition-colors"
                                      >
                                        <svg viewBox="0 0 20 32" className="w-3 h-5 flex-shrink-0">
                                          <path d="M10 0L17 8V20L10 32L3 20V8L10 0Z" fill={tier.crystalColor} opacity="0.9" />
                                        </svg>
                                        <span className="text-[11px] text-foreground/80 truncate">{t.name}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums font-semibold text-foreground text-sm">{d.playRate}%</td>
                      <td className="px-2 py-2 text-center tabular-nums text-muted text-sm">
                        <span className="text-emerald-400">{d.wins}</span>
                        <span className="text-muted">-</span>
                        <span className="text-red-400">{d.losses}</span>
                        {d.draws > 0 && <><span className="text-muted">-</span><span className="text-muted">{d.draws}</span></>}
                      </td>
                      <td className="px-2 py-2 text-center text-sm">
                        <span className={`tabular-nums font-semibold ${d.winRate >= 55 ? "text-emerald-400" : d.winRate <= 45 ? "text-red-400" : "text-foreground"}`}>
                          {d.winRate}%
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-sm ">
                        <span className={`font-semibold ${d.conversionRate >= 40 ? "text-emerald-400" : d.conversionRate === 0 ? "text-muted" : "text-foreground"}`}>
                          {d.conversionRate}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="bg-surface/50 px-4 py-2">
                          <div className="max-h-48 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-surface [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                            {d.decklists.map((dl, j) => (
                              <div key={j} className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-foreground font-medium truncate">{dl.playerUsername}</span>
                                  <span className="text-muted truncate hidden sm:inline">@ {dl.tournamentName}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] text-muted">{dl.base}</span>
                                  {dl.decklistGuid ? (
                                    <a
                                      href={`https://melee.gg/Decklist/View/${dl.decklistGuid}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gold hover:text-gold/80 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Ver deck →
                                    </a>
                                  ) : (
                                    <span className="text-muted/50 text-[10px]">sin link</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

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
    </>
  );
}
