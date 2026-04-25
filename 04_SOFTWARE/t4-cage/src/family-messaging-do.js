/**
 * Family Messaging Durable Object
 * Extends FamilyMeshRoom with persistent messaging capabilities
 * 
 * Handles message storage, delivery, and real-time broadcasting
 * for family and friends communication within the K⁴ mesh.
 * 
 * P31 Labs, Inc. | EIN 42-1888158
 */

import { DurableObject } from 'cloudflare:workers';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

function err(message, status = 400) {
  return json({ error: message, timestamp: new Date().toISOString() }, status);
}

/**
 * FamilyMessagingDO - Persistent messaging for family mesh
 * 
 * Stores messages in D1 with KV fallback
 * Manages delivery receipts and read status
 * Broadcasts messages via WebSocket
 * Handles MLS Commit messages for group key updates
 */
export class FamilyMessagingDO extends DurableObject {
  /**
   * @param {DurableObjectState} ctx
   * @param {Env} env
   */
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.pendingMessages = new Map(); // Track pending deliveries
    this.typingUsers = new Map(); // Track typing indicators
    this.groupState = new Map(); // Track group epoch state per conversation
  }

  /**
   * Handle incoming HTTP requests
   * @param {Request} request
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Message endpoints
      if (path === '/messages' && method === 'POST') {
        return await this.handleSendMessage(request);
      }

      if (path.match(/^\/messages\/[^/]+$/) && method === 'GET') {
        const conversationId = path.split('/')[2];
        return await this.handleGetMessages(conversationId, url.searchParams);
      }

      if (path.match(/^\/messages\/[^/]+\/read$/) && method === 'PUT') {
        const messageId = path.split('/')[2];
        return await this.handleMarkRead(messageId, request);
      }

      if (path.match(/^\/messages\/[^/]+\/delivered$/) && method === 'PUT') {
        const messageId = path.split('/')[2];
        return await this.handleMarkDelivered(messageId, request);
      }

      // Conversation endpoints
      if (path === '/conversations' && method === 'POST') {
        return await this.handleCreateConversation(request);
      }

      if (path === '/conversations' && method === 'GET') {
        return await this.handleListConversations(request);
      }

      if (path.match(/^\/conversations\/[^/]+$/) && method === 'GET') {
        const conversationId = path.split('/')[2];
        return await this.handleGetConversation(conversationId);
      }

      if (path.match(/^\/conversations\/[^/]+\/typing$/) && method === 'PUT') {
        const conversationId = path.split('/')[2];
        return await this.handleTypingStatus(conversationId, request);
      }

      if (path.match(/^\/conversations\/[^/]+\/reactions$/) && method === 'POST') {
        const conversationId = path.split('/')[2];
        return await this.handleAddReaction(conversationId, request);
      }


    } catch (e) {
      console.error('Error in FamilyMessagingDO:', e);
      return err(`Internal error: ${e.message}`, 500);
    }
  }



  /**
   * Handle sending a new message
   * @param {Request} request
   */
  async handleSendMessage(request) {
    const body = await request.json().catch(() => null);
    
    if (!body || !body.conversationId || !body.senderId || !body.content) {
      return err('Missing required fields: conversationId, senderId, content');
    }

    const messageId = crypto.randomUUID();
    const timestamp = Date.now();

    const message = {
      id: messageId,
      conversationId: body.conversationId,
      senderId: body.senderId,
      recipientId: body.recipientId || null,
      content: body.content,
      type: body.type || 'text',
      encrypted: body.encrypted || false,
      timestamp,
      delivered: false,
      read: false,
      metadata: body.metadata || {},
      parentId: body.parentId || null,
      reactions: []
    };

    // Store message
    await this.storeMessage(message);

    // Update conversation
    await this.updateConversationLastMessage(body.conversationId, messageId, timestamp);

    // Broadcast to WebSocket clients
    await this.broadcastMessage(message);

    // Track for delivery confirmation
    this.pendingMessages.set(messageId, {
      message,
      sentAt: timestamp,
      attempts: 0
    });

    return json({
      success: true,
      message,
      messageId
    }, 201);
  }



  /**
   * Store message in D1 or KV
   * @param {Object} message
   */
  async storeMessage(message) {
    if (this.env.DB) {
      // Store in D1
      await this.env.DB.prepare(
        `INSERT INTO messages 
         (id, conversation_id, sender_id, recipient_id, content, type, encrypted, timestamp, delivered, read, metadata, parent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        message.id,
        message.conversationId,
        message.senderId,
        message.recipientId,
        message.content,
        message.type,
        message.encrypted ? 1 : 0,
        message.timestamp,
        message.delivered ? 1 : 0,
        message.read ? 1 : 0,
        JSON.stringify(message.metadata),
        message.parentId
      ).run();
    } else {
      // Fallback to KV
      const key = `k4s:messages:${message.conversationId}:${message.id}`;
      await this.ctx.storage.put(key, JSON.stringify(message));
    }
  }



  /**
   * Get messages for a conversation
   * @param {string} conversationId
   * @param {URLSearchParams} params
   */
  async handleGetMessages(conversationId, params) {
    const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
    const before = params.get('before');
    const after = params.get('after');

    let messages;
    
    if (this.env.DB) {
      let query = `SELECT * FROM messages WHERE conversation_id = ?`;
      const queryParams = [conversationId];

      if (before) {
        query += ` AND timestamp < ?`;
        queryParams.push(parseInt(before));
      }
      if (after) {
        query += ` AND timestamp > ?`;
        queryParams.push(parseInt(after));
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      queryParams.push(limit);

      const result = await this.env.DB.prepare(query).bind(...queryParams).all();
      messages = result.results || [];
    } else {
      // Fallback to KV - less efficient
      const prefix = `k4s:messages:${conversationId}:`;
      messages = [];
      // Note: KV list is not available in Durable Objects, this is a limitation
      // In production, D1 is recommended
    }

    // Convert to proper format
    const formattedMessages = messages.map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      content: m.content,
      type: m.type,
      encrypted: Boolean(m.encrypted),
      timestamp: m.timestamp,
      delivered: Boolean(m.delivered),
      read: Boolean(m.read),
      metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata,
      parentId: m.parent_id
    }));

    return json({
      messages: formattedMessages.reverse(), // Return in chronological order
      count: formattedMessages.length,
      conversationId
    });
  }



  /**
   * Mark message as read
   * @param {string} messageId
   * @param {Request} request
   */
  async handleMarkRead(messageId, request) {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId) {
      return err('Missing userId');
    }

    if (this.env.DB) {
      await this.env.DB.prepare(
        `UPDATE messages SET read = 1 WHERE id = ?`
      ).bind(messageId).run();

      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO message_status (message_id, recipient_id, read, read_at)
         VALUES (?, ?, 1, ?)`
      ).bind(messageId, userId, Date.now()).run();
    } else {
      // KV fallback - update would require fetching and rewriting
      // This is a limitation of KV-only approach
    }

    // Broadcast read receipt
    await this.broadcastReadReceipt(messageId, userId);

    return json({ success: true, messageId, read: true });
  }



  /**
   * Mark message as delivered
   * @param {string} messageId
   * @param {Request} request
   */
  async handleMarkDelivered(messageId, request) {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId) {
      return err('Missing userId');
    }

    if (this.env.DB) {
      await this.env.DB.prepare(
        `UPDATE messages SET delivered = 1 WHERE id = ?`
      ).bind(messageId).run();

      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO message_status (message_id, recipient_id, delivered, delivered_at)
         VALUES (?, ?, 1, ?)`
      ).bind(messageId, userId, Date.now()).run();
    }

    // Remove from pending
    this.pendingMessages.delete(messageId);

    return json({ success: true, messageId, delivered: true });
  }



  /**
   * Create a new conversation
   * @param {Request} request
   */
  async handleCreateConversation(request) {
    const body = await request.json().catch(() => null);
    if (!body || !body.participants || !Array.isArray(body.participants)) {
      return err('Missing or invalid participants');
    }

    const conversationId = crypto.randomUUID();
    const timestamp = Date.now();
    const conversation = {
      id: conversationId,
      type: body.type || (body.participants.length === 2 ? 'direct' : 'group'),
      name: body.name,
      participants: body.participants,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastMessageId: null,
      metadata: body.metadata || {}
    };

    if (this.env.DB) {
      await this.env.DB.prepare(
        `INSERT INTO conversations 
         (id, type, name, participants, created_at, updated_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        conversation.id,
        conversation.type,
        conversation.name,
        JSON.stringify(conversation.participants),
        conversation.createdAt,
        conversation.updatedAt,
        JSON.stringify(conversation.metadata)
      ).run();
    } else {
      const key = `k4s:conv:${conversationId}`;
      await this.ctx.storage.put(key, JSON.stringify(conversation));
    }

    return json({
      success: true,
      conversation
    }, 201);
  }



  /**
   * List conversations for a user
   * @param {Request} request
   */
  async handleListConversations(request) {
    const url = new URL(request.url);
    const userId = request.headers.get('X-User-Id') || url.searchParams.get('userId');
    
    if (!userId) {
      return err('Missing userId');
    }

    let conversations;

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT c.*, m.content as last_message_content, m.timestamp as last_message_timestamp
         FROM conversations c
         LEFT JOIN messages m ON c.last_message_id = m.id
         WHERE c.participants LIKE ?
         ORDER BY c.updated_at DESC`
      ).bind(`%${userId}%`).all();

      conversations = result.results || [];
    } else {
      conversations = [];
    }

    return json({
      conversations,
      count: conversations.length,
      userId
    });
  }



  /**
   * Search messages
   * @param {URLSearchParams} params
   */
  async handleSearchMessages(params) {
    const query = params.get('q');
    const userId = params.get('userId');
    const limit = Math.min(parseInt(params.get('limit') || '20'), 50);

    if (!query || !userId) {
      return err('Missing query or userId');
    }

    let results;

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT m.*, c.name as conversation_name
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.participants LIKE ? AND m.content LIKE ?
         ORDER BY m.timestamp DESC
         LIMIT ?`
      ).bind(`%${userId}%`, `%${query}%`, limit).all();

      results = result.results || [];
    } else {
      results = [];
    }

    return json({
      results,
      count: results.length,
      query
    });
  }

/**
   * Submit a Commit message to update group epoch/keys
   * @param {Request} request
   */
  async handleCommit(request) {
    const body = await request.json().catch(() => null);
    if (!body || !body.epoch || !body.tree || !body.signature) {
      return err('Invalid commit payload');
    }

    // Store commit in D1 for group state synchronization
    if (this.env.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO commits (epoch, sender, tree, signature, timestamp)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          body.epoch,
          body.sender,
          JSON.stringify(body.tree),
          body.signature,
          Date.now()
        ).run();
      } catch (e) {
        // Table may not exist; store in KV as fallback
      }
    }

    // Store in KV for fast retrieval
    const commitKey = `k4s:commit:${body.epoch}:${body.sender}`;
    await this.ctx.storage.put(commitKey, JSON.stringify(body));

    // Broadcast to all WebSocket clients
    await this.broadcastCommit(body);

    return json({ success: true, epoch: body.epoch });
  }



  /**
   * Broadcast a Commit message to WebSocket clients
   * @param {Object} commit
   */
  async broadcastCommit(commit) {
    const event = {
      type: 'commit',
      sender: commit.sender,
      epoch: commit.epoch,
      payload: commit
    };

    this.ctx.getWebSockets().forEach(ws => {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        this.ctx.deleteWebSocket(ws);
      }
    });
  }

/**
   * Get current group state (public keys, epoch)
   * @param {Request} request
   */
  async handleGetGroupState(request) {
    const commits = [];
    
    // Collect latest commits from KV
    const commitKeys = await this.ctx.storage.list({ prefix: 'k4s:commit:' });
    for (const [key, value] of commitKeys) {
      try {
        commits.push(JSON.parse(value));
      } catch {}
    }

    // Build latest tree state
    const latestEpoch = Math.max(-1, ...commits.map(c => c.epoch || 0));
    const latestCommits = commits.filter(c => c.epoch === latestEpoch);
    
    const tree = {};
    latestCommits.forEach(c => {
      if (c.tree) {
        Object.assign(tree, c.tree);
      }
    });

    return json({
      epoch: latestEpoch,
      tree,
      participants: VERTICES
    });
  }



  /**
   * Get a specific conversation
   * @param {string} conversationId
   */
  async handleGetConversation(conversationId) {
    let conversation;

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM conversations WHERE id = ?`
      ).bind(conversationId).first();

      conversation = result;
    } else {
      const key = `k4s:conv:${conversationId}`;
      const raw = await this.ctx.storage.get(key);
      conversation = raw ? JSON.parse(raw) : null;
    }

    if (!conversation) {
      return err('Conversation not found', 404);
    }

    return json({ conversation });
  }



  /**
   * Update typing status
   * @param {string} conversationId
   * @param {Request} request
   */
  async handleTypingStatus(conversationId, request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.userId) {
      return err('Missing userId');
    }

    const key = `typing:${conversationId}:${body.userId}`;
    
    if (body.typing) {
      await this.ctx.storage.put(key, Date.now().toString());
    } else {
      await this.ctx.storage.delete(key);
    }

    // Broadcast typing indicator
    await this.broadcastTyping(conversationId, body.userId, body.typing);

    return json({ success: true });
  }



  /**
   * Add reaction to message
   * @param {string} conversationId
   * @param {Request} request
   */
  async handleAddReaction(conversationId, request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.messageId || !body.userId || !body.emoji) {
      return err('Missing required fields: messageId, userId, emoji');
    }

    // In production, would update message reactions in database
    // For now, broadcast the reaction
    await this.broadcastReaction({
      conversationId,
      messageId: body.messageId,
      userId: body.userId,
      emoji: body.emoji,
      timestamp: Date.now()
    });

    return json({ success: true     });
  }



  /**
   * Update conversation's last message
   * @param {string} conversationId
   * @param {string} messageId
   * @param {number} timestamp
   */
  async updateConversationLastMessage(conversationId, messageId, timestamp) {
    if (this.env.DB) {
      await this.env.DB.prepare(
        `UPDATE conversations 
         SET last_message_id = ?, updated_at = ?
         WHERE id = ?`
      ).bind(messageId, timestamp, conversationId).run();
    } else {
      const key = `k4s:conv:${conversationId}`;
      const raw = await this.ctx.storage.get(key);
      if (raw) {
        const conv = JSON.parse(raw);
        conv.lastMessageId = messageId;
        conv.updatedAt = timestamp;
        await this.ctx.storage.put(key, JSON.stringify(conv));
      }
    }
  }



  /**
   * Broadcast message to WebSocket clients
   * @param {Object} message
   */
  async broadcastMessage(message) {
    const event = {
      type: 'message:new',
      message
    };

    this.ctx.getWebSockets().forEach(ws => {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        // Remove dead connections
        this.ctx.deleteWebSocket(ws);
      }
    });
  }



  /**
   * Broadcast read receipt
   * @param {string} messageId
   * @param {string} userId
   */
  async broadcastReadReceipt(messageId, userId) {
    const event = {
      type: 'message:read',
      messageId,
      userId,
      timestamp: Date.now()
    };

    this.ctx.getWebSockets().forEach(ws => {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        this.ctx.deleteWebSocket(ws);
      }
    });
  }



  /**
   * Broadcast typing indicator
   * @param {string} conversationId
   * @param {string} userId
   * @param {boolean} typing
   */
  async broadcastTyping(conversationId, userId, typing) {
    const event = {
      type: 'typing:indicator',
      conversationId,
      userId,
      typing,
      timestamp: Date.now()
    };

    this.ctx.getWebSockets().forEach(ws => {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        this.ctx.deleteWebSocket(ws);
      }
    });
  }



  /**
   * Broadcast reaction
   * @param {Object} reaction
   */
  async broadcastReaction(reaction) {
    const event = {
      type: 'message:reaction',
      ...reaction
    };

    this.ctx.getWebSockets().forEach(ws => {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        this.ctx.deleteWebSocket(ws);
      }
    });
  }



  /**
   * Handle WebSocket upgrade for real-time messaging
   * @param {Request} request
   */
  async handleWebSocket(request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId')?.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) ||
                   `anon-${crypto.randomUUID().slice(0, 8)}`;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [userId]);

    // Send welcome message
    server.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now()
    }));

    // Notify others of presence
    await this.broadcastPresence(userId, 'online');

    return new Response(null, { status: 101, webSocket: client });
  }

/**
   * Broadcast presence update
   * @param {string} userId
   * @param {string} status
   */
  async broadcastPresence(userId, status) {
    const event = {
      type: 'presence:changed',
      userId,
      status,
      timestamp: Date.now()
    };

    this.ctx.getWebSockets().forEach(ws => {
      try {
        ws.send(JSON.stringify(event));
      } catch (e) {
        this.ctx.deleteWebSocket(ws);
      }
    });
  }



  /**
   * Handle WebSocket messages
   * @param {WebSocket} ws
   * @param {string|ArrayBuffer} message
   */
  async webSocketMessage(ws, message) {
    const tags = this.ctx.getTags(ws);
    const userId = tags[0] || 'unknown';

    let data;
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    
    try {
      data = JSON.parse(text);
    } catch {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON'
      }));
      return;
    }

    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'message:send':
        await this.handleWebSocketMessage(data, userId);
        break;

      case 'typing:start':
      case 'typing:stop':
        await this.handleWebSocketTyping(data, userId);
        break;

      case 'presence:update':
        await this.handleWebSocketPresence(data, userId);
        break;

      case 'commit':
        // Forward commit to HTTP handler
        const mockRequest = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          json: async () => ({
            conversationId: data.conversationId,
            senderId: userId,
            commit: data.commit
          })
        };
        await this.handleCommit(mockRequest);
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }



  /**
   * Handle message from WebSocket
   * @param {Object} data
   * @param {string} userId
   */
  async handleWebSocketMessage(data, userId) {
    if (!data.conversationId || !data.content) {
      return;
    }

    // Reuse the HTTP message sending logic
    const mockRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: async () => ({
        conversationId: data.conversationId,
        senderId: userId,
        content: data.content,
        type: data.type || 'text',
        encrypted: data.encrypted || false,
        metadata: data.metadata || {},
        parentId: data.parentId || null
      })
    };

    await this.handleSendMessage(mockRequest);
  }



  /**
   * Handle typing indicator from WebSocket
   * @param {Object} data
   * @param {string} userId
   */
  async handleWebSocketTyping(data, userId) {
    if (!data.conversationId) {
      return;
    }

    const typing = data.type === 'typing:start';
    
    await this.ctx.storage.put(
      `typing:${data.conversationId}:${userId}`,
      typing ? Date.now().toString() : ''
    );

    this.broadcastTyping(data.conversationId, userId, typing);
  }



  /**
   * Handle presence update from WebSocket
   * @param {Object} data
   * @param {string} userId
   */
  async handleWebSocketPresence(data, userId) {
    const status = data.status || 'online';
    
    await this.ctx.storage.put(
      `presence:${userId}`,
      JSON.stringify({ status, timestamp: Date.now() })
    );

    this.broadcastPresence(userId, status);
  }



  /**
   * Handle WebSocket close
   * @param {WebSocket} ws
   */
  async webSocketClose(ws) {
    const tags = this.ctx.getTags(ws);
    const userId = tags[0] || 'unknown';

    // Update presence to away
    await this.ctx.storage.put(
      `presence:${userId}`,
      JSON.stringify({ status: 'away', timestamp: Date.now() })
    );

    this.broadcastPresence(userId, 'away');
  }



  /**
   * Periodic cleanup and sync
   */
  async alarm() {
    // Clean up old typing indicators (older than 5 seconds)
    const now = Date.now();
    const typingKeys = await this.ctx.storage.list({ prefix: 'typing:' });
    
    for (const [key, value] of typingKeys) {
      const timestamp = parseInt(value);
      if (now - timestamp > 5000) {
        await this.ctx.storage.delete(key);
      }
    }

    // Retry failed message deliveries
    for (const [messageId, pending] of this.pendingMessages) {
      if (now - pending.sentAt > 30000 && pending.attempts < 3) {
        pending.attempts++;
        pending.sentAt = now;
        
        // Re-broadcast
        await this.broadcastMessage(pending.message);
      }
    }

    // Schedule next alarm
    await this.ctx.storage.setAlarm(Date.now() + 60000); // Every minute
  }}
