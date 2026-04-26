-- P31 Passkey Worker — D1 schema
-- Apply: wrangler d1 execute p31-passkey-db --file=schema.sql

CREATE TABLE IF NOT EXISTS credentials (
  id            TEXT PRIMARY KEY,          -- base64url credential ID
  user_id       TEXT NOT NULL,             -- base64url random user ID (no PII)
  public_key    TEXT NOT NULL,             -- JSON-serialized StoredKey {alg, jwk}
  alg           TEXT NOT NULL DEFAULT 'ES256', -- 'ES256' | 'RS256'
  sign_count    INTEGER NOT NULL DEFAULT 0,
  aaguid        TEXT,
  transports    TEXT,                      -- JSON array e.g. ["internal","hybrid"]
  backed_up     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,          -- Unix ms
  last_used_at  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_credentials_user ON credentials(user_id);
