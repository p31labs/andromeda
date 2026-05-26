-- P31 Smallball — Cloudflare D1 Schema
-- Mirrors local PGLite schema for sync persistence

CREATE TABLE IF NOT EXISTS sync_cursors (
    franchise_id TEXT PRIMARY KEY,
    last_synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    franchise_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    jersey_number INTEGER NOT NULL,
    base_stats TEXT NOT NULL DEFAULT '{}',
    skin_tone_hex TEXT NOT NULL DEFAULT '#ffdbac',
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_franchise ON players(franchise_id);

CREATE TABLE IF NOT EXISTS player_stat_mutations (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    mutation_type TEXT NOT NULL,
    stat_key TEXT NOT NULL,
    delta INTEGER NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mutations_player ON player_stat_mutations(player_id);

CREATE TABLE IF NOT EXISTS player_energy (
    player_id TEXT PRIMARY KEY,
    current_energy REAL NOT NULL DEFAULT 100,
    max_energy REAL NOT NULL DEFAULT 100,
    last_regen_timestamp INTEGER NOT NULL DEFAULT 0,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS training_facilities (
    id TEXT PRIMARY KEY,
    franchise_id TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    pack_tier TEXT NOT NULL DEFAULT 'SANDLOT',
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_facilities_franchise ON training_facilities(franchise_id);

CREATE TABLE IF NOT EXISTS training_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    player_id TEXT NOT NULL,
    franchise_id TEXT NOT NULL,
    station TEXT NOT NULL,
    energy_spent INTEGER NOT NULL DEFAULT 0,
    xp_gained TEXT NOT NULL DEFAULT '{}',
    facility_level INTEGER NOT NULL DEFAULT 1,
    was_manual INTEGER NOT NULL DEFAULT 1,
    minigame_score INTEGER DEFAULT 0,
    performed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_franchise ON training_events(franchise_id);
CREATE INDEX IF NOT EXISTS idx_events_player ON training_events(player_id);

CREATE TABLE IF NOT EXISTS scheduled_training (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    franchise_id TEXT NOT NULL,
    station TEXT NOT NULL,
    focus_attribute TEXT NOT NULL DEFAULT 'BALANCED',
    auto_enabled INTEGER NOT NULL DEFAULT 0,
    scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_executed_at TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_franchise ON scheduled_training(franchise_id);
