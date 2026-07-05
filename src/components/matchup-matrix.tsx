"use client";

import { useState } from "react";

interface LeaderMatchup {
  leader1: string;
  leader2: string;
  leader1Wins: number;
  leader2Wins: number;
  draws: number;
  total: number;
  leader1WinRate: number;
}

export function MatchupMatrix({ matchups }: { matchups: LeaderMatchup[] }) {
  const [open, setOpen] = useState(false);
  const [minGames, setMinGames] = useState(2);

  const filtered = matchups.filter((m) => m.total >= minGames);

  const leaders = new Set<string>();
  for (const m of filtered) {
    leaders.add(m.leader1);
    leaders.add(m.leader2);
  }
  const leaderList = Array.from(leaders).sort();

  const getMatchup = (l1: string, l2: string): LeaderMatchup | null => {
    return filtered.find(
      (m) =>
        (m.leader1 === l1 && m.leader2 === l2) ||
        (m.leader1 === l2 && m.leader2 === l1)
    ) ?? null;
  };

  const getWinRate = (l1: string, l2: string): number | null => {
    const m = getMatchup(l1, l2);
    if (!m) return null;
    if (m.leader1 === l1) return m.leader1WinRate;
    return 100 - m.leader1WinRate;
  };

  const getRecord = (l1: string, l2: string): string => {
    const m = getMatchup(l1, l2);
    if (!m) return "";
    const w = m.leader1 === l1 ? m.leader1Wins : m.leader2Wins;
    const l = m.leader1 === l1 ? m.leader2Wins : m.leader1Wins;
    return `${w}-${l}${m.draws > 0 ? `-${m.draws}` : ""} (${m.total})`;
  };

  const shortName = (leader: string) => leader.split(",")[0];

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
          <div className="flex items-center gap-2 px-4 py-2 border-t border-border/50 bg-surface/50">
            <span className="text-[10px] text-muted uppercase tracking-wider">Min. partidas:</span>
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMinGames(n)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  minGames === n ? "bg-gold/20 text-gold" : "text-muted hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {leaderList.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted border-t border-border/50">
              No hay suficientes datos
            </div>
          ) : (
            <div className="border-t border-border/50 overflow-x-auto">
              <table className="text-[10px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface px-2 py-1.5 text-left font-medium text-muted min-w-[100px]">
                      vs
                    </th>
                    {leaderList.map((l) => (
                      <th
                        key={l}
                        className="px-1.5 py-1.5 text-center font-medium text-muted whitespace-nowrap"
                        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", minHeight: 80 }}
                      >
                        {shortName(l)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderList.map((row) => (
                    <tr key={row}>
                      <td className="sticky left-0 z-10 bg-surface px-2 py-1 font-medium text-muted whitespace-nowrap border-r border-border/30">
                        {shortName(row)}
                      </td>
                      {leaderList.map((col) => {
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
                            title={`${shortName(row)} vs ${shortName(col)}: ${getRecord(row, col)}`}
                          >
                            {Math.round(wr)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
