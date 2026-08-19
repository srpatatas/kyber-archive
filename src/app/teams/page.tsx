import { getManagedTeams } from "@/lib/store";
import { TeamsContent } from "@/components/teams-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams | The Kyber Archive",
};

export default async function TeamsPage() {
  const teams = await getManagedTeams();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-border bg-surface/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-[0.03]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold glow-pulse" />
            {teams.length} team{teams.length === 1 ? "" : "s"}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Teams
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Year 2 team standings based on combined member ratings.
            Stats reflect each member&apos;s contributions during their
            active roster period.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <TeamsContent teams={teams} />
      </section>
    </main>
  );
}
