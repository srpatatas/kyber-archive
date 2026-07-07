import Link from "next/link";
import { getIngestedTournaments } from "@/lib/store";
import { KyberCrystal } from "@/components/kyber-crystal";
import { getTierConfig } from "@/lib/tiers";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Tournaments | The Kyber Archive",
};

export default async function TournamentsPage() {
  const tournaments = await getIngestedTournaments();

  const grouped = new Map<string, typeof tournaments>();
  for (const t of tournaments) {
    const month = new Date(t.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(t);
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tournaments
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            {tournaments.length} sanctioned Star Wars: Unlimited events tracked
            by The Kyber Archive.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {tournaments.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <p className="text-lg font-medium text-foreground">No tournaments yet</p>
            <p className="mt-2 text-sm text-muted">
              Head to the{" "}
              <a href="/admin" className="text-gold hover:underline">Admin page</a>{" "}
              to ingest tournaments.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([month, events], groupIdx, allGroups) => {
              const prevGroup = groupIdx > 0 ? allGroups[groupIdx - 1] : null;
              const prevEvents = prevGroup ? grouped.get(prevGroup[0]) : null;
              const prevInYear1 = prevEvents ? prevEvents[0].date >= "2025-07-28" : false;
              const currentInYear0 = events[0].date < "2025-07-28";
              const showSeparator = prevInYear1 && currentInYear0;

              return (
              <div key={month}>
                {showSeparator && (
                  <div className="mb-8 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">▲</span>
                        <span className="text-xs font-bold text-gold">Year 1</span>
                        <span className="text-[10px] text-muted">Current Season · Jul 28, 2025 onwards</span>
                      </div>
                    </div>
                    <div className="my-2 h-px bg-gold/20" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">▼</span>
                        <span className="text-xs font-bold text-muted">Year 0</span>
                        <span className="text-[10px] text-muted">Pre-season · Before Jul 28, 2025</span>
                      </div>
                    </div>
                  </div>
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">
                  {month}
                </h3>
                <div className="relative border-l-2 border-border pl-6 space-y-4">
                  {events.map((t) => {
                    const tier = getTierConfig(t.eventTier);
                    return (
                      <Link
                        key={t.id}
                        href={`/tournament/${t.id}`}
                        className="group block relative"
                      >
                        <div className={`absolute -left-[31px] top-2 h-3 w-3 rounded-full ${tier.dot} ring-4 ring-background`} />
                        <div className="rounded-lg border border-border bg-surface p-4 hover:border-gold/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground group-hover:text-gold transition-colors">
                                {t.name}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                                <span>
                                  {new Date(t.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <span>{t.organizationName}</span>
                                <span className={`font-medium ${tier.color}`}>{tier.label}</span>
                              </div>
                            </div>
                            <div className="flex gap-4 text-right shrink-0">
                              <div>
                                <p className="text-sm font-bold text-foreground">{t.playerCount}</p>
                                <p className="text-[10px] text-muted">players</p>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">{t.matchCount}</p>
                                <p className="text-[10px] text-muted">matches</p>
                              </div>
                            </div>
                          </div>
                          {t.winnerUsername && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs">
                              <KyberCrystal
                                color={tier.crystalColor}
                                tier={t.eventTier}
                                size="sm"
                              />
                              <span className="text-gold font-medium">{t.winnerUsername}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
