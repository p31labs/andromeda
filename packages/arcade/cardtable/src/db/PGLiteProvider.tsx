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

// Card Table specific Event Sourced SQL Schema
const INIT_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Card Game Sessions (CRDT-enabled)
CREATE TABLE IF NOT EXISTS card_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('POKER', 'HEARTS', 'COOP_BUILD', 'SOLITAIRE')),
    prng_seed BIGINT NOT NULL, -- Shared seed for deterministic shuffling
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
    pot_size INTEGER DEFAULT 0,
    current_turn_pubkey VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 2. Session Participants
CREATE TABLE IF NOT EXISTS session_players (
    session_id UUID REFERENCES card_sessions(id) ON DELETE CASCADE,
    player_pubkey VARCHAR(255) NOT NULL,
    seat_index INTEGER NOT NULL,
    chip_count INTEGER DEFAULT 1000,
    hand_cards JSONB DEFAULT '[]'::jsonb, -- Array of {value, suit}
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, player_pubkey)
);

-- 3. Game Events (APPEND ONLY - Source of truth)
CREATE TABLE IF NOT EXISTS game_events (
    session_id UUID REFERENCES card_sessions(id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL,
    actor_pubkey VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('SHUFFLE', 'DEAL', 'DRAW', 'PLAY_CARD', 'BET', 'FOLD', 'PASS', 'COOP_LINK', 'WIN')),
    action_payload JSONB NOT NULL,
    deterministic_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_game_events_session ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_sequence ON game_events(sequence_id);

-- 4. Async Match Queue
CREATE TABLE IF NOT EXISTS async_card_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_pubkey VARCHAR(255) NOT NULL,
    defender_pubkey VARCHAR(255) NOT NULL,
    session_id UUID REFERENCES card_sessions(id),
    match_seed BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    challenger_score INTEGER DEFAULT 0,
    defender_score INTEGER DEFAULT 0,
    final_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 5. Daily Rewards (Low Energy)
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_pubkey VARCHAR(255) NOT NULL,
    reward_type VARCHAR(20) NOT NULL,
    chip_amount INTEGER DEFAULT 0,
    is_claimed BOOLEAN DEFAULT FALSE,
    available_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_player ON daily_rewards(player_pubkey);

-- View: Current game state reconstruction
CREATE OR REPLACE VIEW game_current_state AS
SELECT 
    s.id as session_id,
    s.game_type,
    s.status,
    s.pot_size,
    s.current_turn_pubkey,
    COUNT(DISTINCT sp.player_pubkey) as player_count,
    MAX(e.sequence_id) as last_sequence
FROM card_sessions s
LEFT JOIN session_players sp ON s.id = sp.session_id
LEFT JOIN game_events e ON s.id = e.session_id
WHERE s.status = 'ACTIVE'
GROUP BY s.id, s.game_type, s.status, s.pot_size, s.current_turn_pubkey;

-- Insert test session
INSERT INTO card_sessions (game_type, prng_seed, status, _crdt_clock)
VALUES ('SOLITAIRE', 123456789, 'ACTIVE', 1)
ON CONFLICT DO NOTHING;

-- Insert daily reward for test
INSERT INTO daily_rewards (player_pubkey, reward_type, chip_amount)
VALUES ('test-player-001', 'login_bonus', 100)
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
          dataDir: 'idb://p31-cardtable-db',
          debug: import.meta.env.DEV ? 1 : 0,
        });

        if (!isMounted) return;

        await pg.exec(INIT_SQL);

        if (!isMounted) return;

        dbInstance = pg;
        setDb(pg);
        setIsInitialized(true);
        console.log('[PGLite] Card Table database initialized');
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
