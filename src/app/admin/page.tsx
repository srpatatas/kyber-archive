"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type EventTier = "weekly" | "showdown" | "planetary" | "sector" | "galactic";

const TIER_LABELS: Record<EventTier, { label: string; color: string }> = {
  weekly: { label: "Weekly", color: "text-muted" },
  showdown: { label: "Showdown", color: "text-sky-400" },
  planetary: { label: "Planetary", color: "text-gold" },
  sector: { label: "Sector", color: "text-orange-400" },
  galactic: { label: "Galactic", color: "text-red-400" },
};

interface IngestedTournament {
  id: number;
  name: string;
  organizationName: string;
  date: string;
  tags: string[];
  playerCount: number;
  matchCount: number;
  eventTier: EventTier;
  ingestedAt: string;
}

interface IngestResult {
  success?: boolean;
  error?: string;
  tournament?: string;
  matchesIngested?: number;
  playersFound?: number;
  eventTier?: EventTier;
}

interface Toast {
  message: string;
  type: "success" | "error";
  timestamp: number;
}

export default function AdminPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [tournaments, setTournaments] = useState<IngestedTournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [lastRecalc, setLastRecalc] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type, timestamp: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) return;
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
      setLastRecalc(data.lastUpdated ?? null);
    } catch {
      // ignore
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setUrl("");
        setLastRecalc(new Date().toISOString());
        showToast(`Ingested ${data.tournament} — ratings recalculated`);
        fetchTournaments();
      }
    } catch {
      setResult({ error: "Network error — is the server running?" });
    } finally {
      setLoading(false);
    }
  }

  async function handleTierChange(id: number, name: string, eventTier: EventTier) {
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, eventTier }),
      });
      const data = await res.json();
      if (data.success) {
        setLastRecalc(new Date().toISOString());
        showToast(`${name} changed to ${TIER_LABELS[eventTier].label} — ratings recalculated`);
        fetchTournaments();
      } else {
        showToast(data.error ?? "Failed to update tier", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this tournament and recalculate ratings?")) return;

    try {
      const res = await fetch(`/api/admin/ingest?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLastRecalc(new Date().toISOString());
        showToast("Tournament removed — ratings recalculated");
        fetchTournaments();
      }
    } catch {
      // ignore
    }
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Tournament Ingestion
            </h1>
            <p className="mt-1 text-sm text-muted">
              Paste a melee.gg tournament URL to ingest match data and compute
              ratings.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-muted hover:text-gold transition-colors"
          >
            View Leaderboard
          </Link>
        </div>

        <form onSubmit={handleIngest} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://melee.gg/Tournament/View/406283"
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Ingesting..." : "Ingest"}
            </button>
          </div>
        </form>

        {result && (
          <div
            className={`mb-6 rounded-lg border p-4 ${
              result.success
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                : "border-red-500/30 bg-red-500/5 text-red-400"
            }`}
          >
            {result.success ? (
              <div>
                <p className="font-medium">
                  Ingested: {result.tournament}
                </p>
                <p className="mt-1 text-sm opacity-80">
                  {result.matchesIngested} matches from {result.playersFound}{" "}
                  players &middot; classified as{" "}
                  <span className="font-medium">
                    {result.eventTier && TIER_LABELS[result.eventTier]?.label}
                  </span>
                </p>
              </div>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">
              Ingested Tournaments ({tournaments.length})
            </h2>
            {lastRecalc && (
              <p className="text-[10px] text-muted">
                Last recalculated:{" "}
                {new Date(lastRecalc).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
          </div>
          {loadingTournaments ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Loading...
            </div>
          ) : tournaments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No tournaments ingested yet. Paste a URL above to get started.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {tournaments.map((t) => {
                const tierInfo = TIER_LABELS[t.eventTier] ?? TIER_LABELS.weekly;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                        <span>{t.organizationName}</span>
                        <span>{t.playerCount} players</span>
                        <span>{t.matchCount} matches</span>
                        <span>
                          {new Date(t.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <select
                      value={t.eventTier}
                      onChange={(e) => handleTierChange(t.id, t.name, e.target.value as EventTier)}
                      className={`rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium ${tierInfo.color} cursor-pointer focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30`}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="showdown">Showdown</option>
                      <option value="planetary">Planetary</option>
                      <option value="sector">Sector</option>
                      <option value="galactic">Galactic</option>
                    </select>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="rounded p-1 text-muted hover:text-red-400 transition-colors"
                      title="Remove tournament"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          key={toast.timestamp}
          className={`fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg animate-slide-up ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-surface text-emerald-400"
              : "border-red-500/30 bg-surface text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
