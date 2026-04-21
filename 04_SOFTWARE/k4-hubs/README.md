# k4-hubs

**Status:** 🟢 Live
**Deployed:** 2026-04-21
**CWP:** 24 (Hub Router)

## Purpose

Fan-out coordinator for cross-agent messaging. Routes messages between PersonalAgent DOs and FamilyMeshRoom DOs.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/route` | Route action (send_to_mesh, query_agent, broadcast) |

## Quick Test

```bash
curl -s https://k4-hubs.trimtab-signal.workers.dev/health
```

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/k4-hubs && npx wrangler deploy
```

## See Also

- [API Reference](../docs/API_REFERENCE.md#4-k4-hubs)
