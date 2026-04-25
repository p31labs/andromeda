-- K4 Messaging Schema for PostgreSQL (local development)
-- This mirrors the SQLite schema used in Cloudflare D1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id UUID,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    encrypted BOOLEAN DEFAULT false,
    timestamp BIGINT NOT NULL,
    delivered BOOLEAN DEFAULT false,
    read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    parent_id UUID,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES messages(id)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT,
    participants UUID[] NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    last_message_id UUID,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (last_message_id) REFERENCES messages(id)
);

-- Message status table
CREATE TABLE IF NOT EXISTS message_status (
    message_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    delivered BOOLEAN DEFAULT false,
    read BOOLEAN DEFAULT false,
    delivered_at BIGINT,
    read_at BIGINT,
    PRIMARY KEY (message_id, recipient_id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Typing indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    typing BOOLEAN DEFAULT false,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- Family members
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'active',
    verified BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Family relationships
CREATE TABLE IF NOT EXISTS family_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member1_id UUID NOT NULL,
    member2_id UUID NOT NULL,
    relationship_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at BIGINT NOT NULL,
    FOREIGN KEY (member1_id) REFERENCES family_members(id),
    FOREIGN KEY (member2_id) REFERENCES family_members(id),
    UNIQUE(member1_id, member2_id, relationship_type)
);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL,
    device_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    platform TEXT DEFAULT 'unknown',
    push_token TEXT,
    last_seen BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}',
    FOREIGN KEY (member_id) REFERENCES family_members(id)
);

-- MLS Key Packages
CREATE TABLE IF NOT EXISTS key_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL,
    key_package JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES family_members(id)
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    user_id TEXT PRIMARY KEY,
    permissions TEXT[] NOT NULL DEFAULT '{reader}',
    updated_at BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_status_recipient ON message_status(recipient_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conv ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_member ON devices(member_id);
CREATE INDEX IF NOT EXISTS idx_key_packages_member ON key_packages(member_id);
CREATE INDEX IF NOT EXISTS idx_relationships_members ON family_relationships(member1_id, member2_id);

-- Triggers

-- Auto-update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NEW.timestamp,
      last_message_id = NEW.id
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_update
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();

-- Auto-delete old typing indicators
CREATE OR REPLACE FUNCTION cleanup_old_typing()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE updated_at < (EXTRACT(EPOCH FROM NOW()) * 1000) - 5000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_typing
AFTER INSERT ON typing_indicators
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_typing();

-- Function to clean expired key packages
CREATE OR REPLACE FUNCTION cleanup_expired_keypackages()
RETURNS void AS $$
BEGIN
  DELETE FROM key_packages WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- INSERT INTO family_members (id, user_id, name, relationship, created_at, updated_at)
-- VALUES 
--   (uuid_generate_v4(), 'will', 'William Johnson', 'parent', EXTRACT(EPOCH FROM NOW())*1000, EXTRACT(EPOCH FROM NOW())*1000),
--   (uuid_generate_v4(), 'sj', 'S.J.', 'child', EXTRACT(EPOCH FROM NOW())*1000, EXTRACT(EPOCH FROM NOW())*1000);

COMMENT ON TABLE messages IS 'K4 Mesh message storage - Core chat messages';
COMMENT ON TABLE conversations IS 'K4 Mesh conversation metadata';
COMMENT ON TABLE message_status IS 'Message delivery and read receipts';
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators';
COMMENT ON TABLE family_members IS 'Registered family mesh members';
COMMENT ON TABLE family_relationships IS 'Relationship graph between members';
COMMENT ON TABLE devices IS 'Registered devices per member';
COMMENT ON TABLE key_packages IS 'MLS (Messaging Layer Security) key packages';
COMMENT ON TABLE permissions IS 'User permissions and access control';

-- Row Level Security (RLS) policies for multi-tenancy
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified - production would be more complex)
CREATE POLICY "Users can read their conversations" ON conversations
  FOR SELECT USING (
    participants @> ARRAY[current_setting('app.current_user_id', true)::uuid]
  );

CREATE POLICY "Users can read messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE participants @> ARRAY[current_setting('app.current_user_id', true)::uuid]
    )
  );
