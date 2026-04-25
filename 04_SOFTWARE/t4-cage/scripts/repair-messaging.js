const fs = require('fs');
const path = require('path');

console.log("🛠️  Repairing family-messaging-do.js...");
const targetPath = path.join(__dirname, '../src/family-messaging-do.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Isolate the corrupted section
const beforeIdx = code.indexOf('async handleCreateConversation(request)');
const afterIdx = code.indexOf('async handleGetConversation(conversationId)');

if (beforeIdx !== -1 && afterIdx !== -1) {
  const cleanMethods = `async handleCreateConversation(request) {
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
        \`INSERT INTO conversations 
         (id, type, name, participants, created_at, updated_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)\`
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
      const key = \`k4s:conv:\${conversationId}\`;
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

    let conversations = [];
    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        \`SELECT c.*, m.content as last_message_content, m.timestamp as last_message_timestamp
         FROM conversations c
         LEFT JOIN messages m ON c.last_message_id = m.id
         WHERE c.participants LIKE ?
         ORDER BY c.updated_at DESC\`
      ).bind(\`%\${userId}%\`).all();
      conversations = result.results || [];
    }

    return json({
      conversations,
      count: conversations.length,
      userId
    });
  }

  `;

  // Stitch it back together
  fs.writeFileSync(targetPath, code.substring(0, beforeIdx) + cleanMethods + code.substring(afterIdx));
  console.log("✅ Successfully repaired syntax and SQL bindings in family-messaging-do.js!");
} else {
  console.error("⚠️ Could not find target methods. The file might be structurally altered.");
}