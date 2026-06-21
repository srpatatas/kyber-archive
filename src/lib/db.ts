import { Pool } from "@neondatabase/serverless";
import type { PoolClient } from "@neondatabase/serverless";

let _pool: Pool | null = null;
let _migrated = false;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export async function ensureMigrated(): Promise<void> {
  if (_migrated) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      date TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      player_count INTEGER NOT NULL DEFAULT 0,
      match_count INTEGER NOT NULL DEFAULT 0,
      event_tier TEXT NOT NULL DEFAULT 'weekly',
      ingested_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      melee_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      username TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      player1_wins INTEGER NOT NULL,
      player2_wins INTEGER NOT NULL,
      round_name TEXT NOT NULL,
      date TEXT NOT NULL,
      event_tier TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS placements (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      placement INTEGER NOT NULL,
      event_tier TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ratings (
      player_id TEXT PRIMARY KEY,
      rating INTEGER NOT NULL DEFAULT 1500,
      peak_rating INTEGER NOT NULL DEFAULT 1500,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      tournament_count INTEGER NOT NULL DEFAULT 0,
      tournament_wins INTEGER NOT NULL DEFAULT 0,
      top8s INTEGER NOT NULL DEFAULT 0,
      last_active TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS decklists (
      id SERIAL PRIMARY KEY,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      leader TEXT NOT NULL,
      base TEXT NOT NULL,
      full_name TEXT NOT NULL,
      decklist_guid TEXT
    );

    CREATE TABLE IF NOT EXISTS scraped_data (
      tournament_id INTEGER PRIMARY KEY,
      raw_json TEXT NOT NULL,
      scraped_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_aliases (
      alias TEXT PRIMARY KEY,
      canonical_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aspect_cache (
      deck_key TEXT PRIMARY KEY,
      aspects TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS pending_aliases (
      username TEXT PRIMARY KEY,
      tournament_id INTEGER NOT NULL,
      tournament_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_decklists_tournament ON decklists(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_decklists_player ON decklists(player_id);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
    CREATE INDEX IF NOT EXISTS idx_placements_tournament ON placements(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_placements_player ON placements(player_id);
  `);
  _migrated = true;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureMigrated();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: unknown[]) {
  await ensureMigrated();
  const pool = getPool();
  return pool.query(text, params);
}
