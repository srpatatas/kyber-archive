"use client";

import { useState } from "react";
import { TeamsContent } from "@/components/teams-content";
import { SEASON_TABS, type Season } from "@/lib/seasons";
import type { Team } from "@/lib/store";

export function SeasonalTeams({ teamsBySeason }: { teamsBySeason: Record<Season, Team[]> }) {
  const [season, setSeason] = useState<Season>("year2");
  const teams = teamsBySeason[season];
  const label = SEASON_TABS.find((t) => t.key === season)!.label;

  return (
    <>
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
            {label} team standings based on combined member ratings.
            Stats reflect each member&apos;s contributions during their
            active roster period.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
          {SEASON_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSeason(tab.key)}
              className={`flex-1 rounded-md px-3 py-2 text-center transition-colors ${
                season === tab.key
                  ? "bg-gold/10 border border-gold/30 text-gold"
                  : "border border-transparent text-muted hover:text-foreground"
              }`}
            >
              <p className="text-sm font-medium">{tab.label}</p>
              <p className="text-[10px] text-muted">{tab.sublabel}</p>
            </button>
          ))}
        </div>

        <TeamsContent teams={teams} />
      </section>
    </>
  );
}
