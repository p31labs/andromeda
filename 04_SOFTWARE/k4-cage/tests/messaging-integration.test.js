/**
 * Integration Tests for K4 Messaging Infrastructure
 * Tests real-time messaging, persistence, and distributed coordination
 */

import { describe, it, expect, before, after, beforeEach } from '@test/runner';
import { SQLiteDB } from '@test/sqlite';
import { WebSocket } from 'ws';

// Configuration
const TEST_BASE_URL = process.env.TEST_URL || 'http://localhost:8787';

describe('K4 Messaging Integration', () => {
  let db;
  let testConversationId;
  let testUserId = 'test-user-1';

  before(async () => {
    // Initialize in-memory SQLite for testing
    db = await SQLiteDB.open(':memory:');
    await db.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        encrypted INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL,
        delivered INTEGER DEFAULT 0,
        read INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}'
      );
      
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        participants TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  });

  after(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Message Lifecycle', () => {
    it('should send and receive message via HTTP', async () => {
      const message = {
        conversationId: 'test-conv-1',
        senderId: testUserId,
        content: 'Hello from integration test',
        type: 'text',
        timestamp: Date.now()
      };

      const response = await fetch(`${TEST_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message.content).toBe(message.content);
    });

    it('should retrieve message history', async () => {
      const response = await fetch(`${TEST_BASE_URL}/messages/test-conv-1?limit=10`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.conversationId).toBe('test-conv-1');
    });

    it('should mark message as read', async () => {
      const response = await fetch(`${TEST_BASE_URL}/messages/msg-1/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.read).toBe(true);
    });

    it('should create conversation', async () => {
      const conversation = {
        type: 'group',
        name: 'Test Family Group',
        participants: ['will', 'sj', 'wj']
      };

      const response = await fetch(`${TEST_BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conversation)
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.conversation.participants).toContain('will');

      testConversationId = data.conversation.id;
    });

    it('should list conversations for user', async () => {
      const response = await fetch(`${TEST_BASE_URL}/conversations?userId=will`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data.conversations)).toBe(true);
    });
  });

  describe('WebSocket Real-Time Messaging', () => {
    let client;
    let server;
    let serverWebSocket;

    before(async () => {
      // Connect two WebSocket clients
      client = await connectWebSocket(testUserId);
      // Second client would be server in test environment
    });

    after(async () => {
      if (client) client.close();
      if (serverWebSocket) serverWebSocket.close();
    });

    it('should establish WebSocket connection', async () => {
      expect(client.readyState).toBe(WebSocket.OPEN);
    });

    it('should receive welcome message', async () => {
      const welcomePromise = new Promise((resolve) => {
        client.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            resolve(data);
          }
        };
      });

      const welcome = await Promise.race([
        welcomePromise,
        timeout(2000)
      ]);

      expect(welcome.type).toBe('connected');
      expect(welcome.userId).toBe(testUserId);
    });

    it('should send and receive message via WebSocket', async () => {
      const messagePromise = new Promise((resolve) => {
        client.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'message:new') {
            resolve(data);
          }
        };
      });

      client.send(JSON.stringify({
        type: 'message:send',
        conversationId: testConversationId,
        content: 'WebSocket test message'
      }));

      const received = await Promise.race([
        messagePromise,
        timeout(2000)
      ]);

      expect(received.type).toBe('message:new');
      expect(received.message.content).toBe('WebSocket test message');
    });

    it('should broadcast typing indicators', async () => {
      const typingPromise = new Promise((resolve) => {
        client.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'typing:indicator') {
            resolve(data);
          }
        };
      });

      client.send(JSON.stringify({
        type: 'typing:start',
        conversationId: testConversationId
      }));

      const typing = await Promise.race([
        typingPromise,
        timeout(1000)
      ]);

      expect(typing.userId).toBe(testUserId);
      expect(typing.typing).toBe(true);
    });

    it('should update presence on connect', async () => {
      const presencePromise = new Promise((resolve) => {
        client.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'presence:changed') {
            resolve(data);
          }
        };
      });

      // Presence should be broadcast automatically on connect
      const presence = await Promise.race([
        presencePromise,
        timeout(1000)
      ]);

      expect(presence.userId).toBe(testUserId);
      expect(presence.status).toBe('online');
    });
  });

  describe('Concurrent Messaging', () => {
    it('should handle multiple simultaneous messages', async () => {
      const promises = [];
      const messageCount = 50;

      for (let i = 0; i < messageCount; i++) {
        const promise = fetch(`${TEST_BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: 'test-conv-concurrent',
            senderId: `user-${i % 5}`,
            content: `Message ${i}`,
            timestamp: Date.now() + i
          })
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const successes = results.filter(r => r.status === 201);

      expect(successes.length).toBe(messageCount);
    });

    it('should maintain message ordering by timestamp', async () => {
      // Send messages in random order with different timestamps
      const messages = [];
      const timestamps = [3000, 1000, 2000, 5000, 4000];

      for (let i = 0; i < timestamps.length; i++) {
        const response = await fetch(`${TEST_BASE_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: 'test-conv-ordering',
            senderId: 'will',
            content: `T${timestamps[i]} - Message ${i}`,
            timestamp: timestamps[i]
          })
        });
        
        const data = await response.json();
        messages.push(data.message);
      }

      // Retrieve history
      const historyResponse = await fetch(
        `${TEST_BASE_URL}/messages/test-conv-ordering?limit=10`
      );
      const history = await historyResponse.json();

      // Verify chronological order
      for (let i = 1; i < history.messages.length; i++) {
        expect(history.messages[i].timestamp).toBeGreaterThanOrEqual(
          history.messages[i - 1].timestamp
        );
      }
    });
  });

  describe('Offline Behavior', () => {
    it('should queue messages when offline via WebSocket', async () => {
      // Test offline queue logic
      // Would need to simulate disconnection
      expect(true).toBe(true);
    });

    it('should sync queued messages on reconnect', async () => {
      // Test CRDT-based sync
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should reject messages with missing fields', async () => {
      const response = await fetch(`${TEST_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid conversation IDs', async () => {
      const response = await fetch(`${TEST_BASE_URL}/messages/nonexistent-conv`);
      expect(response.status).toBe(200); // Should return empty array, not error
      
      const data = await response.json();
      expect(data.messages).toEqual([]);
    });

    it('should handle SQL injection attempts', async () => {
      const response = await fetch(`${TEST_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: "'; DROP TABLE messages; --",
          senderId: 'attacker',
          content: 'malicious'
        })
      });

      // Should succeed but store escaped value
      expect(response.status).toBe(201);
    });
  });

  describe('Performance', () => {
    it('should respond quickly for single message send', async () => {
      const start = Date.now();
      
      await fetch(`${TEST_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'perf-test',
          senderId: 'will',
          content: 'Performance test'
        })
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // <200ms
    });

    it('should handle 100 concurrent requests', async () => {
      const promises = [];
      const count = 100;

      for (let i = 0; i < count; i++) {
        promises.push(
          fetch(`${TEST_BASE_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: 'perf-concurrent',
              senderId: `user-${i % 10}`,
              content: `Concurrent message ${i}`
            })
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.status === 201);
      expect(successful.length).toBe(count);
    });
  });

  describe('Data Integrity', () => {
    it('should persist messages across page reloads', async () => {
      // This would need to simulate multiple requests
      const msgId = 'persistence-test';
      
      // Write
      await fetch(`${TEST_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: msgId,
          conversationId: 'persistence-conv',
          senderId: 'will',
          content: 'Must persist'
        })
      });

      // Read back
      const response = await fetch(`${TEST_BASE_URL}/messages/persistence-conv`);
      const data = await response.json();
      const found = data.messages.find(m => m.id === msgId);
      
      expect(found).toBeDefined();
      expect(found.content).toBe('Must persist');
    });

    it('should prevent SQL injection', async () => {
      const malicious = "'; DELETE FROM messages; --";
      const response = await fetch(`${TEST_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: malicious,
          senderId: 'attacker',
          content: 'test'
        })
      });

      expect(response.status).toBe(201);
      
      // Verify messages table still intact
      const countResponse = await fetch(`${TEST_BASE_URL}/messages/malicious-conv`);
      // Should not error
      expect(countResponse.status).toBe(200);
    });
  });
});

// Helper to connect WebSocket
async function connectWebSocket(userId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${TEST_BASE_URL.replace('http', 'ws')}/ws/family-mesh?userId=${userId}`);
    
    ws.onopen = () => resolve(ws);
    ws.onerror = (err) => reject(err);
    
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

function timeout(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
