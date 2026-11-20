import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as tables from "@courtpulse/database/schema.tables";
import * as relations from "@courtpulse/database/schema.relations";

const schema = { ...tables, ...relations };

type SqliteSingleton = {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForSqlite = globalThis as unknown as {
  __courtpulseSqlite?: SqliteSingleton;
};

function resolveDatabasePath(): string {
  const configured = process.env.SQLITE_DB_PATH || "./data/courtpulse.db";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function applySqlitePragmas(sqlite: Database.Database): void {
  // WAL allows concurrent reads while writing; NORMAL sync is safe with WAL and fast
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("temp_store = MEMORY");
  sqlite.pragma("cache_size = -20000");
}

function addColumnIfMissing(
  sqlite: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const cols = sqlite
    .prepare(`PRAGMA table_info("${table}")`)
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
  }
}

function ensureTournamentSchemaUpgrades(sqlite: Database.Database): void {
  // Additive upgrades on tournaments
  addColumnIfMissing(sqlite, "tournaments", "admin_token", "text");
  addColumnIfMissing(sqlite, "tournaments", "win_points", "integer NOT NULL DEFAULT 2");
  addColumnIfMissing(sqlite, "tournaments", "draw_points", "integer NOT NULL DEFAULT 1");
  addColumnIfMissing(sqlite, "tournaments", "loss_points", "integer NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "tournaments", "points_to_win", "integer NOT NULL DEFAULT 21");
  addColumnIfMissing(sqlite, "tournaments", "auction_base_price", "integer NOT NULL DEFAULT 500");
  addColumnIfMissing(sqlite, "tournaments", "auction_bid_increment", "integer NOT NULL DEFAULT 100");
  addColumnIfMissing(sqlite, "tournaments", "auction_min_squad_size", "integer NOT NULL DEFAULT 4");
  addColumnIfMissing(sqlite, "tournaments", "auction_max_squad_size", "integer NOT NULL DEFAULT 10");
  addColumnIfMissing(sqlite, "tournaments", "auction_status", "text NOT NULL DEFAULT 'NOT_STARTED'");
  addColumnIfMissing(sqlite, "tournaments", "current_auction_player_id", "text");
  addColumnIfMissing(sqlite, "tournaments", "current_highest_bid", "integer NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "tournaments", "current_highest_team_id", "text");
  addColumnIfMissing(sqlite, "tournaments", "registration_open", "integer NOT NULL DEFAULT 1");
  addColumnIfMissing(sqlite, "tournaments", "fair_play_penalty_points", "integer NOT NULL DEFAULT 1");

  // Additive upgrades on tournament_teams
  addColumnIfMissing(sqlite, "tournament_teams", "owner_name", "text");
  addColumnIfMissing(sqlite, "tournament_teams", "owner_email", "text");
  addColumnIfMissing(sqlite, "tournament_teams", "owner_token", "text");
  addColumnIfMissing(sqlite, "tournament_teams", "purse_budget", "integer");
  addColumnIfMissing(sqlite, "tournament_teams", "fair_play_score", "integer NOT NULL DEFAULT 100");

  // Additive upgrades on tournament_players
  addColumnIfMissing(sqlite, "tournament_players", "mobile", "text");
  addColumnIfMissing(sqlite, "tournament_players", "category", "text NOT NULL DEFAULT 'All-Rounder'");
  addColumnIfMissing(sqlite, "tournament_players", "skill_tier", "text NOT NULL DEFAULT 'Tier B'");
  addColumnIfMissing(sqlite, "tournament_players", "base_price", "integer NOT NULL DEFAULT 500");
  addColumnIfMissing(sqlite, "tournament_players", "auction_status", "text NOT NULL DEFAULT 'PENDING'");
  addColumnIfMissing(sqlite, "tournament_players", "auction_order", "integer NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "tournament_players", "fair_play_notes", "text");

  // Additive upgrades on tournament_enrollments
  addColumnIfMissing(sqlite, "tournament_enrollments", "category", "text NOT NULL DEFAULT 'All-Rounder'");
  addColumnIfMissing(sqlite, "tournament_enrollments", "skill_tier", "text NOT NULL DEFAULT 'Tier B'");
  addColumnIfMissing(sqlite, "tournament_enrollments", "notes", "text");

  // Additive upgrades on tournament_games
  addColumnIfMissing(sqlite, "tournament_games", "court_number", "integer NOT NULL DEFAULT 1");
  addColumnIfMissing(sqlite, "tournament_games", "slot_label", "text");
  addColumnIfMissing(sqlite, "tournament_games", "is_fair_play_catchup", "integer NOT NULL DEFAULT 0");

  // Auction bid ledger table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "auction_bids" (
      "id" text PRIMARY KEY NOT NULL,
      "tournament_id" text NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
      "player_id" text NOT NULL REFERENCES "tournament_players"("id") ON DELETE CASCADE,
      "team_id" text NOT NULL REFERENCES "tournament_teams"("id") ON DELETE CASCADE,
      "amount" integer NOT NULL,
      "bidder_role" text NOT NULL DEFAULT 'OWNER',
      "bidder_label" text NOT NULL,
      "created_at" integer NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "auction_bids_tournament_idx" ON "auction_bids" ("tournament_id");
    CREATE INDEX IF NOT EXISTS "auction_bids_player_idx" ON "auction_bids" ("player_id");

    CREATE TABLE IF NOT EXISTS "tournament_fair_play_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "tournament_id" text NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
      "team_id" text REFERENCES "tournament_teams"("id") ON DELETE CASCADE,
      "player_id" text REFERENCES "tournament_players"("id") ON DELETE CASCADE,
      "type" text NOT NULL DEFAULT 'BONUS',
      "points_delta" integer NOT NULL DEFAULT 0,
      "reason" text NOT NULL,
      "created_by" text,
      "created_at" integer NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "tournament_fair_play_logs_tournament_idx" ON "tournament_fair_play_logs" ("tournament_id");
  `);

  // Backfill unique share tokens for existing tournaments and teams
  const untokenizedTournaments = sqlite
    .prepare(`SELECT id FROM tournaments WHERE admin_token IS NULL OR admin_token = ''`)
    .all() as { id: string }[];
  for (const row of untokenizedTournaments) {
    sqlite
      .prepare(`UPDATE tournaments SET admin_token = ? WHERE id = ?`)
      .run(crypto.randomBytes(12).toString("hex"), row.id);
  }

  const untokenizedTeams = sqlite
    .prepare(`SELECT id FROM tournament_teams WHERE owner_token IS NULL OR owner_token = ''`)
    .all() as { id: string }[];
  for (const row of untokenizedTeams) {
    sqlite
      .prepare(`UPDATE tournament_teams SET owner_token = ? WHERE id = ?`)
      .run(crypto.randomBytes(10).toString("hex"), row.id);
  }
}

function createSqliteInstance(): SqliteSingleton {
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  applySqlitePragmas(sqlite);
  ensureTournamentSchemaUpgrades(sqlite);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

export function getSqliteConnection(): SqliteSingleton {
  if (!globalForSqlite.__courtpulseSqlite) {
    globalForSqlite.__courtpulseSqlite = createSqliteInstance();
  }
  return globalForSqlite.__courtpulseSqlite;
}

export const db = getSqliteConnection().db;
export const sqlite = getSqliteConnection().sqlite;
