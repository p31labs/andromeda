import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';

// Database instance singleton
let dbInstance: PGlite | null = null;

export interface DatabaseContextValue {
  db: PGlite | null;
  isInitialized: boolean;
  error: Error | null;
  refresh: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  db: null,
  isInitialized: false,
  error: null,
  refresh: () => {},
});

export const useDatabase = () => useContext(DatabaseContext);

// SQL Initialization Schema - Event Sourced with CRDT support
const INIT_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Franchises (CRDT-enabled)
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_pubkey VARCHAR(255) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    resin_balance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 2. Players (CRDT-enabled)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    skin_tone_hex VARCHAR(7) NOT NULL DEFAULT '#ffdbac',
    jersey_number INTEGER NOT NULL,
    base_stats JSONB NOT NULL DEFAULT '{"contact":50,"power":50,"eye":50,"bunt":50,"glove":50,"range":50,"armStrength":50,"armAccuracy":50,"speed":50,"stamina":50,"clutch":50,"baseballIq":50}'::jsonb,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- Index for franchise lookups
CREATE INDEX IF NOT EXISTS idx_players_franchise ON players(franchise_id);

-- 3. Player Stat Mutations (APPEND ONLY - Event Sourced)
CREATE TABLE IF NOT EXISTS player_stat_mutations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    mutation_type VARCHAR(50) NOT NULL,
    stat_key VARCHAR(50) NOT NULL,
    delta INTEGER NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_mutations_player ON player_stat_mutations(player_id);
CREATE INDEX IF NOT EXISTS idx_mutations_applied ON player_stat_mutations(applied_at);

-- 4. Match History Events (APPEND ONLY - Deterministic Log)
CREATE TABLE IF NOT EXISTS match_history_events (
    match_id UUID NOT NULL,
    sequence_id INTEGER NOT NULL,
    actor_id UUID REFERENCES players(id),
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL,
    deterministic_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (match_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_history_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_sequence ON match_history_events(sequence_id);

-- 5. Async Match Queue (for decentralized play)
CREATE TABLE IF NOT EXISTS async_match_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_franchise_id UUID REFERENCES franchises(id),
    defender_franchise_id UUID REFERENCES franchises(id),
    match_seed VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    challenger_actions JSONB DEFAULT '[]'::jsonb,
    defender_actions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_challenger ON async_match_queue(challenger_franchise_id);
CREATE INDEX IF NOT EXISTS idx_queue_defender ON async_match_queue(defender_franchise_id);

-- 6. View for Player Effective Stats (auto-updates via live query)
CREATE OR REPLACE VIEW player_effective_stats AS
SELECT 
    p.id,
    p.franchise_id,
    p.first_name,
    p.last_name,
    p.jersey_number,
    p.skin_tone_hex,
    p.base_stats,
    COALESCE(SUM(CASE WHEN m.stat_key = 'contact' THEN m.delta ELSE 0 END), 0) as contact_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'power' THEN m.delta ELSE 0 END), 0) as power_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'eye' THEN m.delta ELSE 0 END), 0) as eye_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'bunt' THEN m.delta ELSE 0 END), 0) as bunt_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'glove' THEN m.delta ELSE 0 END), 0) as glove_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'range' THEN m.delta ELSE 0 END), 0) as range_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'armStrength' THEN m.delta ELSE 0 END), 0) as armStrength_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'armAccuracy' THEN m.delta ELSE 0 END), 0) as armAccuracy_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'speed' THEN m.delta ELSE 0 END), 0) as speed_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'stamina' THEN m.delta ELSE 0 END), 0) as stamina_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'clutch' THEN m.delta ELSE 0 END), 0) as clutch_mutation,
    COALESCE(SUM(CASE WHEN m.stat_key = 'baseballIq' THEN m.delta ELSE 0 END), 0) as baseballIq_mutation
FROM players p
LEFT JOIN player_stat_mutations m ON p.id = m.player_id
GROUP BY p.id;

-- 7. Scout Reports (low-energy async rewards)
CREATE TABLE IF NOT EXISTS scout_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id),
    discovered_player_id UUID REFERENCES players(id),
    report_type VARCHAR(20) NOT NULL,
    reward_resin INTEGER DEFAULT 0,
    is_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_scout_franchise ON scout_reports(franchise_id);

-- 8. Player Energy (per-player energy economy)
CREATE TABLE IF NOT EXISTS player_energy (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    current_energy REAL NOT NULL DEFAULT 100,
    max_energy REAL NOT NULL DEFAULT 100,
    last_regen_timestamp BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 9. Training Facilities (per-franchise station levels)
CREATE TABLE IF NOT EXISTS training_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id),
    facility_type VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    pack_tier VARCHAR(20) NOT NULL DEFAULT 'SANDLOT',
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_facilities_franchise ON training_facilities(franchise_id);

-- 10. Training Events (APPEND ONLY - Event Sourced)
CREATE TABLE IF NOT EXISTS training_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    player_id UUID REFERENCES players(id),
    franchise_id UUID REFERENCES franchises(id),
    station VARCHAR(50) NOT NULL,
    energy_spent INTEGER NOT NULL DEFAULT 0,
    xp_gained JSONB DEFAULT '{}'::jsonb,
    facility_level INTEGER NOT NULL DEFAULT 1,
    was_manual BOOLEAN NOT NULL DEFAULT TRUE,
    minigame_score INTEGER DEFAULT 0,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id VARCHAR(100) NOT NULL DEFAULT 'local'
);

CREATE INDEX IF NOT EXISTS idx_train_events_player ON training_events(player_id);
CREATE INDEX IF NOT EXISTS idx_train_events_franchise ON training_events(franchise_id);

-- 11. Scheduled Training (auto-training queue)
CREATE TABLE IF NOT EXISTS scheduled_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id),
    franchise_id UUID REFERENCES franchises(id),
    station VARCHAR(50) NOT NULL,
    focus_attribute VARCHAR(50) NOT NULL DEFAULT 'BALANCED',
    auto_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scheduled_franchise ON scheduled_training(franchise_id);

-- Insert default franchise for testing
INSERT INTO franchises (owner_pubkey, team_name, resin_balance, _crdt_clock)
VALUES ('test-owner-001', 'P31 Pioneers', 100, 1)
ON CONFLICT DO NOTHING;
`;

interface PGLiteProviderProps {
  children: React.ReactNode;
}

export const PGLiteProvider: React.FC<PGLiteProviderProps> = ({ children }) => {
  const [db, setDb] = useState<PGlite | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      try {
        // Create PGlite instance with persistence
        const pg = await PGlite.create({
          dataDir: 'idb://p31-smallball-db',
          debug: import.meta.env.DEV ? 1 : 0,
        });

        if (!isMounted) return;

        // Execute initialization schema
        await pg.exec(INIT_SQL);

        if (!isMounted) return;

        dbInstance = pg;
        setDb(pg);
        setIsInitialized(true);
        console.log('[PGLite] Database initialized successfully');
      } catch (err) {
        console.error('[PGLite] Initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    if (!dbInstance) {
      initDb();
    } else {
      setDb(dbInstance);
      setIsInitialized(true);
    }

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const value: DatabaseContextValue = {
    db,
    isInitialized,
    error,
    refresh,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
