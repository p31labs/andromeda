-- P31 Arcade - Master Database Schema
-- This schema defines the unified database for all 9 games.

-- 1. Identity Layer
CREATE TABLE franchises (
    franchise_id UUID PRIMARY KEY,
    franchise_name VARCHAR(255) NOT NULL UNIQUE,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE players (
    player_id UUID PRIMARY KEY,
    franchise_id UUID REFERENCES franchises(franchise_id),
    player_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

-- Cached Wallets (Maintained via DB Triggers or Application-level Aggregation)
CREATE TABLE IF NOT EXISTS resin_wallets (
    franchise_id UUID PRIMARY KEY,
    balance INTEGER DEFAULT 0 NOT NULL,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

-- The Unified Resin Ledger (Append-Only Event Store)
CREATE TABLE IF NOT EXISTS resin_ledger (
    id UUID PRIMARY KEY,
    franchise_id UUID NOT NULL,
    game_id VARCHAR(50) NOT NULL,      -- 'liquid_sculptor', 'smallball', 'geodesic_builder', etc.
    transaction_type VARCHAR(20) NOT NULL, -- 'CREDIT' (earned), 'DEBIT' (spent)
    amount INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,      -- e.g., 'Completed Blackjack Hand', 'Bought Carbon Strut'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

-- Indexing for rapid queries
CREATE INDEX IF NOT EXISTS idx_resin_ledger_franchise ON resin_ledger(franchise_id);


-- 2. Physics Event Layer (High Frequency)
CREATE TABLE sculpt_events (
    sculpt_id INTEGER PRIMARY KEY,
    session_id UUID NOT NULL,
    particle_id INT NOT NULL,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    vel_x FLOAT NOT NULL,
    vel_y FLOAT NOT NULL,
    vel_z FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE flight_events (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    body_id INT NOT NULL,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    vel_x FLOAT NOT NULL,
    vel_y FLOAT NOT NULL,
    vel_z FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE pulse_events (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    spring_id INT NOT NULL,
    displacement FLOAT NOT NULL,
    velocity FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

-- 3. Turn-Based Event Layer (Low Frequency)
CREATE TABLE match_events (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    game_id VARCHAR(255) NOT NULL, -- 'smallball' or 'gridiron'
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE card_events (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL, -- e.g., 'DRAW', 'PLAY', 'DISCARD'
    card_id VARCHAR(255),
    target_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE board_moves (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    piece_id VARCHAR(255) NOT NULL,
    from_square VARCHAR(2) NOT NULL,
    to_square VARCHAR(2) NOT NULL,
    promotion VARCHAR(1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE build_events (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    piece_type VARCHAR(255) NOT NULL,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    rot_x FLOAT NOT NULL,
    rot_y FLOAT NOT NULL,
    rot_z FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);

CREATE TABLE magnet_drops (
    event_id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    word VARCHAR(255) NOT NULL,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    _crdt_clock BIGINT NOT NULL DEFAULT 0,
    _crdt_node_id TEXT NOT NULL DEFAULT 'local'
);
