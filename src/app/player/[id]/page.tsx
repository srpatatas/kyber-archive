import { notFound } from "next/navigation";
import Link from "next/link";
import { getLeaderboard, getPlayerRivalries, getPlayerLeaders, getPlayerTournaments, getPlayerBestFinish, getPlayerTitleTiers, HeadToHead } from "@/lib/store";
import { getTierConfig } from "@/lib/tiers";
import { StatCard } from "@/components/stat-card";
import { BackButton } from "@/components/back-button";
import { LeadersSection } from "@/components/leaders-section";
import { PlayerEvents } from "@/components/player-events";
import { KyberCrystal } from "@/components/kyber-crystal";


export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leaderboard = await getLeaderboard();
  const player = leaderboard.find((p) => p.id === id);
  if (!player) notFound();

  const totalGames = player.wins + player.losses + player.draws;
  const winRate =
    totalGames > 0
      ? Math.round((player.wins / totalGames) * 1000) / 10
      : 0;
  const rivalries = await getPlayerRivalries(id);
  const leaders = await getPlayerLeaders(id);
  const tournaments = await getPlayerTournaments(id);
  const bestFinish = await getPlayerBestFinish(id);
  const titleTiers = await getPlayerTitleTiers(id);
  const topCutRate = player.tournamentCount > 0
    ? Math.round((player.top8s / player.tournamentCount) * 100)
    : 0;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <BackButton />

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-gold to-gold/40" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {player.username}
                </h1>
                <p className="mt-0.5 text-sm text-muted">{player.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted">
                    Rank #{player.rank}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-sm text-muted">
                    {player.tournamentCount} event{player.tournamentCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Kyber Archive
                </p>
                <p className="text-4xl font-bold text-gold tabular-nums">
                  {player.rating.toLocaleString()}
                </p>
                {player.peakRating > player.rating && (
                  <p className="text-xs text-muted">
                    Peak: {player.peakRating.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Win Rate" value={`${winRate}%`} subtext={`${player.wins}W-${player.losses}L-${player.draws}D`} />
              <StatCard label="Total Games" value={totalGames} />
              <StatCard label="Events Played" value={player.tournamentCount} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Top Cut Rate"
                value={player.top8s > 0 ? `${topCutRate}%` : "-"}
                subtext={player.top8s > 0 ? `${player.top8s}/${player.tournamentCount} events` : "No top cuts yet"}
              />
              <StatCard
                label="Best Finish"
                value={bestFinish === 1 ? "Champion" : bestFinish ? `Top ${bestFinish}` : "-"}
              />
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Titles
                </p>
                {titleTiers.length > 0 ? (
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    {titleTiers.map((tier, i) => {
                      return <KyberCrystal key={i} color={getTierConfig(tier).crystalColor} tier={tier} />;
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-gold">-</p>
                )}
              </div>
            </div>

            <PlayerEvents tournaments={tournaments} />

            <LeadersSection leaders={leaders} />

            {(rivalries.nemesis || rivalries.rival || rivalries.prey) && (
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">
                  Rivalries
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {rivalries.nemesis && (
                    <RivalryCard
                      label="Nemesis"
                      sublabel="Most losses against"
                      matchup={rivalries.nemesis}
                      colorClass="text-red-400"
                    />
                  )}
                  {rivalries.rival && (
                    <RivalryCard
                      label="Rival"
                      sublabel="Closest head-to-head"
                      matchup={rivalries.rival}
                      colorClass="text-gold"
                    />
                  )}
                  {rivalries.prey && (
                    <RivalryCard
                      label="Prey"
                      sublabel="Most wins against"
                      matchup={rivalries.prey}
                      colorClass="text-emerald-400"
                    />
                  )}
                </div>
              </div>
            )}

            {rivalries.allMatchups.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted mb-3">
                  Head-to-Head Records
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Opponent</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Record</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Matches</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rivalries.allMatchups.slice(0, 10).map((m) => (
                        <tr key={m.opponentId} className="hover:bg-surface-light/50 transition-colors">
                          <td className="px-3 py-2">
                            <Link href={`/player/${m.opponentId}`} className="hover:text-gold transition-colors">
                              <span className="font-medium">{m.opponentUsername}</span>
                              <span className="ml-2 text-xs text-muted">{m.opponentName}</span>
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            <span className="text-emerald-400">{m.wins}</span>
                            <span className="text-muted">-</span>
                            <span className="text-red-400">{m.losses}</span>
                            {m.draws > 0 && (
                              <>
                                <span className="text-muted">-</span>
                                <span className="text-muted">{m.draws}</span>
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-muted tabular-nums">
                            {m.totalMatches}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="mt-6 text-xs text-muted">
              Last active: {new Date(player.lastActive).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function RivalryCard({
  label,
  sublabel,
  matchup,
  colorClass,
}: {
  label: string;
  sublabel: string;
  matchup: HeadToHead;
  colorClass: string;
}) {
  return (
    <Link
      href={`/player/${matchup.opponentId}`}
      className="rounded-lg border border-border bg-background p-4 hover:border-border/80 transition-colors group"
    >
      <p className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>
        {label}
      </p>
      <p className="text-[10px] text-muted">{sublabel}</p>
      <p className="mt-2 font-medium text-foreground group-hover:text-gold transition-colors">
        {matchup.opponentUsername}
      </p>
      <p className="text-xs text-muted">{matchup.opponentName}</p>
      <p className="mt-1 text-sm tabular-nums">
        <span className="text-emerald-400">{matchup.wins}</span>
        <span className="text-muted">-</span>
        <span className="text-red-400">{matchup.losses}</span>
        {matchup.draws > 0 && (
          <>
            <span className="text-muted">-</span>
            <span className="text-muted">{matchup.draws}</span>
          </>
        )}
        <span className="ml-2 text-xs text-muted">
          ({matchup.totalMatches} games)
        </span>
      </p>
    </Link>
  );
}
