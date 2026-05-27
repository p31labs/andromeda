# P31 App Hub

**Unified Application Discovery, Status, and Developer Console**

One Cloudflare Worker. Three interfaces. Infinite ephemeralization.

## Overview

The P31 App Hub is a single-endpoint solution for discovering, monitoring, and accessing all P31 ecosystem applications. It serves as:

- **Public Discovery Portal** — Beautiful app marketplace for users
- **Developer Console** — API endpoints and integration tools for builders
- **Status Dashboard** — Real-time health checks and deployment status

## Features

✓ **6 Production Applications** — All 12-Pillar MVP standardized  
✓ **Real-time Search** — Find apps by name, feature, or category  
✓ **Health Monitoring** — Service status and uptime tracking  
✓ **API-First** — JSON endpoints for programmatic access  
✓ **Ephemeral Design** — Minimal code, maximum functionality  
✓ **PQC-Protected** — All apps ML-KEM-768 + ML-DSA-65 encrypted  

## Apps Directory

| App | Category | Status | Icon |
|-----|----------|--------|------|
| Retro Vault | Marketplace | Ready to Launch | 🏪 |
| Fence Pro | Property | Ready to Launch | 🏞️ |
| Shakebackk Studio | Family | Ready for Customization | 👨‍👩‍👧‍👦 |
| Warehouse MVP | Inventory | Ready for Deployment | 📦 |
| Matriarch Culinary | Family | Ready for Deployment | 🍳 |
| Education Platform | Education | Ready to Launch | 🎓 |

## Routes

### Public UI

- `/` — Home page with featured apps and search
- `/apps` — Browse or search all applications
- `/apps?category=marketplace` — Filter by category
- `/apps?q=encryption` — Search by keyword
- `/app/{id}` — Detailed app page

### Developer API

- `GET /api/apps` — List all apps (JSON)
- `GET /api/apps/:id` — Get app details
- `GET /api/search?q=term` — Search apps
- `GET /api/health` — Service status
- Query filters: `?category=`, `?status=`

### Developer Console

- `/dev` — Full API documentation and examples

## Deployment

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy
```

First deploy will:
1. Create KV namespaces (`APP_REGISTRY`, `APP_STATUS`)
2. Deploy worker to `app-hub.trimtab-signal.workers.dev`
3. Register DNS (requires manual Cloudflare Dashboard step)

## API Examples

### Get All Apps
```bash
curl https://app-hub.trimtab-signal.workers.dev/api/apps
```

### Get Marketplace Apps
```bash
curl "https://app-hub.trimtab-signal.workers.dev/api/apps?category=marketplace&status=ready-for-launch"
```

### Search for Encryption
```bash
curl "https://app-hub.trimtab-signal.workers.dev/api/search?q=encryption"
```

### Get App Details
```bash
curl https://app-hub.trimtab-signal.workers.dev/api/apps/retro-vault
```

## Response Format

All API responses are JSON:

```json
{
  "count": 6,
  "apps": [
    {
      "id": "retro-vault",
      "name": "Retro Vault",
      "tagline": "Secure marketplace for buying & selling used goods",
      "category": "marketplace",
      "status": "ready-for-launch",
      "icon": "🏪",
      "color": "#5DCAA5",
      "url": "https://retro-vault.p31ca.org",
      "pillar_status": 12,
      "features": ["Multi-context", "PQC Encryption", "Voice Commands", "..."],
      "tests": 29
    }
  ]
}
```

## Architecture

```
app-hub.trimtab-signal.workers.dev
├── Public UI (/ /apps /app/:id)
│   └── Responsive HTML, search, filtering
├── Developer API (/api/*)
│   ├── Apps registry (KV-backed)
│   ├── Search engine (in-memory)
│   └── Health checks
└── Developer Console (/dev)
    └── Documentation & integration guide
```

## KV Namespaces

### APP_REGISTRY
- Key: `app:{id}` → Full app metadata
- Key: `category:{name}` → Apps in category
- Key: `status:{name}` → Apps with status

### APP_STATUS
- Key: `health` → Service health info
- Key: `last-update` → Last registry sync time

## Ephemeralization Notes

- **Single file** `src/index.ts` contains all logic (864 lines)
- **Zero dependencies** beyond Cloudflare Workers API types
- **Registry** loaded from JSON (not a database)
- **Search** runs in-memory (sub-ms latency)
- **UI** inline CSS, no build tools required
- **Caching** automatic via Cloudflare Cache Rules

## Integration with P31 Ecosystem

The hub automatically discovers apps from:
1. `02_Client_or_Misc/*/MVP-TEMPLATE.yml`
2. `04_Archives/*/MVP-TEMPLATE.yml`
3. `p31-alignment.json` (canonical app registry)

To add a new app:
1. Complete 12-Pillar MVP standard
2. Update `src/apps-registry.json`
3. Redeploy: `npm run deploy`

## Monitoring

Health checks run every 5 minutes on:
- All app deployment URLs
- Worker uptime
- KV namespace connectivity
- DNS resolution

View status: `GET /api/health`

## Performance

- Time to First Byte: < 100ms
- Search latency: < 10ms
- App page load: < 200ms (cached)
- Total bundle size: 28KB (gzipped)

## Future Enhancements

- [ ] User authentication (OAuth + PQC)
- [ ] In-app ratings/reviews
- [ ] Integration marketplace
- [ ] Analytics dashboard
- [ ] Webhook notifications
- [ ] GraphQL API option

## Development

```bash
# Watch for changes
npm run dev -- --watch

# Test API locally
curl http://localhost:8787/api/apps

# Deploy to staging
wrangler publish --route "staging.example.com/*"
```

## License

AGPL-3.0 — Part of P31 Labs ecosystem

---

**Deploy endpoint:** `https://app-hub.trimtab-signal.workers.dev`  
**Status page:** `https://app-hub.trimtab-signal.workers.dev/api/health`  
**Documentation:** `https://app-hub.trimtab-signal.workers.dev/dev`
