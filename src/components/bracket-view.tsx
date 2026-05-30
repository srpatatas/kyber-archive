"use client";

import Link from "next/link";

interface BracketMatch {
  player1Id: string;
  player1Username: string;
  player1Wins: number;
  player2Id: string;
  player2Username: string;
  player2Wins: number;
}

interface BracketRound {
  name: string;
  matches: BracketMatch[];
}

export function BracketView({ rounds }: { rounds: BracketRound[] }) {
  const bracketRounds = rounds.filter((r) => {
    const name = r.name.toLowerCase();
    return name.includes("quarter") || name.includes("semi") || name.includes("final");
  });

  if (bracketRounds.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">
        Top Cut Bracket
      </h2>
      <div className="overflow-x-auto">
        <div className="flex items-stretch gap-2 min-w-[600px]">
          {bracketRounds.map((round, ri) => (
            <div key={round.name} className="flex flex-col flex-1 gap-2 justify-around">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center mb-1">
                {round.name}
              </p>
              {round.matches.map((m, mi) => {
                const p1Won = m.player1Wins > m.player2Wins;
                const p2Won = m.player2Wins > m.player1Wins;
                const isFinals = round.name.toLowerCase() === "finals";
                return (
                  <div
                    key={mi}
                    className={`rounded-lg border overflow-hidden ${
                      isFinals ? "border-gold/30" : "border-border"
                    }`}
                  >
                    <MatchupRow
                      playerId={m.player1Id}
                      username={m.player1Username}
                      wins={m.player1Wins}
                      won={p1Won}
                      isTop
                      isFinals={isFinals}
                    />
                    <div className="h-px bg-border/50" />
                    <MatchupRow
                      playerId={m.player2Id}
                      username={m.player2Username}
                      wins={m.player2Wins}
                      won={p2Won}
                      isTop={false}
                      isFinals={isFinals}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Champion column */}
          {bracketRounds.length > 0 && (() => {
            const finalsRound = bracketRounds[bracketRounds.length - 1];
            const finals = finalsRound.matches[0];
            if (!finals) return null;
            const champion = finals.player1Wins > finals.player2Wins
              ? { id: finals.player1Id, username: finals.player1Username }
              : { id: finals.player2Id, username: finals.player2Username };
            return (
              <div className="flex flex-col flex-1 justify-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold text-center mb-1">
                  Champion
                </p>
                <Link
                  href={`/player/${champion.id}`}
                  className="group rounded-lg border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-3 text-center hover:border-gold/50 transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5 text-gold mx-auto mb-1" fill="currentColor">
                    <path d="M8 1L10 5.5L15 5.5L11 8.5L12.5 13L8 10.5L3.5 13L5 8.5L1 5.5L6 5.5Z" />
                  </svg>
                  <p className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                    {champion.username}
                  </p>
                </Link>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function MatchupRow({
  playerId,
  username,
  wins,
  won,
  isTop,
  isFinals,
}: {
  playerId: string;
  username: string;
  wins: number;
  won: boolean;
  isTop: boolean;
  isFinals: boolean;
}) {
  return (
    <Link
      href={`/player/${playerId}`}
      className={`flex items-center justify-between px-3 py-2 transition-colors hover:bg-surface-light/50 ${
        won
          ? isFinals
            ? "bg-gold/5"
            : "bg-emerald-500/5"
          : ""
      }`}
    >
      <span
        className={`text-xs truncate ${
          won ? "font-bold text-foreground" : "text-muted"
        }`}
      >
        {username}
      </span>
      <span
        className={`ml-2 text-xs tabular-nums ${
          won ? "font-bold text-emerald-400" : "text-muted"
        }`}
      >
        {wins}
      </span>
    </Link>
  );
}
