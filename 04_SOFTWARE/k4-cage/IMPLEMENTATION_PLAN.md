# K⁴ Mesh Messaging Implementation Plan

## Overview
Implementation of persistent family and friends messaging for the K⁴ mesh infrastructure.

## Architecture Components

### 1. FamilyMessagingDO (Durable Object)
**File:** `src/family-messaging-do.js`

**Responsibilities:**
- Store and retrieve messages
- Manage conversation state
- Handle delivery receipts
- Broadcast real-time updates via WebSocket
- Track typing indicators
- Manage message reactions

**Key Methods:**
- `handleSendMessage()` - Send new message
- `handleGetMessages()` - Retrieve message history
- `handleMarkRead()` - Mark message as read
- `handleMarkDelivered()` - Mark message as delivered
- `handleCreateConversation()` - Create new conversation
- `handleListConversations()` - List user conversations
- `handleTypingStatus()` - Update typing indicator
- `handleAddReaction()` - Add reaction to message
- `handleSearchMessages()` - Search message history

**Storage:**
- Primary: D1 database (persistent)
- Fallback: KV namespace (ephemeral)

### 2. Database Schema
**File:** `schema.sql`

**Tables:**
- `messages` - Message storage
- `conversations` - Conversation metadata
- `message_status` - Delivery/read receipts
- `typing_indicators` - Real-time typing status
- `family_members` - Registered family members
- `family_relationships` - Relationship graph

### 3. WebSocket Events

**Client → Server:**
- `message:send` - Send new message
- `message:read` - Mark as read
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `presence:update` - Update presence

**Server → Client:**
- `message:new` - New message received
- `message:delivered` - Message delivered
- `message:read` - Message read
- `typing:indicator` - Typing status
- `presence:changed` - Presence update
- `message:reaction` - New reaction

## Implementation Steps

### Phase 1: Core Infrastructure (Days 1-3)
1. ✅ Create FamilyMessagingDO class
2. ✅ Implement message storage (D1 + KV)
3. ✅ Add conversation management
4. ✅ Create WebSocket handler
5. ✅ Implement message broadcasting

### Phase 2: Real-Time Features (Days 4-5)
1. ✅ Add typing indicators
2. ✅ Implement read receipts
3. ✅ Add delivery confirmations
4. ✅ Create message reactions
5. ✅ Add presence tracking

### Phase 3: Advanced Features (Days 6-7)
1. ✅ Implement message search
2. ✅ Add threaded replies
3. ✅ Create offline queue support
4. ✅ Add message history pagination
5. ✅ Implement sync mechanism

### Phase 4: Integration (Days 8-10)
1. ✅ Integrate with K4 Cage
2. ✅ Add to command center dashboard
3. ✅ Create React components
4. ✅ Implement UI for messaging
5. ✅ Add notification system

## API Endpoints

### HTTP API
```
POST   /messages              - Send message
GET    /messages/{convId}     - Get message history
PUT    /messages/{id}/read    - Mark as read
PUT    /messages/{id}/delivered - Mark as delivered
POST   /conversations         - Create conversation
GET    /conversations         - List conversations
PUT    /conversations/{id}/typing - Update typing
POST   /conversations/{id}/reactions - Add reaction
GET    /messages/search       - Search messages
```

### WebSocket API
```
// Connection
ws://host/ws/{roomId}?userId={userId}

// Events
Client: { type: 'message:send', conversationId, content, ... }
Server: { type: 'message:new', message: {...} }

Client: { type: 'typing:start', conversationId }
Server: { type: 'typing:indicator', userId, conversationId, typing: true }

Client: { type: 'message:read', messageId }
Server: { type: 'message:read', messageId, userId }
```

## Data Models

### Message
```typescript
interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'file' | 'voice';
    encrypted: boolean;
    timestamp: number;
    delivered: boolean;
    read: boolean;
    metadata: Record<string, any>;
    parentId?: string;
    reactions: Reaction[];
}
```

### Conversation
```typescript
interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    participants: string[];
    createdAt: number;
    updatedAt: number;
    lastMessage?: Message;
    unreadCount: number;
}
```

## Deployment

### Prerequisites
1. D1 database created
2. Schema applied
3. Secrets configured (ADMIN_TOKEN, etc.)
4. Worker deployed

### Steps
```bash
# 1. Create D1 database
npx wrangler d1 create p31-telemetry

# 2. Apply schema
npx wrangler d1 execute p31-telemetry --remote --file=schema.sql

# 3. Deploy worker
npx wrangler deploy

# 4. Set secrets
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put INTERNAL_FANOUT_TOKEN
```

## Testing

### Unit Tests
- Message storage and retrieval
- Conversation management
- WebSocket event handling
- Delivery receipt tracking
- Typing indicator broadcasting

### Integration Tests
- End-to-end message flow
- Multi-user conversations
- Offline message sync
- Presence updates
- Real-time broadcasting

### Load Tests
- Concurrent message sending
- High-frequency updates
- Large message history
- Many concurrent connections

## Monitoring

### Metrics
- Messages sent/received per minute
- Delivery success rate
- Average delivery latency
- Active conversations
- Concurrent WebSocket connections
- Error rates

### Logging
- Message delivery logs
- Error tracking
- Performance metrics
- Security events

## Security

### Authentication
- Cloudflare Access integration
- JWT token validation
- WebSocket authentication

### Authorization
- Per-conversation permissions
- Family member verification
- Admin controls

### Encryption
- TLS for transport
- Optional E2EE for messages
- Secure key storage

## Performance Optimization

### Caching
- KV cache for frequent queries
- Message batching
- Connection pooling

### Database
- Indexed queries
- Efficient pagination
- Batch operations

### Network
- WebSocket for real-time
- WebTransport for high-frequency
- CDN for static assets

## Future Enhancements

1. End-to-end encryption
2. Voice/video messages
3. File attachments
4. Message search with full-text
5. Cross-platform sync
6. AI-powered features
7. Advanced notifications
8. Group chat management

## Rollback Plan

If issues arise:
1. Revert to previous worker version
2. Disable new features via feature flags
3. Monitor error rates
4. Restore from backups if needed

## Success Criteria

- 99.9% message delivery rate
- <100ms average latency
- <1s sync time for offline messages
- 99.9% uptime
- Positive user feedback
- No data loss
- Secure operation
