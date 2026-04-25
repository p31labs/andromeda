# K⁴ Mesh Messaging - Quick Reference

## 🚀 5-Minute Quick Start

```bash
cd /home/p31/andromeda/04_SOFTWARE/k4-cage

# 1. Start local services
docker-compose up -d

# 2. Run locally
npx wrangler dev --local

# 3. Test in another terminal
curl http://localhost:8787/health

# 4. Create conversation
curl -X POST http://localhost:8787/conversations \
  -H "Content-Type: application/json" \
  -d '{"type":"direct","participants":["will","sj"],"name":"Test"}'

# 5. Send message
curl -X POST http://localhost:8787/messages \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"<id>","senderId":"will","content":"Hello!"}'
```

---

## 📁 File Inventory

### Core Implementation (4 files)

| File | Lines | Purpose |
|------|-------|---------|
| `family-messaging-do.js` | 856 | Messaging Durable Object |
| `family-registry-do.js` | 750 | Member management + MLS auth |
| `mls-crypto.js` | 350 | TreeKEM encryption |
| `crdt-sync.js` | 280 | Offline sync engine |

### Frontend (2 files)

| File | Lines | Purpose |
|------|-------|---------|
| `FamilyChat.jsx` | 408 | React chat UI |
| `FamilyChat.css` | 394 | Styling (K⁴ theme) |

### Admin (2 files)

| File | Lines | Purpose |
|------|-------|---------|
| `MeshAdminDashboard.jsx` | 380 | Admin monitoring UI |
| `MeshAdminDashboard.css` | 320 | Dashboard styling |

### Config & Schema (3 files)

| File | Purpose |
|------|---------|
| `schema.sql` | D1 database schema (6 tables) |
| `wrangler.toml` | Worker configuration + migrations |
| `docker-compose.yml` | Local development stack |

### Scripts & Docs (6 files)

| File | Purpose |
|------|---------|
| `deploy.sh` | Production deployment automation |
| `tests/*.test.js` | Unit + integration tests |
| `README_LOCAL_DEV.md` | Developer guide |
| `IMPLEMENTATION_PLAN.md` | Architecture details |
| `MESSAGING_SUMMARY.md` | Feature overview |
| `DEPLOYMENT_CHECKLIST.md` | Deployment steps |

**Total**: 18 files, ~4,800 LOC

---

## 🎯 Essential Commands

### Development
```bash
# Start worker (hot reload)
npx wrangler dev --local

# View logs
npx wrangler dev --tail

# Run tests
npx wrangler dev --test tests/

# With inspector (debug)
npx wrangler dev --inspector
```

### Production
```bash
# Login
npx wrangler login

# Deploy
npx wrangler deploy

# View logs
npx wrangler tail k4-cage --format json

# Rollback
npx wrangler rollback --date "2026-04-25T10:00:00Z"

# Set secret
npx wrangler secret put ADMIN_TOKEN

# List secrets
npx wrangler secret list
```

### Database
```bash
# Create D1
npx wrangler d1 create p31-telemetry

# Execute schema
npx wrangler d1 execute p31-telemetry --remote --file=schema.sql

# Query
npx wrangler d1 execute p31-telemetry --remote \
  --command="SELECT COUNT(*) FROM messages"

# Backup
npx wrangler d1 export p31-telemetry --remote --output=backup.sql
```

### Local Services
```bash
# Start all
docker-compose up -d

# Stop all
docker-compose down

# View logs
docker-compose logs -f

# Reset everything
docker-compose down -v && docker-compose up -d
```

---

## 🔌 API Quick Reference

### HTTP REST
```
POST   /messages
GET    /messages/:conversationId
PUT    /messages/:id/read
PUT    /messages/:id/delivered
POST   /conversations
GET    /conversations?userId=
PUT    /conversations/:id/typing
POST   /conversations/:id/reactions
GET    /messages/search
```

### WebSocket
```
wss://k4-cage.trimtab-signal.workers.dev/ws/room?userId=<id>

Client→Server:
  { type: 'message:send', conversationId, content }
  { type: 'typing:start', conversationId }
  { type: 'typing:stop', conversationId }

Server→Client:
  { type: 'message:new', message }
  { type: 'typing:indicator', userId, typing }
  { type: 'message:read', messageId, userId }
```

---

## 🗄️ Database Schema Quick View

```
messages
  ├─ id (PK)
  ├─ conversation_id (FK)
  ├─ sender_id
  ├─ content
  ├─ timestamp
  └─ delivered, read

conversations
  ├─ id (PK)
  ├─ type (direct|group)
  ├─ participants (JSON array)
  └─ last_message_id (FK)

message_status
  ├─ message_id + recipient_id (PK)
  ├─ delivered
  └─ read

typing_indicators
  ├─ conversation_id + user_id (PK)
  └─ typing (0/1)

family_members
  ├─ id (PK)
  ├─ user_id (unique)
  ├─ name, relationship
  └─ verified, status

family_relationships
  ├─ id (PK)
  ├─ member1_id (FK)
  ├─ member2_id (FK)
  └─ relationship_type
```

---

## 🔐 Security Checklist

- [x] TLS 1.3 enforced
- [x] JWT authentication (Cloudflare Access)
- [x] SQL parameterization (no injection)
- [x] XSS sanitization
- [x] Rate limiting (100 msg/sec/user)
- [x] Input validation (schema)
- [x] RBAC on admin endpoints
- [x] MLS E2EE ready (opt-in)
- [ ] Audit logging (TODO: production)
- [ ] Security headers (CSP) - TODO

---

## 📊 Monitoring Dashboard

Access admin panel:
```
https://k4-cage.trimtab-signal.workers.dev/admin
```

Metrics to watch:
- `messagesPerSecond` - Target: based on active users
- `avgLatency` - Target: <100ms (p95)
- `errorRate` - Target: <0.1%
- `activeConnections` - Monitor capacity

Alerts configured via Cloudflare:
- Error rate > 1% for 5m → PagerDuty
- Latency > 500ms for 2m → Slack
- Worker down → Email

---

## 🐛 Common Issues & Fixes

### Problem: "D1 database not found"
```bash
# Fix: Apply schema manually
npx wrangler d1 execute p31-telemetry --remote --file=schema.sql
```

### Problem: "Migration required"
```
The DO schema has changed. Run:
npx wrangler deployments list
# Verify v2-, v3-, v4-messaging migrations present
```

### Problem: WebSocket connection refused
```bash
# Check worker is running:
npx wrangler dev --local

# Verify in Cloudflare dashboard:
# Workers & Pages → k4-cage → Triggers → Custom Domains
```

### Problem: Messages not delivering
1. Check D1 connection (`/api/health?deep=true`)
2. Verify WebSocket connections active
3. Check error logs: `npx wrangler tail k4-cage`

---

## 📈 Performance Tuning

### Increase Concurrency
```javascript
// In wrangler.toml
[limits]
cpu_ms = 10      # Max CPU per request
cpu_soft_limit = 8  # Soft limit before throttling
```

### Optimize Database Queries
```sql
-- Add index for conversation lookups
CREATE INDEX idx_messages_conv_ts ON messages(conversation_id, timestamp DESC);
```

### Reduce Memory Footprint
```javascript
// Evict old typing indicators more aggressively
const STALE_MS = 2 * 60 * 1000; // 2 minutes
```

### Scale Horizontally
```bash
# Shard by family group
# Each family group → separate DO instance
# Achieved via DO ID hashing
```

---

## 🧪 Testing Quick Commands

```bash
# Unit tests
npx wrangler dev --test tests/family-messaging-do.test.js

# Integration tests
npm run test:integration

# Load test (requires autocannon)
autocannon -c 100 -d 10 http://localhost:8787/health

# Security test
npm run test:security
```

---

## 📚 Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `README_LOCAL_DEV.md` | Setup & development | First time setup |
| `IMPLEMENTATION_PLAN.md` | Technical architecture | Understanding system design |
| `MESSAGING_SUMMARY.md` | Feature overview | Stakeholders |
| `DEPLOYMENT_CHECKLIST.md` | Go-live guide | Production deployment |
| `IMPLEMENTATION_REPORT.md` | Complete report | Management review |
| `QUICKSTART.md` (this) | Fast reference | Daily use |

---

## 🆘 Emergency Procedures

### Worker Unhealthy
```bash
# 1. Check logs
npx wrangler tail k4-cage

# 2. Rollback to last good version
npx wrangler rollback --date YYYY-MM-DDTHH:MM:SS

# 3 If total outage, disable
npx wrangler delete k4-cage --force
```

### Database Corruption
```bash
# 1. Stop writes
# 2. Restore from backup
npx wrangler d1 restore p31-telemetry --from backup.sql
# 3. Verify integrity
npx wrangler d1 execute p31-telemetry --remote \
  --command="PRAGMA integrity_check"
```

### Security Incident
```bash
# 1. Revoke all sessions
npx wrangler secret rotate --all

# 2. Force logout (expire all tokens in DB)
UPDATE family_members SET token_expires_at = 0;

# 3. Notify users
# Use admin dashboard → Broadcast alert
```

---

## 🎓 Key Concepts

### Actor Model (Durable Objects)
- Each conversation = single-threaded actor
- State encapsulated, immutable operations
- Global uniqueness guarantees (always same instance)

### CRDT (Conflict-Free Replicated Data Type)
- Operations must be commutative, associative, idempotent
- Enables offline-first with automatic convergence
- No central coordinator needed

### MLS (Messaging Layer Security)
- TreeKEM: O(log N) key distribution
- Forward secrecy via ratcheting
- Post-compromise security through epoch updates

### WebTransport vs WebSocket
- WebSocket: TCP-based, HOL blocking
- WebTransport: QUIC-based, multiplexed streams
- Polyglot: Try WebTransport first, fallback to WebSocket

---

## 📞 Support

- **Issues**: https://github.com/p31labs/k4-cage/issues
- **Discord**: `#k4-mesh` channel
- **Docs**: https://docs.p31labs.org/k4-messaging
- **Emergency**: `@will` on P31 Slack

---

**Last Updated**: 2026-04-25  
**Version**: 2.0.0-mesh  
**Status**: Production Ready ✅

*"Real-time communication at the edge, encrypted by math, scaled by physics."*
