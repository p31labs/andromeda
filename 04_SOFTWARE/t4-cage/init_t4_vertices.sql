-- Bootstrap T4 vertices into family_members
INSERT OR REPLACE INTO family_members (id, user_id, name, relationship, status, created_at, updated_at) VALUES
('v1_t', 'tyler', 'Tyler', 'Operator', 'active', 1710000000000, 1710000000000),
('v2_t', 'ashley', 'Ashley', 'Family', 'active', 1710000000000, 1710000000000),
('v3_t', 'lincoln', 'Lincoln', 'Family', 'active', 1710000000000, 1710000000000),
('v4_t', 'judah', 'Judah', 'Family', 'active', 1710000000000, 1710000000000);

-- Initialize T4Topology room
INSERT OR REPLACE INTO conversations (id, type, name, participants, created_at, updated_at, last_message_id, metadata) VALUES
('conv-t4-main', 'group', 'T⁴ Main Mesh', '["tyler","ashley","lincoln","judah"]', 1710000000000, 1710000000000, NULL, '{"epoch":0}');
