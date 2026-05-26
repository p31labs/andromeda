-- 1. Orbit Sessions
CREATE TABLE IF NOT EXISTS orbit_sessions (
    id UUID PRIMARY KEY,
    creator_pubkey VARCHAR(255) NOT NULL,
    title VARCHAR(100) NOT NULL,
    prng_seed BIGINT NOT NULL, -- Determines initial starfield/dust generation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0
);

-- 2. Gravity Events (APPEND ONLY)
CREATE TABLE IF NOT EXISTS gravity_events (
    session_id UUID REFERENCES orbit_sessions(id),
    sequence_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- \'SPAWN_HEAVY\', \'SLINGSHOT\'
    event_time_ms INTEGER NOT NULL, 
    payload JSONB NOT NULL,          -- { mass: 1000, posX: 10, velY: 5 }
    PRIMARY KEY (session_id, sequence_id)
);
