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

// Liquid Sculptor Event Sourced SQL Schema
const INIT_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sculpture Sessions (CRDT-enabled)
CREATE TABLE IF NOT EXISTS sculpture_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_pubkey VARCHAR(255) NOT NULL,
    title VARCHAR(100) NOT NULL,
    prng_seed BIGINT NOT NULL, -- For deterministic initial particle placement
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    particle_count INTEGER DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 2. Sculpt Events (APPEND ONLY - Physics engine source of truth)
CREATE TABLE IF NOT EXISTS sculpt_events (
    session_id UUID REFERENCES sculpture_sessions(id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('POUR', 'DRAG_FORCE', 'TRIGGER_VORTEX', 'STOP_VORTEX')),
    event_time_ms INTEGER NOT NULL,  -- Simulation time when event occurred
    payload JSONB NOT NULL,          -- { x: 0.5, y: -0.2, radius: 8, strength: 1.0 }
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_sculpt_events_session ON sculpt_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sculpt_events_time ON sculpt_events(event_time_ms);

-- 3. Saved Snapshots (for quick loading)
CREATE TABLE IF NOT EXISTS sculpture_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sculpture_sessions(id) ON DELETE CASCADE,
    snapshot_time_ms INTEGER NOT NULL,
    positions JSONB NOT NULL,        -- Compressed Float32Array as base64
    colors JSONB NOT NULL,
    properties JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_session ON sculpture_snapshots(session_id);

-- 4. Gallery Views (shared sculptures)
CREATE TABLE IF NOT EXISTS sculpture_gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sculpture_sessions(id),
    title VARCHAR(100) NOT NULL,
    creator_pubkey VARCHAR(255) NOT NULL,
    description TEXT,
    likes INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test session
INSERT INTO sculpture_sessions (id, creator_pubkey, title, prng_seed, status, _crdt_clock)
VALUES ('test-session-001', 'creator-001', 'Phos-Cyan Fusion', 123456789, 'ACTIVE', 1)
ON CONFLICT DO NOTHING;

-- Insert test gallery item
INSERT INTO sculpture_gallery (session_id, title, creator_pubkey, description)
VALUES ('test-session-001', 'Phos-Cyan Fusion', 'creator-001', 'A flowing blend of Growth and Flow into Care')
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
          dataDir: 'idb://p31-liquidsculptor-db',
          debug: import.meta.env.DEV ? 1 : 0,
        });

        if (!isMounted) return;

        await pg.exec(INIT_SQL);

        if (!isMounted) return;

        dbInstance = pg;
        setDb(pg);
        setIsInitialized(true);
        console.log('[PGLite] Liquid Sculptor database initialized');
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
