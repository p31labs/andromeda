-- P31 12-Pillar MVP Template - Database Schema
-- Version: 1.0.0
-- Pillar 3: Database Schema
-- Reference: docs/P31-MVP-COMPLETENESS-STANDARD.md
--
-- PostgreSQL-compatible schema for PGLite
-- Includes: entities, preferences, audit trail, state changes
-- PQC fields: ML-DSA-65 signatures, ML-KEM-768 encrypted data

-- ============================================
-- CORE ENTITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS entities (
    -- Primary key
    id TEXT PRIMARY KEY,
    
    -- Context separation (Pillar 12: Context isolation)
    context TEXT NOT NULL CHECK (context IN ('home', 'business', 'family')),
    
    -- Timestamps
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- Entity data (JSONB for flexibility)
    data JSONB NOT NULL DEFAULT '{}',
    
    -- PQC Signature (ML-DSA-65) on the canonical entity representation
    -- Base64 encoded signature
    pqc_signature TEXT,
    
    -- Entity type discriminator
    entity_type TEXT DEFAULT 'default',
    
    -- Version for optimistic locking
    version INTEGER DEFAULT 1
);

-- Indexes for entities
CREATE INDEX IF NOT EXISTS idx_entities_context ON entities(context);
CREATE INDEX IF NOT EXISTS idx_entities_created ON entities(created_at);
CREATE INDEX IF NOT EXISTS idx_entities_updated ON entities(updated_at);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_entities_data ON entities USING GIN(data);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    -- Primary key (one per user)
    user_id TEXT PRIMARY KEY,
    
    -- UI Preferences (Pillar 5: UI)
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    touch_target TEXT DEFAULT 'standard' CHECK (touch_target IN ('standard', 'large')),
    voice_enabled BOOLEAN DEFAULT FALSE,
    high_contrast BOOLEAN DEFAULT FALSE,
    reduce_motion BOOLEAN DEFAULT FALSE,
    font_size TEXT DEFAULT 'normal' CHECK (font_size IN ('normal', 'large', 'extra-large')),
    
    -- Accessibility (Pillar 5: 64px touch targets for elderly)
    accessibility_mode TEXT DEFAULT 'standard' CHECK (accessibility_mode IN ('standard', 'elderly', 'visual-impairment')),
    
    -- Context preferences
    default_context TEXT DEFAULT 'home' CHECK (default_context IN ('home', 'business', 'family')),
    
    -- Timestamps
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- JSON for extensible preferences
    ext JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_prefs_user ON user_preferences(user_id);

-- ============================================
-- STATE CHANGES TABLE (PQC Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS state_changes (
    -- Primary key
    id TEXT PRIMARY KEY,
    
    -- Entity reference
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    
    -- Action performed
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    
    -- Timestamp
    timestamp INTEGER NOT NULL,
    
    -- Actor (who made the change)
    actor_id TEXT,
    
    -- Context at time of change
    context TEXT NOT NULL,
    
    -- Change data (sanitized - no passwords/secrets)
    change_data JSONB,
    
    -- PQC Signature (ML-DSA-65)
    -- Signs: entity_type + entity_id + action + timestamp + hash(change_data)
    signature TEXT NOT NULL,
    
    -- State hash (for chain verification)
    state_hash TEXT NOT NULL,
    
    -- Previous state hash (linked list)
    previous_hash TEXT NOT NULL DEFAULT '0',
    
    -- Sequence number for ordering
    sequence_number INTEGER NOT NULL
);

-- Indexes for state changes
CREATE INDEX IF NOT EXISTS idx_state_entity ON state_changes(entity_id);
CREATE INDEX IF NOT EXISTS idx_state_timestamp ON state_changes(timestamp);
CREATE INDEX IF NOT EXISTS idx_state_actor ON state_changes(actor_id);
CREATE INDEX IF NOT EXISTS idx_state_sequence ON state_changes(sequence_number);
CREATE INDEX IF NOT EXISTS idx_state_hash ON state_changes(state_hash);

-- ============================================
-- AUDIT TRAIL TABLE (SLH-DSA 50-year)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_trail (
    -- Primary key
    id TEXT PRIMARY KEY,
    
    -- Sequence (immutable ordering)
    sequence INTEGER NOT NULL,
    
    -- Timestamp
    timestamp INTEGER NOT NULL,
    
    -- Event level
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
    
    -- Event category
    category TEXT NOT NULL,
    
    -- Action performed
    action TEXT NOT NULL,
    
    -- Entity reference (optional)
    entity_type TEXT,
    entity_id TEXT,
    
    -- Actor
    actor TEXT NOT NULL,
    
    -- Event data (sanitized)
    event_data JSONB,
    
    -- Entry hash (SHA-256 of canonical JSON)
    entry_hash TEXT NOT NULL,
    
    -- SLH-DSA-SHA2-128s signature (50-year audit)
    slh_signature TEXT NOT NULL,
    
    -- Public key for verification
    public_key TEXT NOT NULL,
    
    -- Previous entry hash (chain)
    previous_hash TEXT NOT NULL,
    
    -- IP address (if applicable)
    ip_address TEXT,
    
    -- User agent hash (anonymized)
    user_agent_hash TEXT
);

-- Indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_trail(sequence);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_trail(level);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_trail(category);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_trail(actor);

-- ============================================
-- ENCRYPTED DATA TABLE (ML-KEM-768)
-- ============================================
CREATE TABLE IF NOT EXISTS encrypted_data (
    -- Primary key
    id TEXT PRIMARY KEY,
    
    -- Entity reference
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    
    -- Data type
    data_type TEXT NOT NULL,
    
    -- Encrypted data (ML-KEM-768 encrypted + AES-256-GCM)
    ciphertext BLOB NOT NULL,
    
    -- Encapsulated key (KEM ciphertext)
    encapsulated_key TEXT NOT NULL,
    
    -- Public key used for encryption
    public_key TEXT NOT NULL,
    
    -- Initialization vector for AES-GCM
    iv TEXT NOT NULL,
    
    -- Timestamps
    created_at INTEGER NOT NULL,
    
    -- PQC signature on the encrypted payload
    signature TEXT
);

CREATE INDEX IF NOT EXISTS idx_enc_entity ON encrypted_data(entity_id);
CREATE INDEX IF NOT EXISTS idx_enc_type ON encrypted_data(data_type);

-- ============================================
-- SYNC QUEUE (Offline-first capability)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_queue (
    -- Primary key
    id TEXT PRIMARY KEY,
    
    -- Operation type
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    
    -- Entity reference
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    
    -- Pending data
    pending_data JSONB,
    
    -- Context
    context TEXT NOT NULL,
    
    -- Local timestamp
    local_timestamp INTEGER NOT NULL,
    
    -- Sync status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
    
    -- Retry count
    retry_count INTEGER DEFAULT 0,
    
    -- Last error
    last_error TEXT,
    
    -- Sync timestamp
    synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_queue(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON sync_queue(local_timestamp);

-- ============================================
-- MIGRATION TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS __migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    checksum TEXT
);

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_entities_timestamp
AFTER UPDATE ON entities
BEGIN
    UPDATE entities SET updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_preferences_timestamp
AFTER UPDATE ON user_preferences
BEGIN
    UPDATE user_preferences SET updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
    WHERE user_id = NEW.user_id;
END;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Recent entities view
CREATE VIEW IF NOT EXISTS recent_entities AS
SELECT 
    id,
    context,
    entity_type,
    created_at,
    updated_at,
    data
FROM entities
ORDER BY updated_at DESC
LIMIT 100;

-- Entity count by context
CREATE VIEW IF NOT EXISTS entity_counts AS
SELECT 
    context,
    entity_type,
    COUNT(*) as count
FROM entities
GROUP BY context, entity_type;

-- Audit summary view
CREATE VIEW IF NOT EXISTS audit_summary AS
SELECT 
    level,
    category,
    COUNT(*) as count,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM audit_trail
GROUP BY level, category;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Record this migration
INSERT OR IGNORE INTO __migrations (version, applied_at, name, checksum)
VALUES (1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, '001_mvp_schema', 'schema_v1_0_0');

-- ============================================
-- PQC COMMENTS
-- ============================================

COMMENT ON TABLE entities IS 'Core entities with ML-DSA-65 signatures';
COMMENT ON TABLE audit_trail IS 'Immutable audit trail with SLH-DSA-SHA2-128s (50-year)';
COMMENT ON TABLE encrypted_data IS 'ML-KEM-768 encrypted sensitive data';
COMMENT ON TABLE state_changes IS 'PQC-signed state changes for verification';
COMMENT ON TABLE sync_queue IS 'Offline-first sync queue';

-- End of schema migration
