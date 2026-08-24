"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type EventTier = "minor" | "showdown" | "major" | "planetary" | "sector" | "galactic";

const TIER_LABELS: Record<EventTier, { label: string; color: string }> = {
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
  isNacional?: boolean;
  countsForNacional?: boolean;
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

const AUTH_KEY = "ka_admin_auth";
const AUTH_TTL = 30 * 24 * 60 * 60 * 1000;

function getSavedAuth(): { pin: string; authenticated: boolean } {
  if (typeof window === "undefined") return { pin: "", authenticated: false };
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { pin: "", authenticated: false };
    const { pin, expiry } = JSON.parse(raw);
    if (Date.now() > expiry) { localStorage.removeItem(AUTH_KEY); return { pin: "", authenticated: false }; }
    return { pin, authenticated: true };
  } catch { return { pin: "", authenticated: false }; }
}

function saveAuth(pin: string) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ pin, expiry: Date.now() + AUTH_TTL }));
}

export default function AdminPage() {
  const saved = getSavedAuth();
  const [pin, setPin] = useState(saved.pin);
  const [authenticated, setAuthenticated] = useState(saved.authenticated);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<IngestMode>("api");
  const [scrapeTier, setScrapeTier] = useState<EventTier>("showdown");
  const [result, setResult] = useState<IngestResult | null>(null);
  const [tournaments, setTournaments] = useState<IngestedTournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [lastRecalc, setLastRecalc] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [aliases, setAliases] = useState<{ alias: string; canonicalId: string }[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [newCanonicalId, setNewCanonicalId] = useState("");
  const [aliasLoading, setAliasLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcStep, setRecalcStep] = useState("");
  const [pendingAliases, setPendingAliases] = useState<{ username: string; tournamentName: string; createdAt: string }[]>([]);
  const [pendingAssignTargets, setPendingAssignTargets] = useState<Record<string, string>>({});
  const [pendingSuggestions, setPendingSuggestions] = useState<Record<string, { id: string; username: string; name: string }[]>>({});
  const [activePendingAutocomplete, setActivePendingAutocomplete] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);

  // Teams state
  const [adminTeams, setAdminTeams] = useState<{ id: number; tag: string; displayName: string; avatarUrl: string | null; createdAt: string; members: { id: number; playerId: string; playerName: string; playerUsername: string; joinedAt: string; leftAt: string | null }[] }[]>([]);
  const [newTeamTag, setNewTeamTag] = useState("");
  const [newTeamDisplayName, setNewTeamDisplayName] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [newMemberPlayerId, setNewMemberPlayerId] = useState<Record<number, string>>({});
  const [newMemberJoinedAt, setNewMemberJoinedAt] = useState<Record<number, string>>({});
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editTag, setEditTag] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [playerSuggestions, setPlayerSuggestions] = useState<Record<number, { id: string; username: string; name: string }[]>>({});
  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type, timestamp: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }

  function adminFetch(url: string, init?: RequestInit) {
    return fetch(url, {
      ...init,
      headers: { ...init?.headers, "x-admin-pin": pin },
    });
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

  const fetchAliases = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/aliases");
      if (!res.ok) return;
      const data = await res.json();
      setAliases(data.aliases ?? []);
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const fetchPendingAliases = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/pending-aliases");
      if (!res.ok) return;
      const data = await res.json();
      setPendingAliases(data.pending ?? []);
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/teams");
      if (!res.ok) return;
      const data = await res.json();
      setAdminTeams(data.teams ?? []);
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    if (authenticated) {
      fetchTournaments();
      fetchAliases();
      fetchPendingAliases();
      fetchTeams();
    }
  }, [authenticated, fetchTournaments, fetchAliases, fetchPendingAliases, fetchTeams]);

  if (!authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="rounded-xl border border-border bg-surface p-8 w-full max-w-xs">
          <h2 className="text-lg font-bold text-foreground text-center">Admin Access</h2>
          <p className="mt-2 text-sm text-muted text-center">Enter PIN to continue</p>
          <form
            className="mt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPinError(false);
              const res = await fetch("/api/admin/verify", {
                method: "POST",
                headers: { "x-admin-pin": pin },
              });
              if (res.ok) {
                saveAuth(pin);
                setAuthenticated(true);
              } else {
                setPinError(true);
                setPin("");
              }
            }}
          >
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(false); }}
              placeholder="••••"
              className={`w-full rounded-lg border bg-background py-3 px-4 text-center text-2xl tracking-[0.5em] text-foreground placeholder:text-muted focus:outline-none focus:ring-1 ${
                pinError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-border focus:border-gold/50 focus:ring-gold/30"
              }`}
              autoFocus
            />
            {pinError && <p className="mt-2 text-xs text-red-400 text-center">Incorrect PIN</p>}
            <button
              type="submit"
              className="mt-3 w-full rounded-lg bg-gold/10 border border-gold/20 py-2 text-sm font-medium text-gold hover:bg-gold/20 transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setResult(null);

    if (mode === "scrape") {
      try {
        const res = await adminFetch("/api/admin/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), eventTier: scrapeTier }),
        });
        const data = await res.json();
        if (data.success) {
          setResult(null);
          pollScrapeStatus();
        } else {
          setResult(data);
          setLoading(false);
        }
      } catch {
        setResult({ error: "Network error — is the server running?" });
        setLoading(false);
      }
    } else {
      try {
        const res = await adminFetch("/api/admin/ingest", {
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
  }

  async function pollScrapeStatus() {
    const poll = async () => {
      try {
        const res = await adminFetch("/api/admin/scrape");
        const data = await res.json();
        if (data.status === "done") {
          setLoading(false);
          setUrl("");
          setLastRecalc(new Date().toISOString());
          const msg = data.message || "";
          const matchCount = parseInt(msg.match(/(\d+) matches/)?.[1] || "0", 10);
          const playerCount = parseInt(msg.match(/(\d+) players/)?.[1] || "0", 10);
          const tournamentName = msg.match(/Ingested (.+?):/)?.[1] || "Tournament";
          const tier = msg.match(/tier: (\w+)/)?.[1] as EventTier | undefined;
          setResult({ success: true, tournament: tournamentName, matchesIngested: matchCount, playersFound: playerCount, eventTier: tier });
          showToast(`Scraped ${tournamentName} — ratings recalculated`);
          fetchTournaments();
        } else if (data.status === "error") {
          setLoading(false);
          setResult({ error: data.message });
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setLoading(false);
        setResult({ error: "Lost connection while scraping" });
      }
    };
    setTimeout(poll, 3000);
  }

  async function handleTierChange(id: number, name: string, eventTier: EventTier) {
    try {
      const res = await adminFetch("/api/admin/ingest", {
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

  async function handleNacionalToggle(id: number, name: string, isNacional: boolean) {
    try {
      const res = await adminFetch("/api/admin/ingest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isNacional }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${name} ${isNacional ? "marked as Nacional" : "unmarked as Nacional"}`);
        fetchTournaments();
      } else {
        showToast(data.error ?? "Failed to update", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function handleCountsForNacionalToggle(id: number, counts: boolean) {
    try {
      const res = await adminFetch("/api/admin/ingest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, countsForNacional: counts }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTournaments();
      } else {
        showToast(data.error ?? "Failed to update", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function handleRecalculate() {
    setRecalculating(true);
    const steps = [
      { key: "elo", label: "Recalculando ELO..." },
      { key: "nacional", label: "Recalculando Nacional..." },
      { key: "meta", label: "Recalculando Metagame..." },
      { key: "stamp", label: "Finalizando..." },
    ];
    try {
      for (const step of steps) {
        setRecalcStep(step.label);
        const res = await adminFetch(`/api/admin/recalculate?step=${step.key}`, { method: "POST" });
        const data = await res.json();
        if (!data.success) {
          showToast(data.error ?? `${step.key} failed`, "error");
          return;
        }
      }
      setLastRecalc(new Date().toISOString());
      showToast("All ratings recalculated");
      fetchTournaments();
    } catch {
      showToast("Network error", "error");
    } finally {
      setRecalculating(false);
      setRecalcStep("");
    }
  }

  async function handleReingest(id: number, name: string, hasCachedScrape: boolean) {
    try {
      let res;
      if (hasCachedScrape) {
        res = await adminFetch("/api/admin/reingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } else {
        res = await adminFetch("/api/admin/ingest", {
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

  async function handleAddAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!newAlias.trim() || !newCanonicalId.trim() || aliasLoading) return;
    setAliasLoading(true);
    try {
      const res = await adminFetch("/api/admin/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: newAlias.trim(), canonicalId: newCanonicalId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewAlias("");
        setNewCanonicalId("");
        showToast(`Alias added: ${newAlias.trim()} → ${newCanonicalId.trim()}`);
        fetchAliases();
        fetchTournaments();
      } else {
        showToast(data.error ?? "Failed to add alias", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setAliasLoading(false);
    }
  }

  async function handleRemoveAlias(alias: string) {
    try {
      const res = await adminFetch(`/api/admin/aliases?alias=${encodeURIComponent(alias)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Alias removed: ${alias}`);
        fetchAliases();
      }
    } catch {
      // ignore
    }
  }

  async function handleConfirmPending(username: string) {
    const canonicalId = pendingAssignTargets[username]?.trim();
    if (!canonicalId) {
      showToast("Enter the current username to assign", "error");
      return;
    }
    try {
      const res = await adminFetch("/api/admin/pending-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, canonicalId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Alias created: ${username} → ${canonicalId}`);
        setPendingAssignTargets((prev) => { const next = { ...prev }; delete next[username]; return next; });
        fetchPendingAliases();
        fetchAliases();
        fetchTournaments();
      } else {
        showToast(data.error ?? "Failed to confirm alias", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function handleDismissPending(username: string) {
    try {
      const res = await adminFetch(`/api/admin/pending-aliases?username=${encodeURIComponent(username)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Dismissed: ${username} (new player)`);
        fetchPendingAliases();
      }
    } catch {
      // ignore
    }
  }

  async function handlePendingPlayerSearch(username: string, term: string) {
    setPendingAssignTargets((prev) => ({ ...prev, [username]: term }));
    if (term.trim().length < 2) {
      setPendingSuggestions((prev) => ({ ...prev, [username]: [] }));
      setActivePendingAutocomplete(null);
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/teams/members?q=${encodeURIComponent(term.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      setPendingSuggestions((prev) => ({ ...prev, [username]: data.players ?? [] }));
      setActivePendingAutocomplete(username);
    } catch { /* ignore */ }
  }

  function selectPendingPlayer(username: string, playerId: string) {
    setPendingAssignTargets((prev) => ({ ...prev, [username]: playerId }));
    setPendingSuggestions((prev) => ({ ...prev, [username]: [] }));
    setActivePendingAutocomplete(null);
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this tournament and recalculate ratings?")) return;

    try {
      const res = await adminFetch(`/api/admin/ingest?id=${id}`, { method: "DELETE" });
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

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamTag.trim() || !newTeamDisplayName.trim()) return;
    setTeamLoading(true);
    try {
      const res = await adminFetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTeamTag.trim(), displayName: newTeamDisplayName.trim() }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, "error"); return; }
      showToast(`Team ${newTeamTag.trim().toUpperCase()} created`);
      setNewTeamTag("");
      setNewTeamDisplayName("");
      fetchTeams();
    } catch { showToast("Failed to create team", "error"); }
    finally { setTeamLoading(false); }
  }

  function startEditTeam(team: { id: number; tag: string; displayName: string }) {
    setEditingTeam(team.id);
    setEditTag(team.tag);
    setEditDisplayName(team.displayName);
  }

  async function handleSaveTeam(id: number) {
    if (!editTag.trim() || !editDisplayName.trim()) return;
    try {
      const res = await adminFetch("/api/admin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tag: editTag.trim(), displayName: editDisplayName.trim() }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, "error"); return; }
      showToast("Team updated");
      setEditingTeam(null);
      fetchTeams();
    } catch { showToast("Failed to update team", "error"); }
  }

  async function handleDeleteTeam(id: number, tag: string) {
    if (!confirm(`Delete team ${tag}? This will remove all membership records.`)) return;
    try {
      const res = await adminFetch(`/api/admin/teams?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { showToast(`Team ${tag} deleted`); fetchTeams(); }
    } catch { showToast("Failed to delete team", "error"); }
  }

  async function handlePlayerSearch(teamId: number, term: string) {
    setNewMemberPlayerId((prev) => ({ ...prev, [teamId]: term }));
    if (term.trim().length < 2) {
      setPlayerSuggestions((prev) => ({ ...prev, [teamId]: [] }));
      setActiveAutocomplete(null);
      return;
    }
    try {
      const res = await adminFetch(`/api/admin/teams/members?q=${encodeURIComponent(term.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      setPlayerSuggestions((prev) => ({ ...prev, [teamId]: data.players ?? [] }));
      setActiveAutocomplete(teamId);
    } catch { /* ignore */ }
  }

  function selectPlayer(teamId: number, playerId: string) {
    setNewMemberPlayerId((prev) => ({ ...prev, [teamId]: playerId }));
    setPlayerSuggestions((prev) => ({ ...prev, [teamId]: [] }));
    setActiveAutocomplete(null);
  }

  async function handleAddMember(teamId: number) {
    const playerId = newMemberPlayerId[teamId]?.trim();
    const joinedAt = newMemberJoinedAt[teamId] || new Date().toISOString().split("T")[0];
    if (!playerId) return;
    try {
      const res = await adminFetch("/api/admin/teams/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, playerId, joinedAt }),
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, "error"); return; }
      showToast(`Added ${playerId} to team`);
      setNewMemberPlayerId((prev) => ({ ...prev, [teamId]: "" }));
      setPlayerSuggestions((prev) => ({ ...prev, [teamId]: [] }));
      fetchTeams();
    } catch { showToast("Failed to add member", "error"); }
  }

  async function handleAvatarUpload(teamId: number, oldUrl: string | null) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { showToast("File must be under 2MB", "error"); return; }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamId", teamId.toString());
      if (oldUrl) formData.append("oldUrl", oldUrl);
      try {
        const res = await adminFetch("/api/admin/teams/avatar", { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) { showToast(data.error, "error"); return; }
        showToast("Avatar uploaded");
        fetchTeams();
      } catch { showToast("Failed to upload avatar", "error"); }
    };
    input.click();
  }

  async function handleRemoveMember(membershipId: number, username: string) {
    if (!confirm(`Remove ${username} from team?`)) return;
    try {
      const res = await adminFetch(`/api/admin/teams/members?id=${membershipId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { showToast(`${username} removed`); fetchTeams(); }
    } catch { showToast("Failed to remove member", "error"); }
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
          {typeof window !== "undefined" && window.location.hostname === "localhost" && (
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
          )}
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
                disabled={recalculating}
                className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:text-gold hover:border-gold/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recalculating ? recalcStep || "Recalculating..." : "Recalculate"}
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
                const tierInfo = TIER_LABELS[t.eventTier] ?? TIER_LABELS.minor;
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
                    <button
                      onClick={() => handleCountsForNacionalToggle(t.id, !t.countsForNacional)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        t.countsForNacional
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-surface text-muted hover:text-foreground hover:border-border/80"
                      }`}
                      title={t.countsForNacional ? "Exclude from Nacional qualification" : "Include in Nacional qualification"}
                    >
                      CLASIF
                    </button>
                    <button
                      onClick={() => handleNacionalToggle(t.id, t.name, !t.isNacional)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        t.isNacional
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-border bg-surface text-muted hover:text-foreground hover:border-border/80"
                      }`}
                      title={t.isNacional ? "Unmark as Nacional" : "Mark as Nacional"}
                    >
                      NAC
                    </button>
                    <select
                      value={t.eventTier}
                      onChange={(e) => handleTierChange(t.id, t.name, e.target.value as EventTier)}
                      className={`rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium ${tierInfo.color} cursor-pointer focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30`}
                    >
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
        {pendingAliases.length > 0 && (
          <div className="mt-8 rounded-xl border border-amber-500/30">
            <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <h2 className="text-sm font-medium text-amber-400">
                Pending Review ({pendingAliases.length})
              </h2>
              <p className="mt-0.5 text-[10px] text-muted">
                New usernames found during ingestion. Assign to an existing player or dismiss as new.
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {pendingAliases.map((p) => (
                <div key={p.username} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">{p.username}</span>
                      <span className="ml-2 text-[10px] text-muted">from {p.tournamentName}</span>
                    </div>
                    <button
                      onClick={() => handleDismissPending(p.username)}
                      className="rounded-lg border border-border px-3 py-1 text-[10px] font-medium text-muted hover:text-foreground hover:border-border/80 transition-colors"
                    >
                      New player
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={pendingAssignTargets[p.username] ?? ""}
                        onChange={(e) => handlePendingPlayerSearch(p.username, e.target.value)}
                        onFocus={() => { if ((pendingSuggestions[p.username]?.length ?? 0) > 0) setActivePendingAutocomplete(p.username); }}
                        onBlur={() => setTimeout(() => setActivePendingAutocomplete(null), 150)}
                        placeholder="Assign to existing player..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
                      />
                      {activePendingAutocomplete === p.username && (pendingSuggestions[p.username]?.length ?? 0) > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-surface shadow-lg max-h-40 overflow-y-auto">
                          {pendingSuggestions[p.username].map((s) => (
                            <button
                              key={s.id}
                              onMouseDown={() => selectPendingPlayer(p.username, s.id)}
                              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gold/10 transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium text-foreground">{s.username}</span>
                              {s.name !== s.username && <span className="text-muted truncate ml-2">{s.name}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleConfirmPending(p.username)}
                      disabled={!pendingAssignTargets[p.username]?.trim()}
                      className="rounded-lg bg-gold/10 border border-gold/20 px-4 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border">
          <div className="border-b border-border bg-surface px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">
              Player Aliases ({aliases.length})
            </h2>
            <p className="mt-0.5 text-[10px] text-muted">
              Map old usernames to current ones. Adding an alias merges existing data and applies to future ingestions.
            </p>
          </div>
          <div className="px-4 py-3 border-b border-border/50">
            <form onSubmit={handleAddAlias} className="flex gap-2">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="Old username"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
              <span className="self-center text-xs text-muted">→</span>
              <input
                type="text"
                value={newCanonicalId}
                onChange={(e) => setNewCanonicalId(e.target.value)}
                placeholder="Current username"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
              <button
                type="submit"
                disabled={aliasLoading || !newAlias.trim() || !newCanonicalId.trim()}
                className="rounded-lg bg-gold/10 border border-gold/20 px-4 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aliasLoading ? "Adding..." : "Add"}
              </button>
            </form>
          </div>
          {aliases.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No aliases configured.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {aliases.map((a) => (
                <div key={a.alias} className="flex items-center justify-between px-4 py-2">
                  <div className="text-sm">
                    <span className="text-muted">{a.alias}</span>
                    <span className="mx-2 text-xs text-muted">→</span>
                    <span className="text-foreground font-medium">{a.canonicalId}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveAlias(a.alias)}
                    className="rounded p-1 text-muted hover:text-red-400 transition-colors"
                    title="Remove alias"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teams Management */}
        <div className="mt-10 rounded-xl border border-border">
          <div className="border-b border-border bg-surface px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">Teams ({adminTeams.length})</h2>
            <p className="text-xs text-muted mt-0.5">
              Manage team rosters. Stats are computed from match data within each member&apos;s active period.
            </p>
          </div>
          <div className="px-4 py-3 border-b border-border/50">
            <form onSubmit={handleCreateTeam} className="flex gap-2">
              <input
                type="text"
                value={newTeamTag}
                onChange={(e) => setNewTeamTag(e.target.value)}
                placeholder="Tag (e.g. NT)"
                className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 uppercase"
              />
              <input
                type="text"
                value={newTeamDisplayName}
                onChange={(e) => setNewTeamDisplayName(e.target.value)}
                placeholder="Display name"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
              <button
                type="submit"
                disabled={teamLoading || !newTeamTag.trim() || !newTeamDisplayName.trim()}
                className="rounded-lg bg-gold/10 border border-gold/20 px-4 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teamLoading ? "Creating..." : "Create"}
              </button>
            </form>
          </div>
          {adminTeams.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              No teams created yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {adminTeams.map((team) => (
                <div key={team.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAvatarUpload(team.id, team.avatarUrl)}
                        className="relative h-8 w-8 shrink-0 rounded-full border border-border bg-surface overflow-hidden hover:border-gold/50 transition-colors group"
                        title="Upload avatar"
                      >
                        {team.avatarUrl ? (
                          <img src={team.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] text-muted group-hover:text-gold">+</span>
                        )}
                      </button>
                      {editingTeam === team.id ? (
                        <>
                          <input
                            type="text"
                            value={editTag}
                            onChange={(e) => setEditTag(e.target.value)}
                            className="w-16 rounded border border-gold/30 bg-background px-1.5 py-0.5 text-xs font-bold text-gold uppercase focus:outline-none focus:ring-1 focus:ring-gold/30"
                          />
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/30"
                            onKeyDown={(e) => e.key === "Enter" && handleSaveTeam(team.id)}
                          />
                        </>
                      ) : (
                        <>
                          <span className="rounded bg-gold/10 px-1.5 py-0.5 text-xs font-bold text-gold">{team.tag}</span>
                          <span className="text-sm font-medium text-foreground">{team.displayName}</span>
                          <span className="text-xs text-muted">· {team.members.filter((m) => !m.leftAt).length} active</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingTeam === team.id ? (
                        <>
                          <button
                            onClick={() => handleSaveTeam(team.id)}
                            className="rounded p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Save"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 8L7 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingTeam(null)}
                            className="rounded p-1 text-muted hover:text-foreground transition-colors"
                            title="Cancel"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditTeam(team)}
                            className="rounded p-1 text-muted hover:text-gold transition-colors"
                            title="Edit team"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M11 2L14 5L5 14H2V11L11 2Z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.tag)}
                            className="rounded p-1 text-muted hover:text-red-400 transition-colors"
                            title="Delete team"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Members */}
                  {team.members.length > 0 && (
                    <div className="ml-4 mb-2 space-y-1">
                      {team.members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={m.leftAt ? "text-muted line-through" : "text-foreground font-medium"}>{m.playerUsername}</span>
                            <span className="text-muted">
                              {m.joinedAt}{m.leftAt ? ` → ${m.leftAt}` : ""}
                            </span>
                            {!m.leftAt && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">active</span>}
                          </div>
                          {!m.leftAt && (
                            <button
                              onClick={() => handleRemoveMember(m.id, `${m.playerUsername} from ${team.displayName}`)}
                              className="rounded p-0.5 text-muted hover:text-red-400 transition-colors"
                              title="Remove member"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add member form */}
                  <div className="ml-4 flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newMemberPlayerId[team.id] ?? ""}
                        onChange={(e) => handlePlayerSearch(team.id, e.target.value)}
                        onFocus={() => { if ((playerSuggestions[team.id]?.length ?? 0) > 0) setActiveAutocomplete(team.id); }}
                        onBlur={() => setTimeout(() => setActiveAutocomplete(null), 150)}
                        placeholder="Search player..."
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
                      />
                      {activeAutocomplete === team.id && (playerSuggestions[team.id]?.length ?? 0) > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-surface shadow-lg max-h-40 overflow-y-auto">
                          {playerSuggestions[team.id].map((p) => (
                            <button
                              key={p.id}
                              onMouseDown={() => selectPlayer(team.id, p.id)}
                              className="w-full px-2 py-1.5 text-left text-xs hover:bg-gold/10 transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium text-foreground">{p.username}</span>
                              {p.name !== p.username && <span className="text-muted truncate ml-2">{p.name}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="date"
                      value={newMemberJoinedAt[team.id] ?? new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewMemberJoinedAt((prev) => ({ ...prev, [team.id]: e.target.value }))}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
                    />
                    <button
                      onClick={() => handleAddMember(team.id)}
                      disabled={!newMemberPlayerId[team.id]?.trim()}
                      className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
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
