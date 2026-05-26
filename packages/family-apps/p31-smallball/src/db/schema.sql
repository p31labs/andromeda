-- P31 Smallball Database Schema
-- CWP: Phase 0 Validation - Local-First CRDT Event Sourcing
-- Schema: p31.smallball/0.1.0
-- Target: PGLite (WASM PostgreSQL) + ElectricSQL sync
--
-- This schema implements:
-- 1. Append-only event log (match history)
-- 2. Commutative stat mutations (CRDT counters)
-- 3. Sync watermarks (per-device progress tracking)
-- 4. Deterministic simulation cache (anti-cheat replay)
--
-- CRDT Strategy: Hybrid Logical Clocks (HLC) for causality
-- Conflict Resolution: Last-Write-Wins (LWW) for events, Delta-Sync for stats
--
-- References:
-- - docs/SIC-POVM-K4-ARCHITECTURE.md (rigidity, isostatic design)
-- - p31-constants.json (canon numbers)
-- - MatchSimulator.ts (deterministic simulation)

-- ============================================
-- CORE ENTITY TABLES
-- ============================================

-- Franchises (teams/identities)
CREATE TABLE IF NOT EXISTS franchises (
    id TEXT PRIMARY KEY, -- UUID v4
    owner_pubkey TEXT NOT NULL, -- Wallet/public key
    team_name TEXT NOT NULL,
    resin_balance INTEGER DEFAULT 0, -- Cross-game currency
    last_resin_claim BIGINT, -- Unix timestamp ms
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CRDT metadata (required for ElectricSQL)
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    
    -- ElectricSQL sync metadata
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_resin CHECK (resin_balance >= 0)
);

-- Players (roster members)
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY, -- UUID v4
    franchise_id TEXT NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    jersey_number INTEGER CHECK (jersey_number >= 0 AND jersey_number <= 99),
    
    -- Visual customization
    skin_tone_hex TEXT DEFAULT '#ffdbac',
    hair_style TEXT DEFAULT 'short',
    
    -- 12-Attribute System (base stats)
    -- HITTING (4)
    base_contact INTEGER DEFAULT 50 CHECK (base_contact >= 0 AND base_contact <= 99),
    base_power INTEGER DEFAULT 50 CHECK (base_power >= 0 AND base_power <= 99),
    base_eye INTEGER DEFAULT 50 CHECK (base_eye >= 0 AND base_eye <= 99),
    base_bunt INTEGER DEFAULT 50 CHECK (base_bunt >= 0 AND base_bunt <= 99),
    -- DEFENSE (4)
    base_glove INTEGER DEFAULT 50 CHECK (base_glove >= 0 AND base_glove <= 99),
    base_range INTEGER DEFAULT 50 CHECK (base_range >= 0 AND base_range <= 99),
    base_arm_strength INTEGER DEFAULT 50 CHECK (base_arm_strength >= 0 AND base_arm_strength <= 99),
    base_arm_accuracy INTEGER DEFAULT 50 CHECK (base_arm_accuracy >= 0 AND base_arm_accuracy <= 99),
    -- PHYSICAL/MENTAL (4)
    base_speed INTEGER DEFAULT 50 CHECK (base_speed >= 0 AND base_speed <= 99),
    base_stamina INTEGER DEFAULT 50 CHECK (base_stamina >= 0 AND base_stamina <= 99),
    base_clutch INTEGER DEFAULT 50 CHECK (base_clutch >= 0 AND base_clutch <= 99),
    base_baseball_iq INTEGER DEFAULT 50 CHECK (base_baseball_iq >= 0 AND base_baseball_iq <= 99),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CRDT
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_franchise (franchise_id)
);

-- ============================================
-- EVENT SOURCING (Match History)
-- ============================================
-- Append-only log of all match events
-- This is the source of truth for anti-cheat verification

CREATE TABLE IF NOT EXISTS match_history_events (
    id TEXT PRIMARY KEY, -- UUID v4
    match_id TEXT NOT NULL,
    sequence_id INTEGER NOT NULL, -- Ordering within match (0, 1, 2, ...)
    actor_id TEXT NOT NULL, -- Franchise UUID who generated this event
    
    -- Event type (domain-specific)
    action_type TEXT NOT NULL CHECK (action_type IN (
        'PITCH_THROWN',      -- Pitcher threw a pitch
        'SWING_TAKEN',       -- Batter attempted swing
        'BALL_PUT_IN_PLAY',  -- Contact made
        'OUT_RECORDED',      -- Defensive out
        'RUN_SCORED',        -- Offensive run
        'INNING_END',        -- 3 outs reached
        'GAME_END'           -- Match complete
    )),
    
    -- Event payload (structured JSON)
    action_data JSONB NOT NULL DEFAULT '{}',
    -- Example structures:
    -- PITCH_THROWN: { velocity: 94.5, location: [0.2, -0.1], type: 'FASTBALL' }
    -- SWING_TAKEN: { timing: 23, decision: 'SWING', contact_quality: 0.73 }
    -- RUN_SCORED: { player_id: '...', base_reached: 'HOME' }
    
    -- Deterministic verification (anti-cheat)
    event_hash TEXT, -- SHA-256 of canonical JSON (this row at time of creation)
    
    -- CRDT metadata (HLC - Hybrid Logical Clock)
    _crdt_clock BIGINT NOT NULL, -- (physical_ms << 20) | logical_counter
    _crdt_node_id TEXT NOT NULL, -- Device identifier (e.g., 'will-laptop', 'aj-phone')
    
    -- ElectricSQL sync
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(match_id, sequence_id), -- No duplicate sequences
    INDEX idx_match_sequence (match_id, sequence_id), -- Fast match replay
    INDEX idx_actor (actor_id), -- Find all events by franchise
    INDEX idx_crdt_clock (_crdt_node_id, _crdt_clock) -- Sync ordering
);

-- Match metadata (one row per match)
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    challenger_franchise_id TEXT NOT NULL REFERENCES franchises(id),
    defender_franchise_id TEXT NOT NULL REFERENCES franchises(id),
    
    -- Deterministic simulation parameters
    seed TEXT NOT NULL, -- CSPRNG seed used for simulation
    seed_source TEXT DEFAULT 'cloudflare', -- 'cloudflare', 'local', 'peer'
    
    -- Anti-cheat hashes
    challenger_hash TEXT, -- Hash of challenger's event log
    defender_hash TEXT, -- Hash of defender's event log (may be NULL until sync)
    
    -- Match outcome (derived from event log, stored for query performance)
    challenger_score INTEGER DEFAULT 0,
    defender_score INTEGER DEFAULT 0,
    winner_id TEXT REFERENCES franchises(id), -- NULL if tie or disputed
    
    -- Match lifecycle
    status TEXT NOT NULL CHECK (status IN (
        'PENDING',      -- Created, waiting for seed
        'SEED_ISSUED',  -- Seed assigned, can simulate
        'CHALLENGER_SIMULATED', -- Challenger has submitted hash
        'DEFENDER_SIMULATED',   -- Defender has submitted hash
        'VALIDATED',    -- Hashes match, match confirmed
        'DISPUTED'      -- Hash mismatch, requires arbitration
    )) DEFAULT 'PENDING',
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP, -- 7-day TTL for unfinished matches
    
    -- CRDT
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_challenger (challenger_franchise_id, created_at),
    INDEX idx_defender (defender_franchise_id, created_at),
    INDEX idx_status (status, expires_at)
);

-- ============================================
-- STAT MUTATIONS (CRDT Counters)
-- ============================================
-- Commutative operations that can apply in any order
-- These power the training system and match effects

CREATE TABLE IF NOT EXISTS stat_mutations (
    id TEXT PRIMARY KEY, -- UUID v4
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    
    -- Mutation type (12-attribute system + match effects)
    mutation_type TEXT NOT NULL CHECK (mutation_type IN (
        -- HITTING (4)
        'TRAIN_CONTACT', 'TRAIN_POWER', 'TRAIN_EYE', 'TRAIN_BUNT',
        -- DEFENSE/PITCHING (4)
        'TRAIN_GLOVE', 'TRAIN_RANGE', 'TRAIN_ARM_STRENGTH', 'TRAIN_ARM_ACCURACY',
        -- PHYSICAL/MENTAL (4)
        'TRAIN_SPEED', 'TRAIN_STAMINA', 'TRAIN_CLUTCH', 'TRAIN_BASEBALL_IQ',
        -- MATCH EFFECTS (commutative)
        'MATCH_FATIGUE',     -- Post-match fatigue (negative)
        'ENERGY_SPENT',      -- Training energy cost
        'ENERGY_REGEN'       -- Energy recovery over time
    )),
    
    -- The delta (can be negative for fatigue, positive for gains)
    delta INTEGER NOT NULL,
    
    -- XP yield (for leveling system)
    xp_yield INTEGER DEFAULT 0,
    
    -- Provenance (where did this mutation come from?)
    source_match_id TEXT REFERENCES matches(id),
    source_event_id TEXT REFERENCES match_history_events(id),
    source_training_id TEXT, -- For training-specific tracking
    
    -- Applied state (for idempotency)
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reverted BOOLEAN DEFAULT FALSE, -- For undo/compensation
    
    -- CRDT (these are the critical columns for sync)
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Optimization: index for applying mutations in clock order
    INDEX idx_player_clock (player_id, _crdt_clock),
    INDEX idx_franchise_type (franchise_id, mutation_type, applied_at),
    INDEX idx_source_match (source_match_id)
);

-- ============================================
-- SYNC WATERMARKS (Device Tracking)
// Critical for ElectricSQL delta sync
// Each device knows its last successful sync position

CREATE TABLE IF NOT EXISTS sync_watermarks (
    node_id TEXT PRIMARY KEY, -- Device identifier (e.g., 'will-laptop')
    
    -- Last CRDT clock successfully synced to/from server
    last_crdt_clock BIGINT NOT NULL DEFAULT 0,
    
    -- Sync timing
    last_sync_at TIMESTAMP,
    last_sync_direction TEXT CHECK (last_sync_direction IN ('UP', 'DOWN', 'BIDIRECTIONAL')),
    
    -- Sync health
    consecutive_failures INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- ElectricSQL specific
    _electric_meta JSONB, -- ElectricSQL internal metadata
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sync_needed (last_crdt_clock, last_sync_at)
);

-- ============================================
-- DETERMINISTIC SIMULATION CACHE
// Enables anti-cheat replay and quick match verification

CREATE TABLE IF NOT EXISTS match_simulation_cache (
    match_id TEXT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Simulation inputs
    seed TEXT NOT NULL,
    params_hash TEXT NOT NULL, -- SHA-256 of TeamStats + DefensiveAI JSON
    
    -- Simulation outputs
    event_log_hash TEXT NOT NULL, -- Final deterministic hash
    challenger_score INTEGER,
    defender_score INTEGER,
    innings_played INTEGER,
    
    -- Full replay data (compressed JSON)
    events_json JSONB, -- AtBatResult[] serialized
    
    -- Verification
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by_node TEXT, -- Which device ran this simulation
    verified_by_hash TEXT, -- If another device confirmed
    
    -- TTL (cache invalidation)
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    
    INDEX idx_hash_lookup (event_log_hash),
    INDEX idx_expires (expires_at)
);

-- ============================================
-- TRAINING SYSTEM (12-Attribute Economy)
// Schedulable training with energy costs

CREATE TABLE IF NOT EXISTS training_facilities (
    id TEXT PRIMARY KEY,
    franchise_id TEXT NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    facility_type TEXT NOT NULL CHECK (facility_type IN (
        'IRON_MIKE',    -- Contact, Power (batting cage)
        'TRACK_SLEDS',  -- Speed, Stamina (rapid-tap)
        'BULLPEN',      -- Arm Strength, Arm Accuracy
        'POP_FLY',      -- Glove, Range (spatial catching)
        'FILM_ROOM'     -- Eye, Baseball IQ, Clutch
    )),
    facility_level INTEGER DEFAULT 1 CHECK (facility_level BETWEEN 1 AND 3),
    pack_tier TEXT DEFAULT 'SANDLOT' CHECK (pack_tier IN ('SANDLOT', 'HS_GYM', 'PRO_COMPLEX')),
    
    -- CRDT
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_franchise_facility (franchise_id, facility_type)
);

-- Scheduled training sessions
CREATE TABLE IF NOT EXISTS scheduled_training (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    franchise_id TEXT NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    
    station TEXT NOT NULL, -- Same enum as facility_type
    focus_attribute TEXT, -- Specific attribute or NULL for balanced
    
    -- Scheduling
    scheduled_at BIGINT NOT NULL, -- Unix timestamp ms
    auto_enabled BOOLEAN DEFAULT FALSE, -- Run automatically when energy available
    recurring_days TEXT, -- JSON array [1,3,5] for Mon/Wed/Fri
    
    -- Execution state
    last_executed_at BIGINT,
    execution_count INTEGER DEFAULT 0,
    
    -- CRDT
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_player_schedule (player_id, scheduled_at),
    INDEX idx_franchise_auto (franchise_id, auto_enabled, scheduled_at)
);

-- ============================================
-- SPOON ALLOCATION (Cognitive Load Tracking)
// Per-day spoon budget for accessibility

CREATE TABLE IF NOT EXISTS spoon_allocations (
    id TEXT PRIMARY KEY,
    franchise_id TEXT NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- ISO date (YYYY-MM-DD)
    
    total_spoons INTEGER NOT NULL CHECK (total_spoons IN (1, 3, 6, 9, 12)),
    used_spoons INTEGER DEFAULT 0 CHECK (used_spoons <= total_spoons),
    recovery_rate REAL DEFAULT 0.5, -- spoons per hour
    
    manually_set BOOLEAN DEFAULT FALSE, -- User override vs algorithmic
    
    -- CRDT
    _crdt_clock BIGINT NOT NULL,
    _crdt_node_id TEXT NOT NULL,
    _modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(franchise_id, date),
    INDEX idx_date_lookup (franchise_id, date)
);

-- ============================================
-- ELECTRICSQL COMPATIBILITY VIEWS
// Expose tables in ElectricSQL-compatible format

-- View for ElectricSQL: matches with flattened status
CREATE VIEW IF NOT EXISTS v_matches_sync AS
SELECT 
    m.*,
    CASE 
        WHEN m.status = 'VALIDATED' THEN 1
        WHEN m.status = 'DISPUTED' THEN -1
        ELSE 0
    END as sync_status_code
FROM matches m
WHERE m._modified_at > (SELECT last_sync_at FROM sync_watermarks WHERE node_id = m._crdt_node_id);

-- View: Current player effective stats (base + sum of mutations)
-- This is computed locally; not synced directly
CREATE VIEW IF NOT EXISTS v_player_effective_stats AS
SELECT 
    p.id as player_id,
    p.franchise_id,
    -- Sum all applied mutations (not reverted)
    p.base_contact + COALESCE(SUM(CASE WHEN sm.mutation_type = 'TRAIN_CONTACT' AND NOT sm.reverted THEN sm.delta ELSE 0 END), 0) as effective_contact,
    p.base_power + COALESCE(SUM(CASE WHEN sm.mutation_type = 'TRAIN_POWER' AND NOT sm.reverted THEN sm.delta ELSE 0 END), 0) as effective_power,
    p.base_eye + COALESCE(SUM(CASE WHEN sm.mutation_type = 'TRAIN_EYE' AND NOT sm.reverted THEN sm.delta ELSE 0 END), 0) as effective_eye,
    p.base_speed + COALESCE(SUM(CASE WHEN sm.mutation_type = 'TRAIN_SPEED' AND NOT sm.reverted THEN sm.delta ELSE 0 END), 0) as effective_speed,
    -- All 12 attributes...
    COUNT(sm.id) as total_mutations
FROM players p
LEFT JOIN stat_mutations sm ON p.id = sm.player_id
GROUP BY p.id;

-- ============================================
-- INITIAL DATA (Bootstrap)
// Minimal data for fresh install

-- Insert default franchise (will be replaced with actual wallet)
INSERT OR IGNORE INTO franchises (id, owner_pubkey, team_name, _crdt_clock, _crdt_node_id)
VALUES ('default-franchise', 'placeholder', 'My Team', 0, 'bootstrap');

-- Insert sync watermark for bootstrap node
INSERT OR IGNORE INTO sync_watermarks (node_id, last_crdt_clock)
VALUES ('bootstrap', 0);

-- ============================================
-- RISK MITIGATION NOTES
// 
// 1. CRDT Clock Drift: HLC handles 10ms-level clock differences
// 2. Conflict Resolution: LWW for events (last valid write wins)
// 3. Offline Duration: 7-day match TTL prevents stale matches
// 4. Verification: Deterministic simulation cache enables replay
// 5. Sync: ElectricSQL handles delta sync, this schema provides the structure
//
// Determinism Guarantee:
// If Will's laptop and AJ's phone have the same seed and same stats,
// they will produce the same event_log_hash. The MatchCoordinatorDO
// validates this. If hashes differ, the match is disputed and resolved
// by validator set (future: K4 cage topology arbitrators).
//
// This eliminates the need for a central game server while maintaining
// mathematical anti-cheat guarantees through cryptographic commitments.
