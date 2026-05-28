import { notFound } from "next/navigation";
import Link from "next/link";
import { players, getWinRate, getTotalGames, aspectColors, factions } from "@/lib/data";
import { AspectBadge } from "@/components/aspect-badge";
import { StatCard } from "@/components/stat-card";
import { StreakIndicator } from "@/components/streak-indicator";
import { TierBadge, FactionBadge } from "@/components/tier-badge";

const countryNames: Record<string, string> = {
  SG: "Singapore", ES: "Spain", US: "United States", JP: "Japan",
  GB: "United Kingdom", DE: "Germany", BR: "Brazil", CA: "Canada",
  AE: "United Arab Emirates", FR: "France", KR: "South Korea", IT: "Italy",
  SE: "Sweden", IE: "Ireland", IN: "India", MX: "Mexico",
  NG: "Nigeria", BG: "Bulgaria", NZ: "New Zealand", FI: "Finland",
};

const countryFlags: Record<string, string> = {
  SG: "\u{1F1F8}\u{1F1EC}", ES: "\u{1F1EA}\u{1F1F8}", US: "\u{1F1FA}\u{1F1F8}", JP: "\u{1F1EF}\u{1F1F5}",
  GB: "\u{1F1EC}\u{1F1E7}", DE: "\u{1F1E9}\u{1F1EA}", BR: "\u{1F1E7}\u{1F1F7}", CA: "\u{1F1E8}\u{1F1E6}",
  AE: "\u{1F1E6}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", KR: "\u{1F1F0}\u{1F1F7}", IT: "\u{1F1EE}\u{1F1F9}",
  SE: "\u{1F1F8}\u{1F1EA}", IE: "\u{1F1EE}\u{1F1EA}", IN: "\u{1F1EE}\u{1F1F3}", MX: "\u{1F1F2}\u{1F1FD}",
  NG: "\u{1F1F3}\u{1F1EC}", BG: "\u{1F1E7}\u{1F1EC}", NZ: "\u{1F1F3}\u{1F1FF}", FI: "\u{1F1EB}\u{1F1EE}",
};

export function generateStaticParams() {
  return players.map((p) => ({ id: p.id }));
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const rank = players.indexOf(player) + 1;
  const winRate = getWinRate(player);
  const totalGames = getTotalGames(player);
  const aspectColor = aspectColors[player.favoriteAspect];
  const faction = factions[player.faction];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-gold transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 12L6 8L10 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Leaderboard
        </Link>

        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div
            className="h-2"
            style={{ background: `linear-gradient(90deg, ${aspectColor}, ${aspectColor}40)` }}
          />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-3xl ring-2 ring-gold/20">
                  {countryFlags[player.country] ?? player.country}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">
                      {player.name}
                    </h1>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted">
                      {countryNames[player.country] ?? player.country}
                    </span>
                    <span className="text-muted">·</span>
                    <span className="text-sm text-muted">
                      Rank #{rank}
                    </span>
                    <span className="text-muted">·</span>
                    <FactionBadge faction={player.faction} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TierBadge player={player} rank={rank} />
                    <AspectBadge aspect={player.favoriteAspect} />
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Midichlorian Index
                </p>
                <p className="text-4xl font-bold text-gold tabular-nums">
                  {player.midichlorianIndex.toLocaleString()}
                </p>
                <p className="text-xs text-muted">
                  Peak: {player.peakRating.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total Games" value={totalGames} />
              <StatCard label="Win Rate" value={`${winRate}%`} />
              <StatCard
                label="Record"
                value={`${player.wins}-${player.losses}-${player.draws}`}
              />
              <StatCard label="Tournament Titles" value={player.tournamentWins} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Current Streak
                </p>
                <div className="mt-2">
                  <StreakIndicator streak={player.streak} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Win/Loss Breakdown
                </p>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-lighter">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(player.wins / totalGames) * 100}%` }}
                    title={`${player.wins} wins`}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(player.losses / totalGames) * 100}%` }}
                    title={`${player.losses} losses`}
                  />
                  <div
                    className="bg-muted transition-all"
                    style={{ width: `${(player.draws / totalGames) * 100}%` }}
                    title={`${player.draws} draws`}
                  />
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-muted">Wins {player.wins}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-muted">Losses {player.losses}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted" />
                    <span className="text-muted">Draws {player.draws}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                {faction.name} Progression
              </p>
              <div className="mt-3 flex items-center gap-1">
                {faction.tiers.slice().reverse().map((tier, i, arr) => {
                  const isCurrentOrPast = player.midichlorianIndex >= tier.minRating;
                  const isCurrent =
                    isCurrentOrPast &&
                    (i === arr.length - 1 || player.midichlorianIndex < arr[i + 1].minRating);
                  return (
                    <div key={tier.name} className="flex-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isCurrent
                            ? "bg-gold"
                            : isCurrentOrPast
                              ? "bg-gold/40"
                              : "bg-surface-lighter"
                        }`}
                      />
                      <p
                        className={`mt-1 text-[10px] ${
                          isCurrent ? "font-bold text-gold" : "text-muted"
                        }`}
                      >
                        {tier.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

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
