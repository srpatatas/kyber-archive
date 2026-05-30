"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerLeaderEntry } from "@/lib/store";

export function LeadersSection({ leaders }: { leaders: PlayerLeaderEntry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (leaders.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">
        Leaders Played
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {leaders.map((l) => {
          const key = `${l.leader}||${l.base}`;
          const isOpen = expanded === key;
          return (
            <div key={key} className="rounded-lg border border-border bg-background overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-light/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sand">{l.leader}</p>
                  {l.base && <p className="text-xs text-muted">{l.base}</p>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-muted">
                    {l.count} event{l.count === 1 ? "" : "s"}
                  </span>
                  <svg
                    className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 6L8 10L12 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border/50 divide-y divide-border/30">
                  {l.events.map((e, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2">
                      <Link
                        href={`/tournament/${e.tournamentId}`}
                        className="text-xs text-muted hover:text-gold transition-colors truncate"
                      >
                        {e.tournamentName}
                      </Link>
                      {e.decklistGuid && (
                        <a
                          href={`https://melee.gg/Decklist/View/${e.decklistGuid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 shrink-0 rounded border border-gold/30 bg-gold/5 px-2 py-0.5 text-[10px] font-medium text-gold hover:bg-gold/10 transition-colors"
                        >
                          View Decklist
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
