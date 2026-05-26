// P31 Gridiron Database Schema
// Football-specific event sourcing

export const INITIAL_SCHEMA = `
-- ============================================
-- CORE TABLES (PGLite-compatible, no extensions)
-- ============================================

CREATE TABLE IF NOT EXISTS franchises (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    owner_pubkey VARCHAR(255) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    abbreviation CHAR(3) NOT NULL,
    turf_balance INTEGER DEFAULT 0,
    prestige INTEGER DEFAULT 50 CHECK (prestige BETWEEN 0 AND 99),
    offensive_philosophy VARCHAR(20) DEFAULT 'BALANCED',
    defensive_scheme VARCHAR(20) DEFAULT 'COVER_3',
    last_turf_claim BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    jersey_number INTEGER NOT NULL CHECK (jersey_number BETWEEN 1 AND 99),
    position VARCHAR(5) NOT NULL CHECK (position IN ('QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P')),
    skin_tone_hex VARCHAR(7) NOT NULL DEFAULT '#E8A87C',
    height_inches INTEGER CHECK (height_inches BETWEEN 60 AND 84),
    weight_lbs INTEGER CHECK (weight_lbs BETWEEN 150 AND 400),
    base_stats JSONB NOT NULL DEFAULT '{
        "speed": 50, "strength": 50, "agility": 50,
        "vision": 50, "awareness": 50, "hands": 50,
        "routeRunning": 50, "blocking": 50, "armStrength": 50,
        "accuracy": 50, "elusiveness": 50, "tackling": 50,
        "coverage": 50, "passRush": 50, "kickingPower": 50,
        "kickingAccuracy": 50
    }',
    fatigue INTEGER DEFAULT 0 CHECK (fatigue BETWEEN 0 AND 100),
    injury_status VARCHAR(20) DEFAULT 'HEALTHY' CHECK (injury_status IN ('HEALTHY', 'QUESTIONABLE', 'DOUBTFUL', 'OUT', 'IR')),
    contract_years INTEGER DEFAULT 1,
    contract_salary INTEGER DEFAULT 500,
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

-- ============================================
-- EVENT SOURCING
-- ============================================

CREATE TABLE IF NOT EXISTS player_stat_mutations (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    mutation_type VARCHAR(50) NOT NULL,
    delta INTEGER NOT NULL,
    xp_yield INTEGER NOT NULL DEFAULT 0,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

-- ============================================
-- MATCH / GAME TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    home_franchise_id TEXT REFERENCES franchises(id),
    away_franchise_id TEXT REFERENCES franchises(id),
    prng_seed BIGINT NOT NULL,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'DISPUTED')),
    home_hash VARCHAR(64),
    away_hash VARCHAR(64),
    scheduled_at TIMESTAMPTZ,
    played_at TIMESTAMPTZ,
    quarter INTEGER DEFAULT 1,
    game_clock INTEGER DEFAULT 900, -- 15 minutes in seconds
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS drives (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
    drive_number INTEGER NOT NULL,
    possession VARCHAR(4) NOT NULL CHECK (possession IN ('HOME', 'AWAY')),
    start_yard_line INTEGER NOT NULL CHECK (start_yard_line BETWEEN 0 AND 100),
    start_quarter INTEGER NOT NULL,
    start_game_clock INTEGER NOT NULL,
    end_yard_line INTEGER CHECK (end_yard_line BETWEEN 0 AND 100),
    end_quarter INTEGER,
    end_game_clock INTEGER,
    plays_count INTEGER DEFAULT 0,
    yards_gained INTEGER DEFAULT 0,
    result VARCHAR(20) CHECK (result IN ('TOUCHDOWN', 'FIELD_GOAL', 'PUNT', 'TURNOVER', 'TURNOVER_ON_DOWNS', 'SAFETY', 'END_OF_HALF', 'END_OF_GAME')),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS play_history (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
    drive_number INTEGER NOT NULL,
    play_number_in_drive INTEGER NOT NULL,
    -- State before play
    down INTEGER NOT NULL CHECK (down BETWEEN 1 AND 4),
    distance INTEGER NOT NULL,
    yard_line INTEGER NOT NULL CHECK (yard_line BETWEEN 0 AND 100),
    possession VARCHAR(4) NOT NULL,
    score_home INTEGER NOT NULL,
    score_away INTEGER NOT NULL,
    game_clock INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    -- Play call
    formation VARCHAR(50),
    personnel VARCHAR(20),
    play_call VARCHAR(50),
    -- Result
    outcome_type VARCHAR(50) NOT NULL,
    yards_gained INTEGER,
    first_down BOOLEAN DEFAULT FALSE,
    touchdown BOOLEAN DEFAULT FALSE,
    turnover_type VARCHAR(20),
    -- Validation
    prng_index INTEGER NOT NULL,
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

-- ============================================
-- SPOON THEORY
-- ============================================

CREATE TABLE IF NOT EXISTS spoon_allocations (
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_spoons INTEGER DEFAULT 6 CHECK (total_spoons BETWEEN 1 AND 12),
    used_spoons INTEGER DEFAULT 0,
    recovery_rate DECIMAL(3,2) DEFAULT 0.5,
    manually_set BOOLEAN DEFAULT FALSE,
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local',
    PRIMARY KEY (franchise_id, date)
);

-- ============================================
-- TRAINING
-- ============================================

CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY, -- UUID v4 generated in JS
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    player_id TEXT REFERENCES players(id),
    drill_id VARCHAR(50) NOT NULL,
    position VARCHAR(5) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    turf_spent INTEGER DEFAULT 0,
    spoon_state INTEGER NOT NULL,
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mutations_player ON player_stat_mutations(player_id, applied_at);
CREATE INDEX IF NOT EXISTS idx_players_franchise ON players(franchise_id);
CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_franchise_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_franchise_id, status);
CREATE INDEX IF NOT EXISTS idx_drives_match ON drives(match_id, drive_number);
CREATE INDEX IF NOT EXISTS idx_play_history_match ON play_history(match_id, drive_number, play_number_in_drive);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW player_current_stats AS
SELECT 
    p.id,
    p.franchise_id,
    p.first_name,
    p.last_name,
    p.position,
    p.base_stats->>'speed' AS base_speed,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_SPEED' THEN m.delta ELSE 0 END), 0) AS delta_speed,
    (p.base_stats->>'speed')::int + COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_SPEED' THEN m.delta ELSE 0 END), 0) AS current_speed,
    -- Repeat pattern for all attributes
    p.base_stats->>'strength' AS base_strength,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_STRENGTH' THEN m.delta ELSE 0 END), 0) AS delta_strength,
    (p.base_stats->>'strength')::int + COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_STRENGTH' THEN m.delta ELSE 0 END), 0) AS current_strength
FROM players p
LEFT JOIN player_stat_mutations m ON p.id = m.player_id
GROUP BY p.id;

CREATE OR REPLACE VIEW franchise_standings AS
SELECT 
    f.id,
    f.team_name,
    f.city,
    COUNT(CASE WHEN m.status = 'VALIDATED' AND m.home_franchise_id = f.id AND m.home_score > m.away_score THEN 1 END) +
    COUNT(CASE WHEN m.status = 'VALIDATED' AND m.away_franchise_id = f.id AND m.away_score > m.home_score THEN 1 END) AS wins,
    COUNT(CASE WHEN m.status = 'VALIDATED' AND m.home_franchise_id = f.id AND m.home_score < m.away_score THEN 1 END) +
    COUNT(CASE WHEN m.status = 'VALIDATED' AND m.away_franchise_id = f.id AND m.away_score < m.home_score THEN 1 END) AS losses
FROM franchises f
LEFT JOIN matches m ON f.id = m.home_franchise_id OR f.id = m.away_franchise_id
GROUP BY f.id;
`;

export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: INITIAL_SCHEMA
  }
];

export const GET_VERSION_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(100),
    applied_at TIMESTAMPTZ DEFAULT NOW()
  );
  SELECT COALESCE(MAX(version), 0) as current_version FROM schema_migrations;
`;

export const RECORD_MIGRATION_SQL = `
  INSERT INTO schema_migrations (version, name) VALUES ($1, $2)
  ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
`;
