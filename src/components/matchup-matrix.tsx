"use client";

import { useState } from "react";

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

export function MatchupMatrix({ matchups }: { matchups: LeaderMatchup[] }) {
  const [open, setOpen] = useState(false);

  const filtered = matchups.filter((m) => m.total >= 2);

  const deckKey = (leader: string, base: string) => `${leader}||${base || "?"}`;
  const deckLabel = (leader: string, base: string) => `${leader.split(",")[0]} · ${base || "?"}`;
  const deckShort = (leader: string, base: string) => {
    const name = leader.split(",")[0];
    if (!base) return name;
    const b = base.replace(/\s*\d+HP$/, "");
    return `${name} ${b}`;
  };

  const decks = new Set<string>();
  const deckInfo = new Map<string, { leader: string; base: string }>();
  for (const m of filtered) {
    const k1 = deckKey(m.leader1, m.base1);
    const k2 = deckKey(m.leader2, m.base2);
    decks.add(k1);
    decks.add(k2);
    deckInfo.set(k1, { leader: m.leader1, base: m.base1 });
    deckInfo.set(k2, { leader: m.leader2, base: m.base2 });
  }
  const deckList = Array.from(decks).sort();

  const getMatchup = (k1: string, k2: string): LeaderMatchup | null => {
    const d1 = deckInfo.get(k1);
    const d2 = deckInfo.get(k2);
    if (!d1 || !d2) return null;
    return filtered.find(
      (m) =>
        (deckKey(m.leader1, m.base1) === k1 && deckKey(m.leader2, m.base2) === k2) ||
        (deckKey(m.leader1, m.base1) === k2 && deckKey(m.leader2, m.base2) === k1)
    ) ?? null;
  };

  const getWinRate = (k1: string, k2: string): number | null => {
    const m = getMatchup(k1, k2);
    if (!m) return null;
    if (deckKey(m.leader1, m.base1) === k1) return m.leader1WinRate;
    return 100 - m.leader1WinRate;
  };

  const getRecord = (k1: string, k2: string): string => {
    const m = getMatchup(k1, k2);
    if (!m) return "";
    const isForward = deckKey(m.leader1, m.base1) === k1;
    const w = isForward ? m.leader1Wins : m.leader2Wins;
    const l = isForward ? m.leader2Wins : m.leader1Wins;
    return `${w}-${l}${m.draws > 0 ? `-${m.draws}` : ""} (${m.total})`;
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-light/50 transition-colors"
      >
        <div>
          <h2 className="text-sm font-medium text-foreground text-left">
            Matchup Matrix
          </h2>
          <p className="text-[10px] text-muted text-left">
            Win rate por líder vs líder ({filtered.length} matchups)
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6L8 10L12 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {deckList.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted border-t border-border/50">
              No hay suficientes datos
            </div>
          ) : (
            <div className="border-t border-border/50 overflow-x-auto">
              <table className="text-[10px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface px-2 py-1.5 text-left font-medium text-muted min-w-[120px]">
                      vs
                    </th>
                    {deckList.map((k) => {
                      const d = deckInfo.get(k)!;
                      return (
                        <th
                          key={k}
                          className="px-1.5 py-1.5 text-center font-medium text-muted whitespace-nowrap"
                          style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", minHeight: 90 }}
                        >
                          {deckShort(d.leader, d.base)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {deckList.map((row) => {
                    const rd = deckInfo.get(row)!;
                    return (
                      <tr key={row}>
                        <td className="sticky left-0 z-10 bg-surface px-2 py-1 font-medium text-muted whitespace-nowrap border-r border-border/30">
                          {deckShort(rd.leader, rd.base)}
                        </td>
                        {deckList.map((col) => {
                          if (row === col) {
                            return (
                              <td key={col} className="px-1.5 py-1 text-center bg-border/20">
                                <span className="text-muted">—</span>
                              </td>
                            );
                          }
                          const wr = getWinRate(row, col);
                          if (wr === null) {
                            return <td key={col} className="px-1.5 py-1 text-center text-muted/30">·</td>;
                          }
                          const cd = deckInfo.get(col)!;
                          const bg =
                            wr >= 60 ? "bg-emerald-500/20 text-emerald-400"
                            : wr >= 55 ? "bg-emerald-500/10 text-emerald-400/80"
                            : wr <= 40 ? "bg-red-500/20 text-red-400"
                            : wr <= 45 ? "bg-red-500/10 text-red-400/80"
                            : "text-muted";
                          return (
                            <td
                              key={col}
                              className={`px-1.5 py-1 text-center tabular-nums font-medium ${bg}`}
                              title={`${deckLabel(rd.leader, rd.base)} vs ${deckLabel(cd.leader, cd.base)}: ${getRecord(row, col)}`}
                            >
                              {Math.round(wr)}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
