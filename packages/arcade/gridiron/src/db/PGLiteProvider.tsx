import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PGlite } from '@electric-sql/pglite';

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

// Gridiron-specific SQL Schema - Event Sourced with CRDT support
const INIT_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Franchises (CRDT-enabled)
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_pubkey VARCHAR(255) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    resin_balance INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 2. Players (5v5 Roster)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL CHECK (position IN ('QB', 'WR', 'RB', 'LB', 'CB', 'DL')),
    base_stats JSONB NOT NULL DEFAULT '{"speed": 50, "catch": 50, "throw_power": 50, "tackle": 50, "coverage": 50}'::jsonb,
    xp INTEGER DEFAULT 0,
    fatigue INTEGER DEFAULT 0, -- 0-100 fatigue meter
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resting', 'film_study', 'injured')),
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_players_franchise ON players(franchise_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

-- 3. Formations & Playbooks (CRDT Syncable)
CREATE TABLE IF NOT EXISTS playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    play_name VARCHAR(50) NOT NULL,
    play_type VARCHAR(20) NOT NULL CHECK (play_type IN ('RUN', 'PASS_SHORT', 'PASS_DEEP', 'SCREEN', 'BLITZ', 'COVER_2', 'COVER_3', 'MAN')),
    formation VARCHAR(30) NOT NULL DEFAULT 'SHOTGUN',
    routes JSONB NOT NULL DEFAULT '{}'::jsonb, -- Spatial vectors for WRs: {"WR1": {"x": 10, "y": 20, "timing": 3.2}}
    blitzers JSONB DEFAULT '[]'::jsonb, -- Array of positions sending blitz
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_playbooks_franchise ON playbooks(franchise_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_type ON playbooks(play_type);

-- 4. Play History Events (APPEND ONLY - Deterministic Log)
-- Football operates in discrete plays. This logs the exact outcome of each snap.
CREATE TABLE IF NOT EXISTS play_history_events (
    match_id UUID NOT NULL,
    drive_id INTEGER NOT NULL,
    play_sequence INTEGER NOT NULL,
    offense_franchise_id UUID REFERENCES franchises(id),
    defense_franchise_id UUID REFERENCES franchises(id),
    offense_play_id UUID REFERENCES playbooks(id),
    defense_play_id UUID REFERENCES playbooks(id),
    outcome_type VARCHAR(50) NOT NULL CHECK (outcome_type IN ('COMPLETE', 'INCOMPLETE', 'RUN_GAIN', 'SACK', 'INT', 'TOUCHDOWN', 'FIELD_GOAL', 'PUNT', 'TURNOVER_DOWN')),
    yards_gained INTEGER NOT NULL,
    ball_carrier_id UUID REFERENCES players(id),
    tackler_id UUID REFERENCES players(id),
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Coordinates, pass_arc, etc.
    deterministic_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (match_id, drive_id, play_sequence)
);

CREATE INDEX IF NOT EXISTS idx_play_history_match ON play_history_events(match_id);
CREATE INDEX IF NOT EXISTS idx_play_history_drive ON play_history_events(drive_id);

-- 5. Matches (Async Decentralized)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_franchise_id UUID REFERENCES franchises(id),
    defender_franchise_id UUID REFERENCES franchises(id),
    match_seed BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'disputed')),
    challenger_score INTEGER DEFAULT 0,
    defender_score INTEGER DEFAULT 0,
    final_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matches_challenger ON matches(challenger_franchise_id);
CREATE INDEX IF NOT EXISTS idx_matches_defender ON matches(defender_franchise_id);

-- 6. Injury Reports (Low Energy Async)
CREATE TABLE IF NOT EXISTS injury_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES franchises(id),
    injury_type VARCHAR(50) NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    recovery_games INTEGER NOT NULL, -- games until healthy
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 7. View: Player Effective Stats (base + XP modifiers)
CREATE OR REPLACE VIEW player_effective_stats AS
SELECT 
    p.id,
    p.franchise_id,
    p.name,
    p.position,
    p.base_stats,
    p.xp,
    p.fatigue,
    p.status,
    -- Calculate effective stats with XP scaling (diminishing returns)
    LEAST(99, (p.base_stats->>'speed')::int + FLOOR(p.xp / 100.0 * 5)) as eff_speed,
    LEAST(99, (p.base_stats->>'catch')::int + FLOOR(p.xp / 100.0 * 5)) as eff_catch,
    LEAST(99, (p.base_stats->>'throw_power')::int + FLOOR(p.xp / 100.0 * 5)) as eff_throw_power,
    LEAST(99, (p.base_stats->>'tackle')::int + FLOOR(p.xp / 100.0 * 5)) as eff_tackle,
    LEAST(99, (p.base_stats->>'coverage')::int + FLOOR(p.xp / 100.0 * 5)) as eff_coverage
FROM players p;

-- Insert default franchise for testing
INSERT INTO franchises (owner_pubkey, team_name, resin_balance, wins, losses, _crdt_clock)
VALUES ('test-owner-001', 'P31 Gridiron', 100, 0, 0, 1)
ON CONFLICT DO NOTHING;

-- Insert default playbooks
WITH default_franchise AS (SELECT id FROM franchises WHERE owner_pubkey = 'test-owner-001' LIMIT 1)
INSERT INTO playbooks (franchise_id, play_name, play_type, formation, routes)
SELECT 
    df.id,
    'Slant Route',
    'PASS_SHORT',
    'SHOTGUN',
    '{"WR1": {"x": 8, "y": 12, "timing": 2.5}, "WR2": {"x": -8, "y": 10, "timing": 2.8}}'::jsonb
FROM default_franchise df
ON CONFLICT DO NOTHING;

WITH default_franchise AS (SELECT id FROM franchises WHERE owner_pubkey = 'test-owner-001' LIMIT 1)
INSERT INTO playbooks (franchise_id, play_name, play_type, formation, routes)
SELECT 
    df.id,
    'Power Run',
    'RUN',
    'I_FORM',
    '{"RB": {"x": 0, "y": 8, "timing": 4.0}}'::jsonb
FROM default_franchise df
ON CONFLICT DO NOTHING;

WITH default_franchise AS (SELECT id FROM franchises WHERE owner_pubkey = 'test-owner-001' LIMIT 1)
INSERT INTO playbooks (franchise_id, play_name, play_type, formation, routes, blitzers)
SELECT 
    df.id,
    'Blitz 3',
    'BLITZ',
    '4_3',
    '{}'::jsonb,
    '["LB", "CB"]'::jsonb
FROM default_franchise df
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
        const pg = await PGlite.create({
          dataDir: 'idb://p31-gridiron-db',
          debug: import.meta.env.DEV ? 1 : 0,
        });

        if (!isMounted) return;

        await pg.exec(INIT_SQL);

        if (!isMounted) return;

        dbInstance = pg;
        setDb(pg);
        setIsInitialized(true);
        console.log('[PGLite] Gridiron database initialized');
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
