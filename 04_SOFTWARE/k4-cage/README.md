# k4-cage

**Status:** 🟢 Live
**Version:** `24293517-d3a5-4d5a-b4d3-7f4b14454d48`
**Deployed:** 2026-04-21
**CWPs:** 18 (WebSocket hibernation), 19 (telemetry flush)

## Purpose

WebSocket room manager for the K₄ family mesh. Hosts the FamilyMeshRoom Durable Object which holds up to 8 concurrent connections with zero-cost hibernation and 30-second batched telemetry flush to D1.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/room-stats/:roomId` | Live room statistics |
| WS | `/ws/:roomId?node=:nodeId` | WebSocket upgrade |

## Quick Test

```bash
curl -s https://k4-cage.trimtab-signal.workers.dev/room-stats/family-alpha
```

## Durable Objects

| Class | Storage | Purpose |
|-------|---------|---------|
| FamilyMeshRoom | SQLite | WebSocket room with hibernation |

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/k4-cage && npx wrangler deploy
```

## See Also

- [Architecture](../docs/ARCHITECTURE.md)
