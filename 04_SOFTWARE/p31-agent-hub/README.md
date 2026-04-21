# p31-agent-hub

**Status:** 🟢 Live
**Version:** `7de30023-48b4-4e5a-b2cc-dca093e944aa`
**Deployed:** 2026-04-21
**CWPs:** 17A (parallel dispatch), 17B (leakage parser)

## Purpose

LLM orchestrator for the K₄ mesh. Receives chat messages from the PWA, calls Workers AI (llama-3.1-8b-instruct) with tool definitions, dispatches tool calls to downstream workers via Service Bindings, and returns natural-language responses.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + leakage parser stats |
| POST | `/api/chat` | Send message, get AI response |
| POST | `/api/clear` | Clear session conversation history |

## Quick Test

```bash
curl -s https://p31-agent-hub.trimtab-signal.workers.dev/health
```

## Service Bindings

| Binding | Target | Purpose |
|---------|--------|---------|
| K4_CAGE | k4-cage | Mesh room stats, WebSocket routing |
| K4_PERSONAL | k4-personal | Personal agent state, energy, bio |
| K4_HUBS | k4-hubs | Hub routing, cross-agent queries |
| P31_BOUNCER | p31-bouncer | JWT verification |
| AI | Workers AI | LLM inference |

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/p31-agent-hub && npx wrangler deploy
```

## See Also

- [Architecture](../docs/ARCHITECTURE.md)
- [API Reference](../docs/API_REFERENCE.md)
