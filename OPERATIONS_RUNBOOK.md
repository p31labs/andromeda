# P31 SOVEREIGN ORGANISM: MASTER OPERATIONS RUNBOOK

**Version:** 4.0 | **Date:** 2026-06-01
**Repo:** `C:\Users\sandra\Documents\P31_Andromeda`

---

## I. System Architecture Map

### Local Hardware Engine (Windows 11)

| Component | Role | Port/Endpoint |
|-----------|------|---------------|
| **Ollama** | Local inference engine (qwen2.5-coder:7b) | `localhost:11434` |
| **LiteLLM Proxy** | Universal API switchboard | `localhost:4000` |
| **qwen2.5-coder** | Local code generation model | Via Ollama |
| **p31-discord-bot** | Discord Gateway bot (Docker) | Depends on p31-backend |
| **p31-backend** | FastAPI Python backend (Docker) | `localhost:8000` |
| **VS Code + Continue.dev** | IDE connected to LiteLLM | `localhost:4000` |
| **Kilo CLI** | Local code execution (pwsh) | Workspace root |

### Cloudflare Edge

| Service | Type | URL |
|---------|------|-----|
| **PHOS OS** | Pages (Astro/React) | `https://phos.p31ca.org` |
| **phos-api** | Worker (routing + Discord crisis alerter) | `api.phosphorus31.org` |
| **donate-api** | Worker (Stripe checkout + webhook) | `https://donate-api.trimtab-signal.workers.dev` |
| **bonding-relay** | Worker + KV (BONDING multiplayer) | `bonding-relay.trimtab-signal.workers.dev` |

---

## II. Daily Ignition Sequence (Local Engine Boot)

Run these steps when starting your workstation to bring the local mesh online.

### 1. Start Ollama

```powershell
ollama serve
```

Verify: `http://localhost:11434/` → `Ollama is running`

Pre-load the model to avoid cold-start latency:

```powershell
ollama run qwen2.5-coder:7b-instruct-q4_K_M
```

### 2. Start Docker Stack (LiteLLM + Backend + Discord Bot)

```powershell
cd C:\Users\sandra\Documents\P31_Andromeda
docker compose up -d
```

This starts three containers:
- **p31-backend** — FastAPI at `localhost:8000`
- **p31-discord-bot** — Discord Gateway (depends on backend)
- **p31-local-edge** — Miniflare local edge simulator at `localhost:8787`

Verify LiteLLM health: `http://localhost:4000/health`

### 3. Arm the Agent Forge

Open VS Code. Verify Continue.dev extension is active and pointing to `PHOS Local` (`http://localhost:4000`).

### 4. Verify Endpoint Config

The app uses a 3-tier endpoint resolution (see `phos/src/config/endpoints.ts`):
1. `localStorage.getItem('phos-endpoint-override')` — runtime override
2. `VITE_*` env vars — build-time
3. Default: `localhost:4000` / `localhost:4001`

To set a runtime override (e.g. pointing to production proxy):

```javascript
// In browser console on phos.p31ca.org
localStorage.setItem('phos-endpoint-override', JSON.stringify({
  vectorProxy: 'https://your-proxy.example.com/v1/embeddings',
  ragProxy: 'https://your-proxy.example.com'
}));
```

---

## III. Edge Deployment Protocols

### 1. Deploy PHOS OS (Frontend)

```powershell
cd C:\Users\sandra\Documents\P31_Andromeda\phos
npx astro build
$env:CLOUDFLARE_API_TOKEN="cfat_..."
$env:CLOUDFLARE_ACCOUNT_ID="ee05f70c...257e3a2fa"
npx wrangler pages deploy dist/ --project-name=phos-btn --commit-dirty=true
```

Live URL: `https://phos.p31ca.org`

### 2. Deploy phos-api (Core Routing + Discord Alerter)

```powershell
cd C:\Users\sandra\Documents\P31_Andromeda\phos\workers\phos-api
$env:CLOUDFLARE_API_TOKEN="cfat_..."
$env:CLOUDFLARE_ACCOUNT_ID="ee05f70c...257e3a2fa"
npx wrangler deploy
```

### 3. Deploy donate-api (Revenue Pipeline)

```powershell
cd C:\Users\sandra\Documents\P31_Andromeda\04_SOFTWARE\donate-api
$env:CLOUDFLARE_API_TOKEN="cfat_..."
$env:CLOUDFLARE_ACCOUNT_ID="ee05f70c...257e3a2fa"
npx wrangler deploy
```

### 4. Deploy BONDING Relay Worker

```powershell
cd C:\Users\sandra\Documents\P31_Andromeda\04_SOFTWARE\bonding
$env:CLOUDFLARE_API_TOKEN="cfat_..."
$env:CLOUDFLARE_ACCOUNT_ID="ee05f70c...257e3a2fa"
npx wrangler deploy
```

---

## IV. Secrets & Environment Management

### Cloudflare Worker Secrets

Secrets must be pushed per-worker. Always navigate to the worker directory first.

```powershell
# Example: Update Discord Webhook for phos-api
cd C:\Users\sandra\Documents\P31_Andromeda\phos\workers\phos-api
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put DISCORD_BOT_TOKEN
```

**Current Live CF Secrets:**

| Worker | Secret | Purpose |
|--------|--------|---------|
| `phos-api` | `DISCORD_WEBHOOK_URL` | Crisis alert notifications |
| `phos-api` | `DISCORD_BOT_TOKEN` | Bot authentication |
| `donate-api` | `STRIPE_SECRET_KEY` | Payment processing |
| `donate-api` | `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |

### Local Environment Variables (Docker)

Local containers read from `.env` at repo root.

**Location:** `C:\Users\sandra\Documents\P31_Andromeda\.env`

After changing `.env`, force a rebuild:

```powershell
# Rebuild a specific service
docker compose up -d --force-recreate --build p31-discord-bot

# Or rebuild all
docker compose up -d --force-recreate --build
```

### Stripe Webhook Configuration

If the `donate-api` URL changes:

1. Stripe Dashboard → Developers → Webhooks
2. Add Endpoint: `https://donate-api.trimtab-signal.workers.dev/stripe-webhook`
3. Listen for: `checkout.session.completed`

---

## V. Development Hotkeys & Shortcuts

### Kilo (CLI Agent)

| Action | Command |
|--------|---------|
| Open Kilo TUI | `kilo` |
| Run tests | `npx vitest run` |
| Run with coverage | `npx vitest run --coverage` |
| Build PHOS | `npx astro build` |

### PHOS Runtime Hotkeys

| Key | Action |
|-----|--------|
| `H` | Toggle HUD |
| `0` | Crisis mode (spoons → 0) |
| `Escape` | Exit crisis / close HUD |
| `Enter` | Submit (context-dependent) |

### Spoon States

| State | Spoons | Theme | Behavior |
|-------|--------|-------|----------|
| CRISIS | 0 | CRISIS | Guardian mode, minimal UI |
| SANCTUARY | 1-2 | SANCTUARY | Simplified UI, reduced motion |
| BRIDGE | 3 | BRIDGE | Full UI, standard complexity |
| QUANTUM | 4-5 | QUANTUM | Full UI, mono font, max features |

---

## VI. Surface Inventory

| Surface | File | Key Dependency |
|---------|------|----------------|
| Greeting | `surfaces/GreetingSurface.tsx` | — |
| Ignition | `surfaces/IgnitionSurface.tsx` | — |
| Bonding | `surfaces/BondingSurface.tsx` | CF KV relay |
| Compass | `surfaces/CompassSurface.tsx` | Markov chain analytics |
| Buffer | `surfaces/ChaosIngest.tsx` | Yjs CRDT + EmbeddingWorker |
| Vault | `surfaces/RetroVaultSurface.tsx` | PGLite + WebCrypto |
| Grid | `surfaces/ConnectionGridSurface.tsx` | Canvas force graph |
| Node Zero | `surfaces/NodeZeroSurface.tsx` | WebSocket state machine |
| Ledger | `surfaces/LedgerSurface.tsx` | PGLite WAL + hash chain |
| Hearth | `surfaces/HearthSurface.tsx` | Service Worker + Push API |
| Arcade | `surfaces/ArcadeSurface.tsx` | postMessage RPC bridge |
| Archive | `surfaces/ShakeStream.tsx` | RAG streaming + AbortController |
| Warehouse | `surfaces/WarehouseSurface.tsx` | PGLite live() + virtualization |
| Settings | `surfaces/SettingsSurface.tsx` | — |

---

## VII. Troubleshooting Matrix

| Symptom | Diagnosis | Resolution |
|---------|-----------|------------|
| **Ollama model won't load** | VRAM full or model not pulled | `ollama pull qwen2.5-coder:7b-instruct-q4_K_M` |
| **LiteLLM proxy unreachable** | Docker container not running | `docker compose up -d` then check `localhost:4000/health` |
| **Port 3000/4000/8000 in use** | Stale process | `netstat -ano \| Select-String ":<PORT>"` → `taskkill /PID <N> /F` |
| **Discord bot "Invalid Token"** | Docker cached old `.env` | `docker compose up -d --force-recreate --build p31-discord-bot` |
| **CF Worker `webhookConfigured: false`** | Env var not bound | Run `npx wrangler secret put SECRET_NAME` in worker dir |
| **PHOS shows blank SPA** | Build failed or chunk 404 | Rebuild: `npx astro build`, check `dist/` exists |
| **Embedding returns zeros** | LiteLLM proxy unreachable or model not loaded | Check `localhost:4000/health`, verify `nomic-embed-text:latest` is loaded in LiteLLM config |
| **ShakeStream shows error** | qwen2.5-coder proxy unreachable | Graceful degradation — error message shown, no crash |
| **Yjs textarea empty on reload** | localStorage draft missing or corrupt | Draft persists to `chaos-ingest-draft` key; clear and retry |
| **Service Worker not registering** | `sw-hearth.js` not in `public/` or wrong path | Verify file exists at `phos/public/sw-hearth.js` |
| **Tests hang (timeout)** | Yjs/Worker APIs in jsdom | Run individual test files: `npx vitest run src/__tests__/bioStore.test.ts` |
| **Markov chain not learning** | Navigation log too short (< 5 entries) | Navigate between surfaces 5+ times; log stored in localStorage `phos-nav-log` |

---

## VIII. Data Persistence Map

| Data | Storage | Key | Purpose |
|------|---------|-----|---------|
| LOVE balance | localStorage + PGLite WAL | `p31_karma_balance` | Care economy credits |
| LOVE ledger | PGLite | `karma_ledger` table | Append-only signed transaction history |
| Journal entries | PGLite | `unified_knowledge_graph` | Full-text search + RAG context |
| Draft text | localStorage | `chaos-ingest-draft` | Crash-safe Y.js draft |
| Navigation log | localStorage | `phos-nav-log` | Markov chain training data (200 max) |

---

## IX. Security Boundaries

| Boundary | Rule |
|----------|------|
| **WebWorker** | Runs in isolated thread; no DOM access; communicates via `postMessage` only |
| **iframe (Arcade)** | `sandbox="allow-scripts allow-same-origin allow-popups"`; origin-checked on `message` |
| **PGLite** | Origin-private FileSystem Access; no cross-origin reads |
| **Yjs** | Single-document CRDT; no sync server (offline-first) |
| **SW (Hearth)** | Scope `/`; intercepts push, message, and notificationclick events only |
| **Stripe Webhooks** | Signature verified via `STRIPE_WEBHOOK_SECRET` |

---

*This runbook is the single source of truth for the P31 Sovereign Organism. Update it when architecture changes. Never rely on memory.*
