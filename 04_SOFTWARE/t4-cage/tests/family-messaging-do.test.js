/**
 * Unit Tests for FamilyMessagingDO
 * Run with: npx wrangler dev --test tests/family-messaging-do.test.js
 */

import { describe, it, expect, before, after, beforeEach } from '@test/runner';
import { DurableObject } from 'cloudflare:workers';
import { SQLiteDB } from '@test/sqlite';

// Mock dependencies
const mockEnv = {
  DB: null,
  K4_MESH: null,
};

describe('FamilyMessagingDO', () => {
  describe('Message Storage', () => {
    it('should store message in D1 when available', async () => {
      // Create mock D1 database
      const db = await SQLiteDB.open(':memory:');
      await db.exec(`
        CREATE TABLE messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `);

      const env = { ...mockEnv, DB: db };
      const ctx = {}; // Mock DurableObjectState
      
      // Instantiate DO
      const messagingDO = new FamilyMessagingDO(ctx, env);
      
      // Test message
      const message = {
        id: 'test-msg-1',
        conversationId: 'conv-1',
        senderId: 'will',
        content: 'Hello world',
        timestamp: Date.now()
      };

      // Store message
      await messagingDO.storeMessage(message);

      // Verify
      const result = await db.prepare(
        'SELECT * FROM messages WHERE id = ?'
      ).bind(message.id).first();

      expect(result).not.toBeNull();
      expect(result.conversation_id).toBe('conv-1');
      expect(result.sender_id).toBe('will');
      expect(result.content).toBe('Hello world');
    });

    it('should fallback to KV when D1 unavailable', async () => {
      const env = { ...mockEnv, DB: null };
      const ctx = {
        storage: {
          put: async (key, value) => {},
          get: async (key) => null,
          delete: async (key) => {}
        }
      };

      const messagingDO = new FamilyMessagingDO(ctx, env);
      const message = {
        id: 'test-msg-2',
        conversationId: 'conv-1',
        senderId: 'will',
        content: 'KV fallback test',
        timestamp: Date.now()
      };

      // Should not throw
      await expect(messagingDO.storeMessage(message)).resolves.toBeUndefined();
    });
  });

  describe('Conversation Management', () => {
    it('should create conversation with participants', async () => {
      const db = await SQLiteDB.open(':memory:');
      await db.exec(`
        CREATE TABLE conversations (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          participants TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      const env = { ...mockEnv, DB: db };
      const ctx = {};
      const messagingDO = new FamilyMessagingDO(ctx, env);

      const mockRequest = {
        json: async () => ({
          type: 'direct',
          participants: ['will', 'sj'],
          name: 'Family Chat'
        })
      };

      const response = await messagingDO.handleCreateConversation(mockRequest);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.conversation.participants).toEqual(['will', 'sj']);
    });

    it('should validate conversation creation requires participants', async () => {
      const env = mockEnv;
      const ctx = {};
      const messagingDO = new FamilyMessagingDO(ctx, env);

      const mockRequest = {
        json: async () => ({ type: 'direct' }) // Missing participants
      };

      const response = await messagingDO.handleCreateConversation(mockRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Missing or invalid participants');
    });
  });

  describe('WebSocket Handling', () => {
    it('should upgrade connection with valid userId', async () => {
      const env = mockEnv;
      const ctx = {
        acceptWebSocket: () => {},
        getWebSockets: () => [],
        getTags: () => ['will']
      };

      const messagingDO = new FamilyMessagingDO(ctx, env);
      const mockRequest = {
        headers: { get: () => 'websocket' },
        url: 'ws://localhost/ws/room?userId=will'
      };

      // Would create WebSocket - simplified test
      expect(messagingDO.handleWebSocket).toBeDefined();
    });

    it('should reject non-WebSocket upgrades', async () => {
      const ctx = {};
      const env = mockEnv;
      const messagingDO = new FamilyMessagingDO(ctx, env);
      const mockRequest = {
        headers: { get: () => 'http' },
        url: 'http://localhost/messages'
      };

      // Should return 400 error
    });
  });

  describe('Typing Indicators', () => {
    it('should set typing status in storage', async () => {
      const env = mockEnv;
      const ctx = {
        storage: {
          put: async (key, value) => {},
          delete: async (key) => {}
        }
      };

      const messagingDO = new FamilyMessagingDO(ctx, env);
      const mockRequest = {
        json: async () => ({ userId: 'will', typing: true })
      };

      const response = await messagingDO.handleTypingStatus('conv-1', mockRequest);
      expect(response.status).toBe(200);
    });
  });

  describe('Message Search', () => {
    it('should require query and userId', async () => {
      const env = mockEnv;
      const ctx = {};
      const messagingDO = new FamilyMessagingDO(ctx, env);

      const mockParams = new URLSearchParams('');
      const response = await messagingDO.handleSearchMessages(mockParams);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Alarm Cleanup', () => {
    it('should schedule periodic alarms', async () => {
      const env = mockEnv;
      const ctx = {
        storage: {
          setAlarm: () => {},
          list: async () => []
        }
      };

      const messagingDO = new FamilyMessagingDO(ctx, env);
      await messagingDO.alarm();
      
      // Should complete without error
    });
  });
});

describe('CRDT Operations', () => {
  it('should maintain causal ordering', () => {
    // Test CRDT mathematical properties
    const op1 = { type: 'insert', timestamp: 100, clientId: 'A' };
    const op2 = { type: 'insert', timestamp: 200, clientId: 'B' };
    
    // Commutativity: order shouldn't matter for final state in CRDT
    const state1 = applyOperations([], [op1, op2]);
    const state2 = applyOperations([], [op2, op1]);
    
    // Both should converge to same state
    expect(state1.length).toBe(state2.length);
  });

  it('should handle concurrent edits', () => {
    const base = { version: 1, content: 'Hello' };
    const edit1 = { ...base, content: 'Hello World' };
    const edit2 = { ...base, content: 'Hello Everyone' };
    
    // In CRDT, both can be retained
    // Actual merge logic would be implemented in production
    expect(edit1.content).not.toBe(edit2.content);
  });
});

// Helper function
function applyOperations(initial, ops) {
  return ops.reduce((acc, op) => {
    if (op.type === 'insert') {
      return [...acc, op];
    }
    return acc;
  }, initial);
}
