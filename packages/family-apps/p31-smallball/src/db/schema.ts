// P31 Smallball Database Schema
// PGLite + Event Sourcing Architecture

export const INITIAL_SCHEMA = `
-- ============================================
-- CORE TABLES (PGLite Compatible - No uuid-ossp)
-- ============================================

CREATE TABLE IF NOT EXISTS franchises (
    id TEXT PRIMARY KEY,
    owner_pubkey VARCHAR(255) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    resin_balance INTEGER DEFAULT 0,
    last_resin_claim BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    skin_tone_hex VARCHAR(7) NOT NULL DEFAULT '#E8A87C',
    jersey_number INTEGER NOT NULL,
    base_stats JSONB NOT NULL DEFAULT '{
        "contact": 50, "power": 50, "eye": 50, "bunt": 50,
        "glove": 50, "range": 50, "armStrength": 50, "armAccuracy": 50,
        "speed": 50, "stamina": 50, "clutch": 50, "baseballIq": 50
    }',
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- ============================================
-- EVENT SOURCING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS player_stat_mutations (
    id TEXT PRIMARY KEY,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    mutation_type VARCHAR(50) NOT NULL CHECK (mutation_type IN (
        -- 12-attribute training mutations
        'TRAIN_CONTACT', 'TRAIN_POWER', 'TRAIN_EYE', 'TRAIN_BUNT',
        'TRAIN_GLOVE', 'TRAIN_RANGE', 'TRAIN_ARM_STRENGTH', 'TRAIN_ARM_ACCURACY',
        'TRAIN_SPEED', 'TRAIN_STAMINA', 'TRAIN_CLUTCH', 'TRAIN_BASEBALL_IQ',
        -- Match & energy mutations
        'MATCH_FATIGUE', 'ENERGY_SPENT', 'ENERGY_REGEN'
    )),
    delta INTEGER NOT NULL,
    xp_yield INTEGER NOT NULL DEFAULT 0,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

-- ============================================
-- MATCH SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    challenger_franchise_id TEXT REFERENCES franchises(id),
    defender_franchise_id TEXT REFERENCES franchises(id),
    seed BIGINT NOT NULL,
    challenger_hash VARCHAR(64),
    defender_hash VARCHAR(64),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'disputed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS match_history_events (
    id TEXT PRIMARY KEY,
    match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL,
    actor_id TEXT REFERENCES players(id),
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}',
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- ============================================
-- SPOON THEORY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS spoon_allocations (
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_spoons INTEGER DEFAULT 6 CHECK (total_spoons BETWEEN 1 AND 12),
    used_spoons INTEGER DEFAULT 0,
    recovery_rate DECIMAL(3,2) DEFAULT 0.5,
    manually_set BOOLEAN DEFAULT FALSE,
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (franchise_id, date)
);

-- ============================================
-- TRAINING & ECONOMY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    drill_id VARCHAR(50) NOT NULL,
    player_id TEXT REFERENCES players(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    resin_spent INTEGER DEFAULT 0,
    spoon_state INTEGER NOT NULL,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- ============================================
-- 12-ATTRIBUTE TRAINING SYSTEM TABLES
-- ============================================

-- Player energy economy (0-100 per player)
CREATE TABLE IF NOT EXISTS player_energy (
    player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    current_energy INTEGER NOT NULL DEFAULT 100 CHECK (current_energy BETWEEN 0 AND 100),
    max_energy INTEGER NOT NULL DEFAULT 100 CHECK (max_energy BETWEEN 50 AND 150),
    last_regen_timestamp BIGINT NOT NULL DEFAULT 0,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- Training facilities per franchise (5 stations x 3 tiers)
CREATE TABLE IF NOT EXISTS training_facilities (
    id TEXT PRIMARY KEY,
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    facility_type VARCHAR(20) NOT NULL CHECK (facility_type IN (
        'IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN', 'POP_FLY', 'FILM_ROOM'
    )),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
    pack_tier VARCHAR(20) NOT NULL DEFAULT 'SANDLOT' CHECK (pack_tier IN ('SANDLOT', 'HS_GYM', 'PRO_COMPLEX')),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    UNIQUE(franchise_id, facility_type)
);

-- Scheduled training (auto-mode configuration)
CREATE TABLE IF NOT EXISTS scheduled_training (
    id TEXT PRIMARY KEY,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    station VARCHAR(20) NOT NULL CHECK (station IN (
        'IRON_MIKE', 'TRACK_SLEDS', 'BULLPEN', 'POP_FLY', 'FILM_ROOM'
    )),
    focus_attribute VARCHAR(20) NOT NULL DEFAULT 'BALANCED',
    auto_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- Training event log (CRDT for offline-first replay)
CREATE TABLE IF NOT EXISTS training_events (
    id TEXT PRIMARY KEY,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN (
        'SCHEDULE_TRAINING', 'EXECUTE_MANUAL', 'EXECUTE_AUTO', 'CANCEL_TRAINING'
    )),
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    franchise_id TEXT REFERENCES franchises(id) ON DELETE CASCADE,
    station VARCHAR(20) NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    energy_spent INTEGER NOT NULL DEFAULT 0,
    xp_gained JSONB NOT NULL DEFAULT '{}',
    facility_level INTEGER NOT NULL DEFAULT 1,
    was_manual BOOLEAN NOT NULL DEFAULT FALSE,
    minigame_score INTEGER,
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(255) NOT NULL DEFAULT 'local'
);

-- ============================================
-- INDICES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mutations_player ON player_stat_mutations(player_id, applied_at);
CREATE INDEX IF NOT EXISTS idx_mutations_clock ON player_stat_mutations(_crdt_clock);
CREATE INDEX IF NOT EXISTS idx_match_events_seq ON match_history_events(match_id, sequence_id);
CREATE INDEX IF NOT EXISTS idx_match_events_clock ON match_history_events(_crdt_clock);
CREATE INDEX IF NOT EXISTS idx_players_franchise ON players(franchise_id);
CREATE INDEX IF NOT EXISTS idx_matches_challenger ON matches(challenger_franchise_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_defender ON matches(defender_franchise_id, status);
CREATE INDEX IF NOT EXISTS idx_training_franchise ON training_sessions(franchise_id, started_at);
CREATE INDEX IF NOT EXISTS idx_training_events_player ON training_events(player_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_training_events_franchise ON training_events(franchise_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_training_player ON scheduled_training(player_id, auto_enabled);
CREATE INDEX IF NOT EXISTS idx_facilities_franchise ON training_facilities(franchise_id, facility_type);

-- ============================================
-- VIEWS FOR PROJECTIONS
-- ============================================

-- 12-Attribute player stats with all training mutations applied
CREATE OR REPLACE VIEW player_current_stats AS
SELECT 
    p.id,
    p.franchise_id,
    p.first_name,
    p.last_name,
    p.skin_tone_hex,
    p.jersey_number,
    pe.current_energy,
    pe.max_energy,
    pe.last_regen_timestamp,
    
    -- === BASE STATS (12 attributes) ===
    -- Hitting
    (p.base_stats->>'contact')::int AS base_contact,
    (p.base_stats->>'power')::int AS base_power,
    (p.base_stats->>'eye')::int AS base_eye,
    (p.base_stats->>'bunt')::int AS base_bunt,
    -- Defense/Pitching
    (p.base_stats->>'glove')::int AS base_glove,
    (p.base_stats->>'range')::int AS base_range,
    (p.base_stats->>'armStrength')::int AS base_arm_strength,
    (p.base_stats->>'armAccuracy')::int AS base_arm_accuracy,
    -- Physical/Mental
    (p.base_stats->>'speed')::int AS base_speed,
    (p.base_stats->>'stamina')::int AS base_stamina,
    (p.base_stats->>'clutch')::int AS base_clutch,
    (p.base_stats->>'baseballIq')::int AS base_baseball_iq,
    
    -- === TRAINING DELTAS ===
    -- Hitting
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_CONTACT' THEN m.delta ELSE 0 END), 0) AS delta_contact,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_POWER' THEN m.delta ELSE 0 END), 0) AS delta_power,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_EYE' THEN m.delta ELSE 0 END), 0) AS delta_eye,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_BUNT' THEN m.delta ELSE 0 END), 0) AS delta_bunt,
    -- Defense/Pitching
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_GLOVE' THEN m.delta ELSE 0 END), 0) AS delta_glove,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_RANGE' THEN m.delta ELSE 0 END), 0) AS delta_range,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_ARM_STRENGTH' THEN m.delta ELSE 0 END), 0) AS delta_arm_strength,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_ARM_ACCURACY' THEN m.delta ELSE 0 END), 0) AS delta_arm_accuracy,
    -- Physical/Mental
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_SPEED' THEN m.delta ELSE 0 END), 0) AS delta_speed,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_STAMINA' THEN m.delta ELSE 0 END), 0) AS delta_stamina,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_CLUTCH' THEN m.delta ELSE 0 END), 0) AS delta_clutch,
    COALESCE(SUM(CASE WHEN m.mutation_type = 'TRAIN_BASEBALL_IQ' THEN m.delta ELSE 0 END), 0) AS delta_baseball_iq,
    
    -- === FATIGUE & ENERGY ===
    COALESCE(SUM(CASE WHEN m.mutation_type = 'MATCH_FATIGUE' THEN m.delta ELSE 0 END), 0) AS delta_fatigue
    
FROM players p
LEFT JOIN player_stat_mutations m ON p.id = m.player_id
LEFT JOIN player_energy pe ON p.id = pe.player_id
GROUP BY p.id, pe.current_energy, pe.max_energy, pe.last_regen_timestamp;

CREATE OR REPLACE VIEW franchise_standings AS
SELECT 
    f.id,
    f.team_name,
    COUNT(CASE WHEN m.status = 'validated' AND m.challenger_franchise_id = f.id THEN 1 END) AS wins,
    COUNT(CASE WHEN m.status = 'validated' AND m.defender_franchise_id = f.id THEN 1 END) AS losses,
    COUNT(CASE WHEN m.status = 'pending' AND (m.challenger_franchise_id = f.id OR m.defender_franchise_id = f.id) THEN 1 END) AS pending_matches
FROM franchises f
LEFT JOIN matches m ON f.id = m.challenger_franchise_id OR f.id = m.defender_franchise_id
GROUP BY f.id;

-- ============================================
-- TRAINING SYSTEM VIEWS
-- ============================================

-- Effective player stats (base + delta, capped at 99)
CREATE OR REPLACE VIEW player_effective_stats AS
SELECT 
    id,
    franchise_id,
    first_name,
    last_name,
    jersey_number,
    current_energy,
    max_energy,
    
    -- === EFFECTIVE STATS (capped at 99) ===
    -- Hitting
    LEAST(99, GREATEST(1, base_contact + delta_contact)) AS contact,
    LEAST(99, GREATEST(1, base_power + delta_power)) AS power,
    LEAST(99, GREATEST(1, base_eye + delta_eye)) AS eye,
    LEAST(99, GREATEST(1, base_bunt + delta_bunt)) AS bunt,
    -- Defense/Pitching
    LEAST(99, GREATEST(1, base_glove + delta_glove)) AS glove,
    LEAST(99, GREATEST(1, base_range + delta_range)) AS range,
    LEAST(99, GREATEST(1, base_arm_strength + delta_arm_strength)) AS arm_strength,
    LEAST(99, GREATEST(1, base_arm_accuracy + delta_arm_accuracy)) AS arm_accuracy,
    -- Physical/Mental
    LEAST(99, GREATEST(1, base_speed + delta_speed)) AS speed,
    LEAST(99, GREATEST(1, base_stamina + delta_stamina)) AS stamina,
    LEAST(99, GREATEST(1, base_clutch + delta_clutch)) AS clutch,
    LEAST(99, GREATEST(1, base_baseball_iq + delta_baseball_iq)) AS baseball_iq
    
FROM player_current_stats;

-- Training summary per player (last 7 days)
CREATE OR REPLACE VIEW player_training_summary AS
SELECT 
    player_id,
    COUNT(*) AS total_sessions,
    COUNT(CASE WHEN was_manual THEN 1 END) AS manual_sessions,
    SUM(energy_spent) AS total_energy_spent,
    SUM((xp_gained->>'contact')::int) AS xp_contact,
    SUM((xp_gained->>'power')::int) AS xp_power,
    SUM((xp_gained->>'eye')::int) AS xp_eye,
    SUM((xp_gained->>'bunt')::int) AS xp_bunt,
    SUM((xp_gained->>'glove')::int) AS xp_glove,
    SUM((xp_gained->>'range')::int) AS xp_range,
    SUM((xp_gained->>'armStrength')::int) AS xp_arm_strength,
    SUM((xp_gained->>'armAccuracy')::int) AS xp_arm_accuracy,
    SUM((xp_gained->>'speed')::int) AS xp_speed,
    SUM((xp_gained->>'stamina')::int) AS xp_stamina,
    SUM((xp_gained->>'clutch')::int) AS xp_clutch,
    SUM((xp_gained->>'baseballIq')::int) AS xp_baseball_iq,
    MAX(executed_at) AS last_training_at
FROM training_events
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY player_id;
`;

// Schema migration tracking
export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: INITIAL_SCHEMA
  }
];

// Helper to get current schema version
export const GET_VERSION_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(100),
    applied_at TIMESTAMPTZ DEFAULT NOW()
  );
  SELECT COALESCE(MAX(version), 0) as current_version FROM schema_migrations;
`;

// Helper to record migration
export const RECORD_MIGRATION_SQL = `
  INSERT INTO schema_migrations (version, name) VALUES ($1, $2)
  ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
`;
