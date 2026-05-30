"use client";

import Link from "next/link";
import { KyberCrystal } from "./kyber-crystal";

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

export function BracketView({ rounds, tierColor = "#d4a017" }: { rounds: BracketRound[]; tierColor?: string }) {
  const bracketRounds = rounds.filter((r) => {
    const name = r.name.toLowerCase();
    return name.includes("quarter") || name.includes("semi") || name.includes("final");
  });

  if (bracketRounds.length === 0) return null;

  const champion = (() => {
    const finalsRound = bracketRounds[bracketRounds.length - 1];
    const finals = finalsRound?.matches[0];
    if (!finals) return null;
    return finals.player1Wins > finals.player2Wins
      ? { id: finals.player1Id, username: finals.player1Username }
      : { id: finals.player2Id, username: finals.player2Username };
  })();

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">
        Top Cut Bracket
      </h2>
      <div className="overflow-x-auto">
        <div className="flex min-w-[700px]">
          {bracketRounds.map((round, ri) => {
            const isFinals = round.name.toLowerCase() === "finals";
            const isLast = ri === bracketRounds.length - 1;
            return (
              <div key={round.name} className="contents">
                <div className="flex-1 flex flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center mb-2">
                    {round.name}
                  </p>
                  <div className="flex-1 flex flex-col justify-around">
                    {round.matches.map((m, mi) => {
                      const p1Won = m.player1Wins > m.player2Wins;
                      const p2Won = m.player2Wins > m.player1Wins;
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
                            isFinals={isFinals}
                          />
                          <div className="h-px bg-border/50" />
                          <MatchupRow
                            playerId={m.player2Id}
                            username={m.player2Username}
                            wins={m.player2Wins}
                            won={p2Won}
                            isFinals={isFinals}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!isLast && (
                  <Connectors matchCount={round.matches.length} />
                )}
              </div>
            );
          })}

          {champion && (
            <>
              <Connectors matchCount={1} />
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold text-center mb-2">
                  Champion
                </p>
                <div className="flex-1 flex items-center">
                  <Link
                    href={`/player/${champion.id}`}
                    className="group w-full rounded-lg border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-3 text-center hover:border-gold/50 transition-colors"
                  >
                    <div className="flex justify-center mb-1">
                      <KyberCrystal color={tierColor} tier="champion" size="sm" />
                    </div>
                    <p className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                      {champion.username}
                    </p>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Connectors({ matchCount }: { matchCount: number }) {
  return (
    <div className="w-8 shrink-0 flex flex-col justify-around">
      {Array.from({ length: Math.ceil(matchCount / 2) }).map((_, i) => (
        <div key={i} className="flex flex-col flex-1 justify-center">
          {matchCount > 1 ? (
            <>
              <div className="flex-1 flex items-end">
                <div className="w-1/2 border-t border-border" />
                <div className="w-1/2 border-t border-l border-border h-full" />
              </div>
              <div className="w-full flex">
                <div className="w-1/2" />
                <div className="w-1/2 border-t border-border" />
              </div>
              <div className="flex-1 flex items-start">
                <div className="w-1/2 border-t border-border" />
                <div className="w-1/2 border-t border-l border-border h-full" />
              </div>
            </>
          ) : (
            <div className="border-t border-border" />
          )}
        </div>
      ))}
    </div>
  );
}

function MatchupRow({
  playerId,
  username,
  wins,
  won,
  isFinals,
}: {
  playerId: string;
  username: string;
  wins: number;
  won: boolean;
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
