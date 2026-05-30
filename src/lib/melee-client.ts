const BASE_URL = "https://melee.gg/api";

function getAuthHeader(): string {
  const clientId = process.env.MELEE_CLIENT_ID;
  const clientSecret = process.env.MELEE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MELEE_CLIENT_ID and MELEE_CLIENT_SECRET must be set");
  }
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Melee API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchAllPages<T>(path: string, extraParams?: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const res = await fetchApi<PaginatedResponse<T>>(path, {
      ...extraParams,
      "variables.page": String(page),
      "variables.pageSize": "250",
    });
    const items = Array.isArray(res.Content) ? res.Content : [];
    all.push(...items);
    if (!res.HasMore || items.length === 0) break;
    page++;
  }
  return all;
}

interface PaginatedResponse<T> {
  StatusCode: number;
  Page: number;
  PageSize: number;
  RecordsTotal: number;
  Content: T[];
  HasMore: boolean;
}

export interface MeleeRound {
  ID: number;
  Guid: string;
  Name: string;
  SortOrder: number;
}

export interface MeleePhase {
  ID: number;
  Guid: string;
  Name: string;
  Format: string;
  SortOrder: number;
  Rounds: MeleeRound[];
}

export interface MeleeTournament {
  ID: number;
  Guid: string;
  Name: string;
  OrganizationName: string;
  Game: string;
  Status: number;
  StatusDescription: string;
  SearchTags: string[];
  LastPairDateTime: string | null;
  Phases: MeleePhase[];
}

export interface MeleePlayer {
  TeamId: number;
  ID: number;
  DisplayName: string;
  FirstName: string;
  LastName: string;
  Name: string;
  Username: string;
}

export interface MeleeCompetitor {
  Team: {
    Players: MeleePlayer[];
    ID: number;
  };
  ID: number;
  GameWins: number;
  GameByes: number;
  GameWinsAndGameByes: number;
}

export interface MeleeMatch {
  Competitors: MeleeCompetitor[];
  Guid: string;
  HasResult: boolean;
  GhostMatch: boolean;
  ByeReason: number | null;
  RoundId: number;
  TournamentId: number;
  RoundName: string;
  ResultString: string;
  GameDraws: number;
}

export interface MeleeStanding {
  Team: {
    Players: MeleePlayer[];
    ID: number;
  };
  Rank: number;
  Points: number;
  MatchWins: number;
  MatchLosses: number;
  MatchDraws: number;
  MatchCount: number;
  GameWins: number;
  GameLosses: number;
  GameDraws: number;
  GameCount: number;
  TournamentId: number;
  RoundNumber: number;
  PhaseName: string | null;
  Round: string;
  Decklists: { DecklistId: string; DecklistName: string }[];
}

export async function getTournament(id: number): Promise<MeleeTournament> {
  return fetchApi<MeleeTournament>(`/tournament/${id}`);
}

export async function getRoundMatches(roundId: number): Promise<MeleeMatch[]> {
  return fetchAllPages<MeleeMatch>(`/match/list/round/${roundId}`);
}

export async function getTournamentStandings(tournamentId: number): Promise<MeleeStanding[]> {
  return fetchAllPages<MeleeStanding>(`/standing/list/current/${tournamentId}`);
}

export async function getDecklistAspects(decklistGuid: string): Promise<string[]> {
  try {
    const data = await fetchApi<{
      Attributes: { k: string; v: string }[];
    }>(`/decklist/${decklistGuid}`);
    return (data.Attributes ?? [])
      .filter((a) => a.k.startsWith("ASPECT_"))
      .map((a) => a.k.replace("ASPECT_", "").toLowerCase());
  } catch {
    return [];
  }
}

export function parseTournamentUrl(url: string): number | null {
  const match = url.match(/Tournament\/View\/(\d+)/i);
  if (match) return parseInt(match[1], 10);
  const match2 = url.match(/^(\d+)$/);
  if (match2) return parseInt(match2[1], 10);
  return null;
}
