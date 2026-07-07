"use client";

import { useState, useRef, useEffect } from "react";
import { ASPECT_COLORS } from "@/lib/aspects";
import { getLeaderAspects, getLeaderThumbnailUrl, getLeaderCropPosition, getLeaderSetCode } from "@/lib/card-images";

interface LeaderMatchup {
  leader1: string;
  base1: string;
  leader2: string;
  base2: string;
  leader1Wins: number;
  leader2Wins: number;
  draws: number;
  total: number;
  leader1WinRate: number;
}

interface DeckOption {
  leader: string;
  baseDisplay: string;
  key: string;
}

function getDeckColor(leader: string): string {
  const visibleColor = (c: string | undefined) => c === "#040004" ? "#4a3060" : c;
  const known = getLeaderAspects(leader);
  const colorAspect = known.find((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy");
  if (colorAspect) return visibleColor(ASPECT_COLORS[colorAspect.toLowerCase()]) ?? "#666";
  return known[0] ? visibleColor(ASPECT_COLORS[known[0].toLowerCase()]) ?? "#666" : "#666";
}

export function MatchupPicker({ matchups, decks }: { matchups: LeaderMatchup[]; decks: DeckOption[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const deckOptions = decks
    .filter((d) => d.leader && d.baseDisplay)
    .map((d) => {
      const setCode = getLeaderSetCode(d.leader);
      const label = `${d.leader.split(",")[0]}${setCode ? ` (${setCode})` : ""} · ${d.baseDisplay}`;
      return { ...d, key: `${d.leader}||${d.baseDisplay}`, label };
    });

  const filtered = search
    ? deckOptions.filter((d) => d.label.toLowerCase().includes(search.toLowerCase()))
    : deckOptions;

  const getMatchups = (deckKey: string) => {
    const [leader, base] = deckKey.split("||");
    const results: { opponent: string; opponentBase: string; wins: number; losses: number; draws: number; total: number; winRate: number }[] = [];

    for (const m of matchups) {
      const k1 = `${m.leader1}||${m.base1}`;
      const k2 = `${m.leader2}||${m.base2}`;
      if (k1 === deckKey) {
        results.push({
          opponent: m.leader2,
          opponentBase: m.base2,
          wins: m.leader1Wins,
          losses: m.leader2Wins,
          draws: m.draws,
          total: m.total,
          winRate: m.leader1WinRate,
        });
      } else if (k2 === deckKey) {
        results.push({
          opponent: m.leader1,
          opponentBase: m.base1,
          wins: m.leader2Wins,
          losses: m.leader1Wins,
          draws: m.draws,
          total: m.total,
          winRate: Math.round((m.leader2Wins / (m.leader1Wins + m.leader2Wins || 1)) * 1000) / 10,
        });
      }
    }

    return results.sort((a, b) => b.winRate - a.winRate);
  };

  const selectedDeck = deckOptions.find((d) => d.key === selected);
  const matchupList = selected ? getMatchups(selected) : [];

  return (
    <div className="rounded-xl border border-border overflow-visible">
      <div className="px-4 py-3 bg-surface border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Matchups por Deck</h2>
        <p className="text-[10px] text-muted mt-0.5">Seleccioná un deck para ver todos sus matchups</p>
      </div>

      <div className="px-4 py-3 border-b border-border/50" ref={wrapperRef}>
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar deck..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
          {showDropdown && filtered.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-surface [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {filtered.map((d) => (
                <button
                  key={d.key}
                  onClick={() => { setSelected(d.key); setSearch(d.label); setShowDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gold/10 transition-colors ${selected === d.key ? "text-gold" : "text-foreground"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && selectedDeck && (
        <div>
          {matchupList.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No hay datos de matchups para este deck
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {matchupList.map((m) => {
                const imgUrl = getLeaderThumbnailUrl(m.opponent);
                const cropPos = getLeaderCropPosition(m.opponent);
                const color = getDeckColor(m.opponent);
                const setCode = getLeaderSetCode(m.opponent);
                const barColor = m.winRate >= 55 ? "#10b981" : m.winRate <= 45 ? "#ef4444" : "#888";

                return (
                  <div key={`${m.opponent}||${m.opponentBase}`} className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border/50" style={{ borderColor: color }}>
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: cropPos }} />
                      ) : (
                        <div className="w-full h-full bg-surface" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground truncate">
                          {m.opponent.split(",")[0]}{setCode ? ` (${setCode})` : ""} · {m.opponentBase}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ml-2 ${m.winRate >= 55 ? "text-emerald-400" : m.winRate <= 45 ? "text-red-400" : "text-muted"}`}>
                          {m.winRate}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${m.winRate}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-muted tabular-nums">
                          <span className="text-emerald-400">{m.wins}W</span> - <span className="text-red-400">{m.losses}L</span>{m.draws > 0 && ` - ${m.draws}D`}
                        </span>
                        <span className="text-[9px] text-muted">{m.total} partidas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
