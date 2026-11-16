"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { TournamentDetail } from "@/lib/store";
import { detectBracketRounds } from "./bracket-view";
import {
  getLeaderThumbnailUrl,
  getLeaderAspects,
  getBaseAspectIcon,
  getBaseAspectColor,
  isSplashBase,
  getSplashGradient,
  getBaseThumbnailUrl,
} from "@/lib/card-images";
import { ASPECT_COLORS } from "@/lib/aspects";

type Standing = TournamentDetail["standings"][0];
type Round = TournamentDetail["rounds"][0];

interface RunMatch {
  label: string;
  topCut: boolean;
  result: "win" | "loss" | "draw" | "bye";
  myWins: number;
  oppWins: number;
  opponent: Standing | null;
  opponentUsername: string;
}

function leaderBorderColor(leader: string): string {
  const aspects = getLeaderAspects(leader);
  const colorAspect = aspects.find((a) => a.toLowerCase() !== "heroism" && a.toLowerCase() !== "villainy");
  const raw = colorAspect ? ASPECT_COLORS[colorAspect.toLowerCase()] : aspects[0] ? ASPECT_COLORS[aspects[0].toLowerCase()] : undefined;
  return raw === "#040004" ? "#4a3060" : raw ?? "#666";
}

function topCutLabel(name: string, matchCount: number): string {
  const n = name.toLowerCase();
  if (n.includes("quarter")) return "QF";
  if (n.includes("semi")) return "SF";
  if (n.includes("final")) return "F";
  return `T${matchCount * 2}`;
}

function LeaderIcon({ leader, size = "h-7 w-7" }: { leader: string | null; size?: string }) {
  if (!leader) return <div className={`${size} shrink-0 rounded-full border-2 border-border`} />;
  const img = getLeaderThumbnailUrl(leader);
  const color = leaderBorderColor(leader);
  return (
    <div
      className={`${size} shrink-0 rounded-full bg-cover bg-center border-2`}
      style={img ? { backgroundImage: `url(${img})`, borderColor: color } : { borderColor: color, backgroundColor: `${color}20` }}
    />
  );
}

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function BaseIcon({ base, baseDisplay }: { base: string | null; baseDisplay: string | null }) {
  if (!baseDisplay) return null;
  const icon = getBaseAspectIcon(baseDisplay);
  const isGeneric = icon != null || isSplashBase(baseDisplay) || baseDisplay.startsWith("Force ");
  const art = !isGeneric && base ? getBaseThumbnailUrl(base) : null;
  if (art) {
    return (
      <div className="h-6 w-6 shrink-0 p-[1.5px] bg-zinc-400/70" style={{ clipPath: HEX_CLIP }} title={baseDisplay}>
        <div className="h-full w-full bg-cover bg-center" style={{ clipPath: HEX_CLIP, backgroundImage: `url(${art})` }} />
      </div>
    );
  }
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt="" className="h-6 w-6 shrink-0" />;
  }
  const force = baseDisplay.startsWith("Force ");
  const splash = isSplashBase(baseDisplay);
  // Force/Splash bases: the plain aspect hexagon of their color, plus a corner badge
  const aspectIcon = getBaseAspectIcon(baseDisplay.replace(/^(Force|Splash) /, ""));
  if ((force || splash) && aspectIcon) {
    return (
      <div className="relative h-6 w-6 shrink-0" title={baseDisplay}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={aspectIcon} alt="" className="h-6 w-6" />
        <div
          className="absolute -bottom-0.5 -right-1 flex h-3.5 w-3.5 items-center justify-center drop-shadow"
          style={{ backgroundColor: "#000", clipPath: BADGE_CLIP }}
        >
          {force ? (
            <div className="flex h-[80%] w-[80%] items-center justify-center" style={{ backgroundColor: "#7c3aed", clipPath: BADGE_CLIP }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/force-icon.svg" alt="Force" className="h-[70%] w-[70%] brightness-0 invert" />
            </div>
          ) : (
            <div className="h-[80%] w-[80%]" style={{ background: getSplashGradient(baseDisplay), clipPath: BADGE_CLIP }} />
          )}
        </div>
      </div>
    );
  }
  const color = getBaseAspectColor(baseDisplay) ?? "#888";
  const background = splash ? getSplashGradient(baseDisplay) : color;
  return <div className="h-5 w-5 shrink-0 rounded-full border border-border" style={{ background }} title={baseDisplay} />;
}

const BADGE_CLIP = "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)";

function formatRecord(w: number, l: number, d: number) {
  return d > 0 ? `${w}-${l}-${d}` : `${w}-${l}`;
}

function PlayerRun({ run }: { run: RunMatch[] }) {
  if (run.length === 0) {
    return <p className="px-4 py-3 text-xs text-muted">No matches recorded.</p>;
  }
  const tally = (ms: RunMatch[]) => {
    let w = 0, l = 0, d = 0;
    for (const m of ms) {
      if (m.result === "win" || m.result === "bye") w++;
      else if (m.result === "loss") l++;
      else d++;
    }
    return { w, l, d };
  };
  const swiss = tally(run.filter((m) => !m.topCut));
  const cutMatches = run.filter((m) => m.topCut);
  const cut = tally(cutMatches);

  return (
    <div className="px-2 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-surface px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          Swiss {swiss.w}-{swiss.l}-{swiss.d}
        </span>
        {cutMatches.length > 0 && (
          <span className="rounded-full bg-surface px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            Top Cut {formatRecord(cut.w, cut.l, cut.d)}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface text-[10px] uppercase tracking-wider text-muted">
              <th className="px-3 py-1.5 text-left font-medium">Round</th>
              <th className="px-3 py-1.5 text-left font-medium">Result</th>
              <th className="px-3 py-1.5 text-left font-medium">Opponent</th>
              <th className="px-3 py-1.5 text-left font-medium hidden sm:table-cell">Player</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {run.map((m, i) => {
              const rowBg =
                m.result === "win" || m.result === "bye" ? "bg-emerald-500/5" : m.result === "loss" ? "bg-red-500/10" : "";
              const resultColor =
                m.result === "loss" ? "text-red-400" : m.result === "draw" ? "text-muted" : "text-emerald-400";
              const opp = m.opponent;
              const oppBase = opp ? opp.baseDisplay ?? opp.base : null;
              const deckName = opp?.leader ? `${opp.leader.split(",")[0].trim()} - ${oppBase ?? "?"}` : null;
              return (
                <tr key={i} className={rowBg}>
                  <td className="px-3 py-1.5 tabular-nums text-muted">{m.label}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className={`inline-block w-10 text-[10px] font-bold uppercase tracking-wider ${resultColor}`}>
                      {m.result}
                    </span>
                    {m.result !== "bye" && (
                      <span className="ml-1 font-semibold tabular-nums">{m.myWins}-{m.oppWins}</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {m.result === "bye" ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <LeaderIcon leader={opp?.leader ?? null} size="h-6 w-6" />
                        <BaseIcon base={opp?.base ?? null} baseDisplay={oppBase} />
                        {deckName ? (
                          opp?.decklistGuid ? (
                            <a
                              href={`https://melee.gg/Decklist/View/${opp.decklistGuid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate underline decoration-border underline-offset-2 hover:text-gold"
                            >
                              {deckName}
                            </a>
                          ) : (
                            <span className="truncate">{deckName}</span>
                          )
                        ) : (
                          <span className="text-muted">Unknown deck</span>
                        )}
                        <span className="ml-1 text-muted sm:hidden truncate">· {m.opponentUsername}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 hidden sm:table-cell">
                    {opp ? (
                      <Link href={`/player/${opp.playerId}`} className="hover:text-gold transition-colors">
                        {opp.username}
                      </Link>
                    ) : (
                      <span className="text-muted">{m.opponentUsername}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StandingsTable({ standings, rounds }: { standings: Standing[]; rounds: Round[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const runs = useMemo(() => {
    const byId = new Map(standings.map((s) => [s.playerId, s]));
    const cutRounds = detectBracketRounds(rounds);
    const cutLabelByMatches = new Map(cutRounds.map((r) => [r.matches, topCutLabel(r.name, r.matches.length)]));
    const result = new Map<string, RunMatch[]>();
    let swissNo = 0;
    for (const round of rounds) {
      const cutLabel = cutLabelByMatches.get(round.matches);
      const topCut = cutLabel != null;
      const label = topCut ? cutLabel : `R${++swissNo}`;
      for (const m of round.matches) {
        const sides: [string, number, string, string, number][] = [
          [m.player1Id, m.player1Wins, m.player2Id, m.player2Username, m.player2Wins],
          [m.player2Id, m.player2Wins, m.player1Id, m.player1Username, m.player1Wins],
        ];
        for (const [me, myWins, oppId, oppName, oppWins] of sides) {
          if (!me || me === "__bye__") continue;
          const isBye = !oppId || oppId === "__bye__";
          const entry: RunMatch = {
            label,
            topCut,
            result: isBye ? "bye" : myWins > oppWins ? "win" : myWins < oppWins ? "loss" : "draw",
            myWins,
            oppWins,
            opponent: isBye ? null : byId.get(oppId) ?? null,
            opponentUsername: isBye ? "BYE" : oppName,
          };
          if (!result.has(me)) result.set(me, []);
          result.get(me)!.push(entry);
        }
      }
    }
    return result;
  }, [standings, rounds]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted w-12">#</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Player</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Deck</th>
            <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Record</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {standings.map((s) => {
            const isOpen = open.has(s.playerId);
            const shortLeader = s.leader?.split(",")[0].trim() ?? null;
            const deckContent = s.leader ? (
              <div className="flex items-center gap-2">
                <LeaderIcon leader={s.leader} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate text-xs">{shortLeader}</p>
                  <p className="text-[10px] text-muted truncate">{s.baseDisplay ?? s.base}</p>
                </div>
              </div>
            ) : (
              <span className="text-muted">-</span>
            );

            return (
              <Fragment key={s.playerId}>
                <tr
                  onClick={() => toggle(s.playerId)}
                  className={`cursor-pointer transition-colors hover:bg-surface-light/50 ${isOpen ? "bg-surface-light/40" : ""}`}
                  aria-expanded={isOpen}
                >
                  <td className="px-3 py-2 tabular-nums text-muted">{s.rank}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/player/${s.playerId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-gold transition-colors"
                    >
                      <span className="font-medium">{s.username}</span>
                      <span className="ml-2 text-xs text-muted hidden sm:inline">{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {s.decklistGuid ? (
                      <a
                        href={`https://melee.gg/Decklist/View/${s.decklistGuid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex cursor-pointer transition-colors hover:text-gold [&_p]:transition-colors hover:[&_p]:text-gold"
                        title="View decklist on melee.gg"
                      >
                        {deckContent}
                      </a>
                    ) : (
                      deckContent
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    <span className="text-emerald-400">{s.matchWins}</span>
                    <span className="text-muted">-</span>
                    <span className="text-red-400">{s.matchLosses}</span>
                    {s.matchDraws > 0 && (
                      <>
                        <span className="text-muted">-</span>
                        <span className="text-muted">{s.matchDraws}</span>
                      </>
                    )}
                  </td>
                  <td className="pr-3 text-muted">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-background/40">
                    <td colSpan={5} className="p-0">
                      <PlayerRun run={runs.get(s.playerId) ?? []} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
