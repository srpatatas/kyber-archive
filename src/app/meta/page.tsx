"use client";

import { useState, useEffect, useCallback } from "react";
import { MetaOverview } from "@/components/meta-overview";
import { MatchupMatrix } from "@/components/matchup-matrix";
import { StatCard } from "@/components/stat-card";

type MetaEra = "current" | "pre-rotation" | "all-time";

const ERAS: { key: MetaEra; label: string; sublabel: string }[] = [
  { key: "current", label: "Post-Rotación", sublabel: "Mar 2026+" },
  { key: "pre-rotation", label: "Pre-Rotación", sublabel: "Pre Mar 2026" },
  { key: "all-time", label: "All-Time", sublabel: "Todo" },
];

interface MetaStats {
  decks: {
    leader: string;
    baseDisplay: string;
    baseAspect: string | null;
    aspects: string[];
    count: number;
    playRate: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalEntries: number;
    topCutEntries: number;
    conversionRate: number;
  }[];
  matchups: {
    leader1: string;
    base1: string;
    leader2: string;
    base2: string;
    leader1Wins: number;
    leader2Wins: number;
    draws: number;
    total: number;
    leader1WinRate: number;
  }[];
  totalDecklists: number;
  totalTournaments: number;
  uniqueLeaders: number;
}

export default function MetaPage() {
  const [era, setEra] = useState<MetaEra>("current");
  const [stats, setStats] = useState<MetaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (e: MetaEra) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meta?era=${e}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(era);
  }, [era, fetchStats]);

  const topDeck = stats?.decks[0];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Metagame</h1>
            {stats && (
              <p className="text-xs text-muted">
                {stats.totalDecklists} decklists en {stats.totalTournaments} torneos
              </p>
            )}
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
            {ERAS.map((e) => (
              <button
                key={e.key}
                onClick={() => setEra(e.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  era === e.key
                    ? "bg-gold/20 text-gold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span>{e.label}</span>
                <span className="hidden sm:inline ml-1 text-[10px] opacity-60">{e.sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted py-12">Cargando...</p>
        ) : stats && stats.decks.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              <StatCard label="Decks Analizados" value={stats.totalDecklists} />
              <StatCard label="Líderes Únicos" value={stats.uniqueLeaders} />
              <StatCard label="Arquetipos" value={stats.decks.length} />
              <StatCard
                label="Más Popular"
                value={topDeck?.leader?.split(",")[0] ?? "-"}
                subtext={topDeck ? `${topDeck.playRate}% del meta` : undefined}
              />
            </div>

            <MetaOverview decks={stats.decks} />
            <MatchupMatrix matchups={stats.matchups} />
          </>
        ) : (
          <p className="text-center text-muted py-12">
            No hay datos disponibles. Recalculá desde el panel de admin.
          </p>
        )}
      </div>
    </main>
  );
}
