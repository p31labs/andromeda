# P31 Cloudflare Workers

Edge computing infrastructure for the P31 Andromeda ecosystem.

## Workers Implemented

| Worker | File | Priority | Description |
|--------|------|----------|-------------|
| Cognitive Passport Edge Cache | `passport-cache.ts` | P1 | Edge-cached Cognitive Passport |
| L.O.V.E. Token Ledger | `love-ledger.ts` | P1 | Soulbound token currency |
| Emergency Broadcast System | `emergency-broadcast.ts` | P2 | Crisis notification system |
| Cognitive Load API | `spoons-api.ts` | P3 | Spoon expenditure tracking |
| Legal Document Versioning | `legal-versioning.ts` | P4 | Tamper-evident hash chain |

## Quick Start

```bash
# Install dependencies
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV and D1 databases (see wrangler.toml)
wrangler d1 create love-ledger
wrangler d1 create spoons-db
# ... etc

# Deploy workers
wrangler deploy
```

## Configuration

All bindings are defined in [`wrangler.toml`](wrangler.toml):

- **KV Namespaces:** PASSPORT_KV, SPOONS_KV, THRESHOLDS_KV
- **R2 Buckets:** PASSPORT_R2, LEGAL_R2, MESH_R2
- **D1 Databases:** LOVE_D1, SPOONS_D1, LEGAL_D1, MESH_D1, TELEMETRY_D1
- **Durable Objects:** LOVE_TRANSACTION, GAME_ROOM, ROOM_STATE
- **Queues:** TELEMETRY_QUEUE

## API Endpoints

### Passport Cache
```
GET  /api/passport/{userId}     - Get cached passport
POST /api/passport/{userId}     - Update passport (admin)
HEAD /api/passport/{userId}     - Get version
```

### L.O.V.E. Ledger
```
GET  /api/love/balance/{userId}        - Get balance
GET  /api/love/transactions/{userId}  - Get transaction history
POST /api/love/earn                    - Earn LOVE
POST /api/love/spend                   - Spend LOVE
GET  /api/love/leaderboard              - Top earners
POST /api/love/register                - Register user
```

### Emergency Broadcast
```
POST /api/emergency/trigger       - Trigger alert
POST /api/emergency/acknowledge   - Acknowledge alert
GET  /api/emergency/status        - Current status
GET  /api/emergency/contacts      - Emergency contacts
```

### Spoon API
```
POST /api/spoons/log              - Log spoon event
GET  /api/spoons/summary/{userId}  - Daily summary
GET  /api/spoons/trends/{userId}  - Weekly trends
GET  /api/spoons/debt/{userId}    - Spoon debt warning
```

### Legal Versioning
```
POST /api/legal/upload              - Upload document
GET  /api/legal/document/{id}       - Get document
GET  /api/legal/verify/{id}         - Verify hash chain
GET  /api/legal/history/{id}       - Version history
GET  /api/legal/list                - List documents
```

## Type Definitions

Type definitions are in [`types.ts`](types.ts).

## Deployment

```bash
# Deploy to production
wrangler deploy --env production

# Deploy to preview
wrangler deploy --env preview
```

## Cost Estimation

All workers fit within free tier:
- Workers: 100K req/day
- KV: 1GB
- D1: 5GB
- Durable Objects: $0.018/100K ops

Estimated monthly cost: **~$0** (within free tier)

---

*Prepared: March 24, 2026*
*P31 Labs | phosphorus31.org*
*It's okay to be a little wonky.* 🔺