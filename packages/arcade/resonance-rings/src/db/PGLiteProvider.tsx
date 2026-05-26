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

// Resonance Rings Event Sourced Schema
const INIT_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Resonance Sessions (CRDT-enabled)
CREATE TABLE IF NOT EXISTS resonance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_pubkey VARCHAR(255) NOT NULL,
    title VARCHAR(100) NOT NULL,
    prng_seed BIGINT NOT NULL, -- For deterministic grid variations
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
    total_harmonic_score FLOAT DEFAULT 0,
    coop_mode_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 2. Pulse Events (APPEND ONLY - Triggers waves in simulation)
CREATE TABLE IF NOT EXISTS pulse_events (
    session_id UUID REFERENCES resonance_sessions(id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,        -- Which node received impulse
    force_applied FLOAT NOT NULL,    -- Magnitude of pulse
    actor_pubkey VARCHAR(255),       -- Who triggered it
    event_time_ms INTEGER NOT NULL,  -- Simulation time when impulse hit
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_pulse_session ON pulse_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pulse_time ON pulse_events(event_time_ms);

-- 3. Session Resonance Snapshots (for quick stats)
CREATE TABLE IF NOT EXISTS resonance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES resonance_sessions(id) ON DELETE CASCADE,
    snapshot_time_ms INTEGER NOT NULL,
    harmonic_resonance FLOAT NOT NULL,
    constructive_nodes INTEGER NOT NULL,
    total_pulses INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Public Gallery
CREATE TABLE IF NOT EXISTS resonance_gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES resonance_sessions(id),
    title VARCHAR(100) NOT NULL,
    creator_pubkey VARCHAR(255) NOT NULL,
    peak_harmony FLOAT DEFAULT 0,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    likes INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data
INSERT INTO resonance_sessions (id, creator_pubkey, title, prng_seed, status, _crdt_clock)
VALUES ('test-session-001', 'creator-001', 'Harmonic Resonance Test', 123456789, 'ACTIVE', 1)
ON CONFLICT DO NOTHING;

-- Insert test gallery
INSERT INTO resonance_gallery (session_id, title, creator_pubkey, description, peak_harmony)
VALUES ('test-session-001', 'Sine Wave Symphony', 'creator-001', 'Perfect phase-locked resonance', 8.5)
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
          dataDir: 'idb://p31-resonancerings-db',
          debug: import.meta.env.DEV ? 1 : 0,
        });

        if (!isMounted) return;

        await pg.exec(INIT_SQL);

        if (!isMounted) return;

        dbInstance = pg;
        setDb(pg);
        setIsInitialized(true);
        console.log('[PGLite] Resonance Rings database initialized');
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
