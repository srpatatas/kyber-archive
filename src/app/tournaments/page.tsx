import Link from "next/link";
import { getIngestedTournaments } from "@/lib/store";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournaments | The Midichlorian Index",
};

const TIER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  weekly: { label: "Weekly", color: "text-muted", bg: "bg-muted/10 border-muted/20" },
  showdown: { label: "Showdown", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  planetary: { label: "Planetary", color: "text-gold", bg: "bg-gold/10 border-gold/20" },
  sector: { label: "Sector", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  galactic: { label: "Galactic", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

export default function TournamentsPage() {
  const tournaments = getIngestedTournaments().slice().reverse();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tournaments
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            All sanctioned Star Wars: Unlimited events tracked by The
            Midichlorian Index.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => {
              const tier = TIER_LABELS[t.eventTier] ?? TIER_LABELS.weekly;
              return (
                <Link
                  key={t.id}
                  href={`/tournament/${t.id}`}
                  className="group rounded-xl border border-border bg-surface overflow-hidden hover:border-gold/30 transition-colors"
                >
                  <div className={`h-1 ${
                    t.eventTier === "planetary" || t.eventTier === "galactic"
                      ? "bg-gold"
                      : t.eventTier === "sector"
                        ? "bg-orange-500"
                        : t.eventTier === "showdown"
                          ? "bg-sky-500"
                          : "bg-muted/30"
                  }`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground group-hover:text-gold transition-colors line-clamp-2 text-sm">
                        {t.name}
                      </h3>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tier.color} ${tier.bg}`}>
                        {tier.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{t.organizationName}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                      <span>
                        {new Date(t.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span>·</span>
                      <span>{t.playerCount} players</span>
                      <span>·</span>
                      <span>{t.matchCount} matches</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
