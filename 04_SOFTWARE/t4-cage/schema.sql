-- K4 Cage Messaging Schema
-- Run with: npx wrangler d1 execute p31-telemetry --remote --file=schema.sql

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    encrypted INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL,
    delivered INTEGER DEFAULT 0,
    read INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    parent_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT,
    participants TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_message_id TEXT,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (last_message_id) REFERENCES messages(id)
);

-- Message status table (for delivery/read receipts)
CREATE TABLE IF NOT EXISTS message_status (
    message_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    delivered INTEGER DEFAULT 0,
    read INTEGER DEFAULT 0,
    delivered_at INTEGER,
    read_at INTEGER,
    PRIMARY KEY (message_id, recipient_id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    typing INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- Family members/relationships
CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Family relationships
CREATE TABLE IF NOT EXISTS family_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member1_id TEXT NOT NULL,
    member2_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (member1_id) REFERENCES family_members(id),
    FOREIGN KEY (member2_id) REFERENCES family_members(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_message_status_recipient ON message_status(recipient_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- Trigger to update conversation updated_at
CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER INSERT ON messages
BEGIN
    UPDATE conversations 
    SET updated_at = NEW.timestamp,
        last_message_id = NEW.id
    WHERE id = NEW.conversation_id;
END;

-- Trigger to cleanup old typing indicators
CREATE TRIGGER IF NOT EXISTS cleanup_old_typing
AFTER INSERT ON typing_indicators
BEGIN
    DELETE FROM typing_indicators 
    WHERE updated_at < (strftime('%s', 'now') * 1000 - 5000);
END;

-- Commits table for MLS-style epoch/key updates
CREATE TABLE IF NOT EXISTS commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    epoch INTEGER NOT NULL,
    sender TEXT NOT NULL,
    tree TEXT NOT NULL, -- JSON of { vertexId: publicKeyJwk }
    signature TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commits_epoch ON commits(epoch);
CREATE INDEX IF NOT EXISTS idx_commits_sender ON commits(sender);
CREATE INDEX IF NOT EXISTS idx_commits_timestamp ON commits(timestamp);