import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "midichlorian.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      leader TEXT NOT NULL,
      base TEXT NOT NULL,
      full_name TEXT NOT NULL,
      decklist_guid TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_decklists_tournament ON decklists(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_decklists_player ON decklists(player_id);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
    CREATE INDEX IF NOT EXISTS idx_placements_tournament ON placements(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_placements_player ON placements(player_id);
  `);
}
