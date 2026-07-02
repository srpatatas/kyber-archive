"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "./stat-card";

interface NacionalEntry {
  rank: number;
  playerId: string;
  playerName: string;
  playerUsername: string;
  totalPoints: number;
  matchPoints: number;
  participationPoints: number;
  championPoints: number;
  tournamentCount: number;
  qualified: boolean;
  qualifiedFrom: string | null;
}

interface NacionalData {
  entries: NacionalEntry[];
  sinceDate: string | null;
  sinceName: string | null;
  tournamentCount: number;
}

export function NacionalLeaderboard() {
  const [data, setData] = useState<NacionalData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/nacional")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <p className="text-center text-muted">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <p className="text-center text-red-400">Error cargando datos</p>
        </div>
      </main>
    );
  }

  const { entries, sinceDate, sinceName, tournamentCount } = data;
  const qualifiedCount = entries.filter((e) => e.qualified).length;
  const filtered = search
    ? entries.filter(
        (e) =>
          e.playerUsername.toLowerCase().includes(search.toLowerCase()) ||
          e.playerName.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Clasificación al Nacional
          </h1>
          {sinceName ? (
            <p className="text-xs text-muted">
              Desde: {sinceName} ({new Date(sinceDate!).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" })})
            </p>
          ) : (
            <p className="text-xs text-muted">Todos los torneos</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <StatCard label="Jugadores" value={entries.length} />
          <StatCard label="Torneos" value={tournamentCount} />
          <StatCard label="Clasificados" value={qualifiedCount} />
          <StatCard
            label="Líder"
            value={entries[0]?.playerUsername ?? "-"}
            subtext={entries[0] ? `${entries[0].totalPoints} pts` : undefined}
          />
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted w-10">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted">Jugador</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">Rondas</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">Partic.</th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted">Campeón</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">Torneos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((e) => (
                  <tr
                    key={e.playerId}
                    className={`hover:bg-surface-light/50 transition-colors ${e.qualified ? "bg-emerald-500/5" : ""}`}
                  >
                    <td className="px-3 py-2 tabular-nums text-muted">{e.rank}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/player/${e.playerId}`}
                        className="hover:text-gold transition-colors"
                      >
                        <span className="font-medium text-foreground">{e.playerUsername}</span>
                        <span className="ml-2 text-xs text-muted hidden sm:inline">{e.playerName}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                      {e.totalPoints.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted hidden sm:table-cell">{e.matchPoints}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted hidden sm:table-cell">{e.participationPoints}</td>
                    <td className="px-3 py-2 text-center">
                      {e.qualified ? (
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            Clasificado
                          </span>
                          {e.qualifiedFrom && (
                            <span className="text-[9px] text-muted">{e.qualifiedFrom}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted hidden sm:table-cell">{e.tournamentCount}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">
                      {search ? "Sin resultados" : "No hay datos disponibles"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
