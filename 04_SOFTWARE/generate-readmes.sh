#!/usr/bin/env bash
set -euo pipefail
BASE="${HOME}/andromeda/04_SOFTWARE"

write_readme() {
  local dir="$1"
  local content="$2"
  mkdir -p "${BASE}/${dir}"
  echo "$content" > "${BASE}/${dir}/README.md"
  echo "  ✓ ${dir}/README.md"
}

echo "Writing per-worker READMEs..."

write_readme "p31-agent-hub" '# p31-agent-hub

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
- [API Reference](../docs/API_REFERENCE.md)'

write_readme "k4-cage" '# k4-cage

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

- [Architecture](../docs/ARCHITECTURE.md)'

write_readme "k4-personal" '# k4-personal

**Status:** 🟢 Live
**Deployed:** 2026-04-21
**CWPs:** 23 (PersonalAgent), 26 (PII scrubber), 27 (bio webhook)

## Purpose

Per-user isolated agent. Each mesh member gets their own PersonalAgent Durable Object with private SQLite storage for conversation history, energy tracking, medication reminders, and health data.

## Endpoints

All prefixed with `/agent/:userId/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agent/:userId/health` | Agent health check |
| GET | `/agent/:userId/energy` | Current spoon level |
| POST | `/agent/:userId/bio` | Submit biometric data |

## Quick Test

```bash
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/health
curl -s https://k4-personal.trimtab-signal.workers.dev/agent/will/energy
```

## Bio Alert Thresholds

| Type | Threshold | Severity |
|------|-----------|----------|
| calcium_serum | < 7.6 mg/dL | CRITICAL |
| calcium_serum | < 7.8 mg/dL | WARNING |

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/k4-personal && npx wrangler deploy
```

## See Also

- [API Reference](../docs/API_REFERENCE.md#3-k4-personal)'

write_readme "k4-hubs" '# k4-hubs

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

- [API Reference](../docs/API_REFERENCE.md#4-k4-hubs)'

write_readme "p31-bouncer" '# p31-bouncer

**Status:** 🟢 Live
**Deployed:** 2026-04-21
**CWP:** 25 (JWT Auth)

## Purpose

Cryptographic gateway. Converts room codes into signed JWTs via PBKDF2 key derivation.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth` | Mint JWT from room code |
| POST | `/verify` | Validate JWT |

## Quick Test

```bash
curl -s -X POST https://p31-bouncer.trimtab-signal.workers.dev/auth \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","roomCode":"ABC123"}'
```

## Secrets

```bash
npx wrangler secret put P31_JWT_SECRET
```

## Deploy

```bash
cd ~/andromeda/04_SOFTWARE/p31-bouncer && npx wrangler deploy
```

## See Also

- [Security](../docs/SECURITY.md)'

write_readme "p31-cortex" '# p31-cortex

**Status:** 🟡 Staging (not deployed)

## Purpose

7-agent Durable Object orchestration system. Designed to coordinate multiple AI agents with different specialties.

## Current State

Stub with schema definitions. Not implemented. The simpler p31-agent-hub handles current needs.

## See Also

- [Architecture](../docs/ARCHITECTURE.md#staging-components)'

write_readme "kenosis-mesh" '# kenosis-mesh

**Status:** 🟡 Staging (architectural design only)

## Purpose

7-node peer network extending beyond the K₄ core four. Named after kenosis (self-emptying).

## Current State

Architectural design documents only. No deployed code.

## See Also

- [Architecture](../docs/ARCHITECTURE.md)'

write_readme "reflective-chamber" '# reflective-chamber

**Status:** 🟡 Scaffold on disk (not deployed as cron)
**CWP:** 22 (scaffold)

## Purpose

Cloudflare Workflow for weekly longitudinal synthesis. Queries D1 for 7-day telemetry windows, computes trends, writes summaries to PersonalAgent.

## Current State

Source exists. Not deployed because D1 database_id placeholder needs actual ID.

## Deploy (When Ready)

```bash
cd ~/andromeda/04_SOFTWARE/reflective-chamber
# Fix D1 database_id in wrangler.toml first
npx wrangler deploy
```

## See Also

- [Telemetry](../docs/TELEMETRY_AND_DEPLOYMENT.md)'

write_readme "p31-state" '# p31-state

**Status:** 🔴 Dormant

## Purpose

KV-backed state management. Superseded by SQLite-backed Durable Objects.

## See Also

- [Architecture](../docs/ARCHITECTURE.md)'

write_readme "workers" '# workers/ (Legacy Worker Scripts)

**Status:** 🔴 Deprecated
**Location:** `~/andromeda/04_SOFTWARE/workers/`

## Contents

| File | Purpose |
|------|---------|
| `love-ledger.ts` | LOVE token economy DO |
| `emergency-broadcast.ts` | Emergency broadcast system |
| `D1_MIGRATION.md` | D1 migration guide |

## Note

These scripts predate the CWP-based architecture. The live workers were built from scratch during CWP 17-28.'

write_readme "bonding" '# bonding

**Status:** 🟢 Shipped (standalone app)
**Shipped:** March 10, 2026

## Purpose

Chemistry learning game. Players build molecules on a 3D canvas.

## Architecture

Standalone Vite + React + React Three Fiber + Zustand + Vitest app. Not part of the mesh.

## See Also

- Located at `~/andromeda/04_SOFTWARE/bonding/`'

write_readme "cloudflare-worker" '# cloudflare-worker (Legacy)

**Status:** 🔴 Superseded
**Superseded by:** p31-agent-hub, k4-cage, k4-personal, k4-hubs, p31-bouncer

## Purpose

Original monolithic Cloudflare Worker. Replaced by microservice architecture (5 specialized workers).'

write_readme "backend" '# backend

**Status:** 🔴 Dormant

## Purpose

Originally planned FastAPI + PostgreSQL backend. Superseded by Cloudflare Workers architecture (zero cost on Free Tier).

## See Also

- [Architecture — Free Tier Budget](../docs/ARCHITECTURE.md)'

echo ""
echo "Done. 14 READMEs written."
