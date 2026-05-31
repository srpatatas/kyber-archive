"use client";

import { useState } from "react";
import Link from "next/link";

interface RoundMatch {
  player1Id: string;
  player1Username: string;
  player1Wins: number;
  player2Id: string;
  player2Username: string;
  player2Wins: number;
}

interface Round {
  name: string;
  matches: RoundMatch[];
}

export function TournamentRounds({ rounds }: { rounds: Round[] }) {
  const [openRounds, setOpenRounds] = useState<Set<string>>(new Set());

  function toggleRound(name: string) {
    setOpenRounds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-3">
        Round Results
      </h2>
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.name} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => toggleRound(round.name)}
              className="flex w-full items-center justify-between bg-surface px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-surface-light transition-colors"
            >
              <span>{round.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">{round.matches.length} matches</span>
                <svg
                  className={`h-4 w-4 text-muted transition-transform ${openRounds.has(round.name) ? "rotate-180" : ""}`}
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path d="M4 6L8 10L12 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {openRounds.has(round.name) && (
              <div className="divide-y divide-border/50">
                {round.matches.map((m, i) => {
                  const p1Won = m.player1Wins > m.player2Wins;
                  const p2Won = m.player2Wins > m.player1Wins;
                  return (
                    <div key={i} className="flex items-center px-4 py-2 text-sm">
                      <Link
                        href={`/player/${m.player1Id}`}
                        className={`flex-1 text-right truncate hover:text-gold transition-colors ${p1Won ? "font-medium text-foreground" : "text-muted"}`}
                      >
                        {m.player1Username}
                      </Link>
                      <div className="mx-4 flex items-center gap-1.5 tabular-nums">
                        <span className={p1Won ? "text-emerald-400 font-medium" : "text-muted"}>
                          {m.player1Wins}
                        </span>
                        <span className="text-muted">-</span>
                        <span className={p2Won ? "text-emerald-400 font-medium" : "text-muted"}>
                          {m.player2Wins}
                        </span>
                      </div>
                      <Link
                        href={`/player/${m.player2Id}`}
                        className={`flex-1 truncate hover:text-gold transition-colors ${p2Won ? "font-medium text-foreground" : "text-muted"}`}
                      >
                        {m.player2Username}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
