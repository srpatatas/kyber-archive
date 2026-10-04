"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getTierConfig, TIER_CONFIG } from "@/lib/tiers";
import type { EventTier, RatingHistoryPoint } from "@/lib/elo";

const START_RATING = 1500;
const HEIGHT = 240;
const PAD = { top: 20, right: 64, bottom: 28, left: 40 };
const PEAK_COLOR = "#34d399";

function placementLabel(placement: number | null): string {
  if (placement === null) return "No top cut";
  if (placement === 1) return "Champion";
  if (placement === 2) return "Finalist";
  if (placement <= 4) return "Top 4";
  if (placement <= 8) return "Top 8";
  return `#${placement}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RatingChart({ history }: { history: RatingHistoryPoint[] }) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (history.length === 0) return null;

  // Index 0 is the season's 1500 starting point; events follow
  const values = [START_RATING, ...history.map((p) => p.rating)];
  const current = values[values.length - 1];
  const peakIndex = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
  const peak = values[peakIndex];
  const change = current - START_RATING;

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, 40);
  const yMin = rawMin - span * 0.1;
  const yMax = rawMax + span * 0.15;

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (values.length === 1 ? 0 : (i / (values.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(values.length - 1).toFixed(1)},${PAD.top + plotH} L${x(0).toFixed(1)},${PAD.top + plotH} Z`;

  // ~4 rounded gridlines
  const step = [10, 20, 25, 50, 100, 200, 250, 500].find((s) => (yMax - yMin) / s <= 5) ?? 1000;
  const gridValues: number[] = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) gridValues.push(v);

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - PAD.left) / plotW) * (values.length - 1));
    setHovered(Math.min(Math.max(i, 1), values.length - 1));
  }

  const hoveredPoint = hovered !== null ? history[hovered - 1] : null;
  const tiersPresent = (Object.keys(TIER_CONFIG) as EventTier[]).filter((t) => history.some((p) => p.eventTier === t));

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Rating History</p>
        <p className="text-xs text-muted">
          <span className={`font-bold tabular-nums ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {change >= 0 ? "+" : ""}{change}
          </span>{" "}
          since start · Peak <span className="font-bold tabular-nums" style={{ color: PEAK_COLOR }}>{peak}</span>
        </p>
      </div>

      <div ref={containerRef} className="relative rounded-lg border border-border bg-background">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            className="block touch-none select-none"
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            onPointerLeave={() => setHovered(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {gridValues.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeOpacity={0.4} />
                <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--muted)" className="tabular-nums">
                  {v}
                </text>
              </g>
            ))}

            {/* Season starting rating */}
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(START_RATING)} y2={y(START_RATING)} stroke="var(--muted)" strokeOpacity={0.6} strokeDasharray="2 4" />

            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" />

            {/* Peak line + label, stock-chart style */}
            {peakIndex > 0 && (
              <g>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(peak)} y2={y(peak)} stroke={PEAK_COLOR} strokeOpacity={0.7} strokeDasharray="5 4" />
                <rect x={PAD.left + plotW + 6} y={y(peak) - 9} width={52} height={18} rx={4} fill={PEAK_COLOR} fillOpacity={0.15} stroke={PEAK_COLOR} strokeOpacity={0.5} />
                <text x={PAD.left + plotW + 32} y={y(peak)} dy="0.32em" textAnchor="middle" fontSize={10} fontWeight={700} fill={PEAK_COLOR} className="tabular-nums">
                  ▲ {peak}
                </text>
                <circle cx={x(peakIndex)} cy={y(peak)} r={9} fill="none" stroke={PEAK_COLOR} strokeWidth={1.5} strokeOpacity={0.8} />
              </g>
            )}

            {/* Current rating pill (skipped when it is the peak, which already has one) */}
            {peakIndex !== values.length - 1 && Math.abs(y(current) - y(peak)) > 8 && (
              <g>
                <rect x={PAD.left + plotW + 6} y={y(current) - 9} width={52} height={18} rx={4} fill="var(--gold)" />
                <text x={PAD.left + plotW + 32} y={y(current)} dy="0.32em" textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--background)" className="tabular-nums">
                  {current}
                </text>
              </g>
            )}

            {hovered !== null && (
              <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--foreground)" strokeOpacity={0.25} />
            )}

            {history.map((p, idx) => {
              const i = idx + 1;
              const isHovered = hovered === i;
              return (
                <circle
                  key={p.tournamentId}
                  cx={x(i)}
                  cy={y(p.rating)}
                  r={isHovered ? 6 : history.length > 40 ? 3 : 4}
                  fill={getTierConfig(p.eventTier).crystalColor}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
              );
            })}

            <text x={PAD.left} y={HEIGHT - 8} fontSize={10} fill="var(--muted)">{formatDate(history[0].date)}</text>
            <text x={PAD.left + plotW} y={HEIGHT - 8} fontSize={10} fill="var(--muted)" textAnchor="end">{formatDate(history[history.length - 1].date)}</text>
          </svg>
        )}

        {hoveredPoint && hovered !== null && (
          <div
            className="pointer-events-none absolute z-10 w-48 rounded-lg border border-border bg-surface px-3 py-2 shadow-lg"
            style={{
              left: Math.min(Math.max(x(hovered) - 96, 4), width - 196),
              top: y(hoveredPoint.rating) > HEIGHT / 2 ? 8 : HEIGHT - 96,
            }}
          >
            <p className="truncate text-xs font-medium text-foreground">{hoveredPoint.tournamentName}</p>
            <p className="text-[10px] text-muted">
              {formatDate(hoveredPoint.date)} ·{" "}
              <span className={getTierConfig(hoveredPoint.eventTier).color}>{getTierConfig(hoveredPoint.eventTier).label}</span>
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs text-muted">{placementLabel(hoveredPoint.placement)}</span>
              <span className="text-sm font-bold tabular-nums text-gold">
                {hoveredPoint.rating}{" "}
                <span className={`text-xs ${hoveredPoint.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {hoveredPoint.delta >= 0 ? "+" : ""}{hoveredPoint.delta}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {tiersPresent.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {tiersPresent.map((t) => (
            <span key={t} className="flex items-center gap-1 text-[10px] text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_CONFIG[t].crystalColor }} />
              {TIER_CONFIG[t].label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <span className="w-3 border-t border-dashed" style={{ borderColor: PEAK_COLOR }} />
            Peak
          </span>
        </div>
      )}
    </div>
  );
}
