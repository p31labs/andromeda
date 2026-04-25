# K4 Cage Messaging - Local Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm
- wrangler CLI: `npm install -g wrangler`
- Docker & Docker Compose (optional, for local services)

### 1. Clone & Install

```bash
cd /home/p31/andromeda
pnpm install --dir 04_SOFTWARE
```

### 2. Start Local Infrastructure

```bash
cd /home/p31/andromeda/04_SOFTWARE/k4-cage

# Start local services (Redis, Postgres, MinIO)
docker-compose up -d

# Check services
docker-compose ps
```

### 3. Configure Wrangler

```bash
cd /home/p31/andromeda/04_SOFTWARE/k4-cage

# Login to Cloudflare (for remote operations)
npx wrangler login

# Create a .dev.vars file for local secrets
cat > .dev.vars << EOF
ADMIN_TOKEN=dev-admin-token
INTERNAL_FANOUT_TOKEN=dev-fanout-token
STATUS_TOKEN=dev-status-token
EOF
```

### 4. Run Locally

```bash
# Start local development server
npx wrangler dev --local

# Worker will be available at http://localhost:8787
```

### 5. Test Messaging

```bash
# Health check
curl http://localhost:8787/health

# Send test message
curl -X POST http://localhost:8787/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv",
    "senderId": "will",
    "content": "Hello from local!"
  }'

# Create conversation
curl -X POST http://localhost:8787/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "direct",
    "participants": ["will", "sj"],
    "name": "Test Chat"
  }'
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    K4 Cage (Cloudflare Worker)               │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │      Durable Objects (DOs)                            │  │
│  │  ┌────────────────┐  ┌────────────────┐              │  │
│  │  │  K4Topology    │  │  FamilyMesh    │              │  │
│  │  │   DO           │  │  Room DO       │              │  │
│  │  └────────────────┘  └────────────────┘              │  │
│  │  ┌────────────────┐  ┌────────────────┐              │  │
│  │  │FamilyMessaging │  │ FamilyRegistry │              │  │
│  │  │   DO (NEW)     │  │   DO (NEW)     │              │  │
│  │  └────────────────┘  └────────────────┘              │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer                                             │
│  ├─ D1 Database (Postgres) - Persistent                     │
│  ├─ KV Namespace - Ephemeral cache                         │
│  └─ Embedded SQLite (in DOs) - Hot data                    │
├─────────────────────────────────────────────────────────────┤
│  Transport Layer                                          │
│  ├─ WebSocket (real-time)                                 │
│  ├─ WebTransport (QUIC) - future                          │
│  └─ HTTP REST (fallback)                                  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
k4-cage/
├── src/
│   ├── index.js              # Main worker (K4Topology + FamilyMeshRoom)
│   ├── family-messaging-do.js # NEW: Messaging Durable Object
│   ├── family-registry-do.js  # NEW: Registry Durable Object
│   ├── mls-crypto.js          # NEW: MLS encryption module
│   └── crdt-sync.js           # NEW: CRDT synchronizer
├── tests/
│   ├── family-messaging-do.test.js
│   └── messaging-integration.test.js
├── scripts/
│   └── init-postgres.sql
├── docker-compose.yml          # Local services
├── wrangler.toml              # Cloudflare configuration
├── schema.sql                 # D1 database schema
├── deploy.sh                  # Production deployment
├── README_LOCAL_DEV.md        # This file
└── IMPLEMENTATION_PLAN.md     # Technical architecture
```

## Database Schema

### Tables (6 core)

1. **messages** - Chat messages
2. **conversations** - Conversation metadata
3. **message_status** - Delivery/read receipts
4. **typing_indicators** - Real-time typing status
5. **family_members** - Registered members
6. **family_relationships** - Relationship graph

### Indexes
- Conversation lookups by participant
- Message retrieval by timestamp
- Typing cleanup via TTL

## API Reference

### Messages
```
POST   /messages              - Send message
GET    /messages/:convId      - Get history
PUT    /messages/:id/read     - Mark read
PUT    /messages/:id/delivered - Mark delivered
GET    /messages/search       - Search
```

### Conversations
```
POST   /conversations         - Create
GET    /conversations         - List
GET    /conversations/:id     - Get one
PUT    /conversations/:id/typing - Typing status
POST   /conversations/:id/reactions - Add reaction
```

### Admin
```
GET    /api/admin/mesh/metrics   - System metrics
GET    /api/admin/conversations  - All conversations
GET    /api/admin/members        - All members
GET    /api/admin/system/health  - Health check
GET    /api/admin/logs           - System logs
```

### WebSocket
```
Endpoint: ws://localhost:8787/ws/room?userId={userId}

Events (Client → Server):
  { type: 'message:send', conversationId, content }
  { type: 'typing:start', conversationId }
  { type: 'typing:stop', conversationId }
  { type: 'message:read', messageId }

Events (Server → Client):
  { type: 'message:new', message }
  { type: 'typing:indicator', userId, typing }
  { type: 'message:delivered', messageId }
  { type: 'presence:changed', userId, status }
```

## Testing

### Unit Tests
```bash
# Run unit tests
npx wrangler dev --test tests/family-messaging-do.test.js

# With coverage
npx wrangler dev --test --coverage tests/
```

### Integration Tests
```bash
# Start worker
npx wrangler dev &

# Run integration tests in another terminal
node tests/messaging-integration.test.js
```

### Load Tests
```bash
# Install autocannon
npm install -g autocannon

# Test endpoint
autocannon -c 100 -d 30 http://localhost:8787/health
```

## Debugging

### View Worker Logs

```bash
# Local dev logs
npx wrangler dev --tail

# Production logs
npx wrangler tail k4-cage --format json
```

### Inspect Durable Objects

```bash
# List all DO instances
npx wrangler d1 execute p31-telemetry --remote \
  --command="SELECT * FROM sqlite_master WHERE type='table'"

# View raw message data
npx wrangler d1 execute p31-telemetry --remote \
  --command="SELECT * FROM messages LIMIT 10"
```

### Performance Profiling

```bash
# Enable profiling
npx wrangler dev --profile

# Generate profile
wrangler dev --inspector
```

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_TOKEN` | Admin API auth | `dev-admin` |
| `INTERNAL_FANOUT_TOKEN` | Internal routing | `dev-fanout` |
| `STATUS_TOKEN` | Status updates | `dev-status` |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | dev/production | development |
| `WORKER_VERSION` | Version tag | 2.0.0-dev |
| `FLUSH_INTERVAL_MS` | Telemetry flush | 30000 |
| `DB` | D1 binding | (unbound) |

## Troubleshooting

### "Database not found"
```bash
# Apply schema manually
npx wrangler d1 execute p31-telemetry --remote --file=schema.sql
```

### "Durable Object migration required"
```bash
# Check migrations in wrangler.toml
# Ensure migrations are in correct order
npx wrangler deployments list
```

### WebSocket connection refused
- Ensure worker is running: `npx wrangler dev`
- Check CORS settings in index.js
- Verify userId query param

### High latency
- Check D1 database cold starts
- Monitor KV read latency
- Review DO instance count

## Contributing

1. Create feature branch
2. Write tests
3. Run `npm test`
4. Update documentation
5. Submit PR

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Yjs CRDT Library](https://github.com/yjs/yjs)
- [MLS Protocol RFC 9420](https://www.rfc-editor.org/rfc/rfc9420)

---

**Last Updated**: 2026-04-25  
**Version**: 2.0.0-dev  
**Maintainer**: P31 Labs
