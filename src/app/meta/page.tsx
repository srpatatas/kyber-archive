"use client";

import { useState, useEffect, useCallback } from "react";
import { MetaOverview, MetaSummary } from "@/components/meta-overview";
import { MetaPieChart } from "@/components/meta-pie-chart";
import { MatchupMatrix } from "@/components/matchup-matrix";

type MetaPeriod = "1m" | "3m" | "6m" | "pre";

const PERIODS: { key: MetaPeriod; label: string }[] = [
  { key: "1m", label: "1 Mes" },
  { key: "3m", label: "3 Meses" },
  { key: "6m", label: "6 Meses" },
  { key: "pre", label: "Pre-Rotación" },
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
  const [period, setPeriod] = useState<MetaPeriod>("6m");
  const [stats, setStats] = useState<MetaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (p: MetaPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meta?period=${p}`);
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
    fetchStats(period);
  }, [period, fetchStats]);

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
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.key
                    ? "bg-gold/20 text-gold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted py-12">Cargando...</p>
        ) : stats && stats.decks.length > 0 ? (
          <>
            <MetaSummary decks={stats.decks} />

            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              <div className="flex-1 min-w-0">
                <MetaOverview decks={stats.decks} />
              </div>
              <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-20 rounded-xl border border-border bg-surface p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-3">Distribución por Líder</h3>
                  <MetaPieChart decks={stats.decks} />
                </div>
              </div>
            </div>

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
