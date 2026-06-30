CREATE TABLE IF NOT EXISTS identities (
  did TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'Ed25519',
  registered_at INTEGER NOT NULL,
  last_verified_at INTEGER
);

CREATE INDEX idx_identities_did ON identities(did);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  did TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  FOREIGN KEY (did) REFERENCES identities(did)
);

CREATE INDEX idx_sessions_did ON sessions(did);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
