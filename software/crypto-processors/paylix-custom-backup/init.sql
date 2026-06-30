-- Paylix database schema initialization
-- Run automatically on container startup

CREATE TABLE IF NOT EXISTS payment_sessions (
  session_id VARCHAR(66) PRIMARY KEY,
  amount DECIMAL(20,6) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  chain_id VARCHAR(20) NOT NULL,
  redirect_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(66),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(66),
  tx_hash VARCHAR(66) UNIQUE,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  amount DECIMAL(20,6),
  currency VARCHAR(10),
  chain_id VARCHAR(20),
  status VARCHAR(20),
  block_number BIGINT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_tx ON payment_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payment_events_session ON payment_events(session_id);

CREATE TABLE IF NOT EXISTS chain_state (
  chain_id VARCHAR(20) PRIMARY KEY,
  last_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO chain_state (chain_id, last_block) VALUES
  ('137', 0),
  ('80001', 0),
  ('84532', 0),
  ('421614', 0),
  ('420', 0),
  ('80002', 0),
  ('4002', 0)
ON CONFLICT (chain_id) DO NOTHING;
