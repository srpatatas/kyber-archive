"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type EventTier = "padawan" | "minor" | "showdown" | "major" | "planetary" | "sector" | "galactic";

const TIER_LABELS: Record<EventTier, { label: string; color: string }> = {
  padawan: { label: "Padawan", color: "text-muted" },
  minor: { label: "Minor", color: "text-emerald-400" },
  showdown: { label: "Showdown", color: "text-sky-400" },
  major: { label: "Major", color: "text-purple-400" },
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
  hasCachedScrape?: boolean;
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

type IngestMode = "api" | "scrape";

export default function AdminPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<IngestMode>("api");
  const [scrapeTier, setScrapeTier] = useState<EventTier>("showdown");
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
      const endpoint = mode === "scrape" ? "/api/admin/scrape" : "/api/admin/ingest";
      const payload = mode === "scrape"
        ? { url: url.trim(), eventTier: scrapeTier }
        : { url: url.trim() };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function handleRecalculate() {
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastRecalc(new Date().toISOString());
        showToast("All ratings recalculated");
      } else {
        showToast(data.error ?? "Recalculation failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function handleReingest(id: number, name: string, hasCachedScrape: boolean) {
    try {
      let res;
      if (hasCachedScrape) {
        res = await fetch("/api/admin/reingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } else {
        res = await fetch("/api/admin/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: String(id) }),
        });
      }
      const data = await res.json();
      if (data.success) {
        setLastRecalc(new Date().toISOString());
        showToast(`Re-ingested ${name} — ratings recalculated`);
        fetchTournaments();
      } else {
        showToast(data.error ?? "Re-ingest failed", "error");
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

        <form onSubmit={handleIngest} className="mb-8 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("api")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "api"
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              API (with access)
            </button>
            <button
              type="button"
              onClick={() => setMode("scrape")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "scrape"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              Scrape (no access needed)
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://melee.gg/Tournament/View/406283"
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              disabled={loading}
            />
            {mode === "scrape" && (
              <select
                value={scrapeTier}
                onChange={(e) => setScrapeTier(e.target.value as EventTier)}
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-medium text-foreground focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              >
                <option value="padawan">Padawan</option>
                <option value="minor">Minor</option>
                <option value="showdown">Showdown</option>
                <option value="major">Major</option>
                <option value="planetary">Planetary</option>
                <option value="sector">Sector</option>
                <option value="galactic">Galactic</option>
              </select>
            )}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "scrape"
                  ? "bg-emerald-500 text-background hover:bg-emerald-400"
                  : "bg-gold text-background hover:bg-gold-light"
              }`}
            >
              {loading
                ? mode === "scrape" ? "Scraping..." : "Ingesting..."
                : mode === "scrape" ? "Scrape" : "Ingest"
              }
            </button>
          </div>
          {mode === "scrape" && (
            <p className="text-[10px] text-muted">
              Scraping opens a browser to fetch public tournament data. Takes 30-60 seconds. Select the event tier since it can&apos;t be auto-detected.
            </p>
          )}
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
            <div className="flex items-center gap-3">
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
              <button
                onClick={handleRecalculate}
                className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:text-gold hover:border-gold/30 transition-colors"
              >
                Recalculate
              </button>
            </div>
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
                const tierInfo = TIER_LABELS[t.eventTier] ?? TIER_LABELS.padawan;
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
                      <option value="padawan">Padawan</option>
                      <option value="minor">Minor</option>
                      <option value="showdown">Showdown</option>
                      <option value="major">Major</option>
                      <option value="planetary">Planetary</option>
                      <option value="sector">Sector</option>
                      <option value="galactic">Galactic</option>
                    </select>
                    <button
                      onClick={() => handleReingest(t.id, t.name, !!t.hasCachedScrape)}
                      className="rounded p-1 text-muted hover:text-emerald-400 transition-colors"
                      title={t.hasCachedScrape ? "Re-ingest from cached scrape data" : "Re-ingest from API"}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 8a6 6 0 0111.5-2.5M14 8a6 6 0 01-11.5 2.5" strokeLinecap="round" />
                        <path d="M14 2v4h-4M2 14v-4h4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
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
