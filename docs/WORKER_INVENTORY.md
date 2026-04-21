# WORKER INVENTORY — CWP-2026-014 R04
**Date:** 2026-04-04
**Auditor:** Claude (Explore agent + Sonnet 4.6)
**Scan scope:** Full `/home/p31/andromeda/` tree via wrangler.toml enumeration

> **Update:** For an auto-generated table of every `wrangler.toml` under `04_SOFTWARE/` and `phosphorus31.org/`, see **[`WORKER_PAGES_MANIFEST.md`](WORKER_PAGES_MANIFEST.md)** (`pnpm run manifest:workers` from `04_SOFTWARE/`). This document remains a dated narrative + purpose audit.

---

## Summary
- **Total Workers found in codebase:** 14+ (12 in `04_SOFTWARE/`, 2 at root) — **plus K₄ line:** `k4-cage`, `k4-personal`, `k4-hubs` under `04_SOFTWARE/` (see K₄ stack below)
- **Cross-referenced with dashboard:** 10 matched
- **Dashboard-only (no local code):** 4 (see below)
- **ACTIVE:** 9 | **DORMANT:** 4 | **STALE:** 1

---

## K₄ stack (April 2026 integration note)

| Worker name | Repo path | Notes |
|-------------|-----------|--------|
| `k4-cage` | `04_SOFTWARE/k4-cage/` | **Unified (CWP-30):** `K4Topology` + `FamilyMeshRoom` DOs; optional D1 `telemetry` chain; KV `K4_MESH` fallback. Spec + copy source: `04_SOFTWARE/unified-k4-cage/`. Set `database_id` + `ADMIN_TOKEN` before deploy. |
| `k4-personal` | `04_SOFTWARE/k4-personal/` | Personal mesh only; uses `packages/k4-mesh-core`. |
| `k4-hubs` | `04_SOFTWARE/k4-hubs/` | Hub/dock layer; uses `packages/k4-mesh-core`. |
| _(deprecated)_ | `k4-worker/` (repo root) | **Sandbox only:** Wrangler name `k4-legacy-prototype` (distinct from production `k4-cage`). Different KV/API — see `k4-worker/README.md`. |

Shared library: `04_SOFTWARE/packages/k4-mesh-core/` (`@p31/k4-mesh-core`, private).

---

## Workers

### bonding-relay
- **Path:** `04_SOFTWARE/bonding/wrangler.toml`
- **Domain:** trimtab-signal.workers.dev (74 req/dashboard)
- **Bindings:** 1 — KV: `TELEMETRY_KV`
- **Entry:** `worker/telemetry.ts`
- **Purpose:** BONDING multiplayer relay. 14 routes: telemetry flush/seal, orphan recovery, session management, L.O.V.E. metrics (WCD-M08), bug reports (WCD-11), room coordination (WCD-13). Server-side SHA-256 for Daubert-compliant cryptographic finality.
- **Category:** ACTIVE

### spaceship-relay
- **Path:** `04_SOFTWARE/spaceship-earth/wrangler.toml`
- **Domain:** trimtab-signal.workers.dev (1.7K req/dashboard)
- **Bindings:** 1 — KV: `SPACESHIP_TELEMETRY`
- **Entry:** `worker/index.ts`
- **Purpose:** Spaceship Earth telemetry relay. Ed25519-verified state sync, OctoPrint G-code integration.
- **Category:** ACTIVE

### p31-cortex
- **Path:** `04_SOFTWARE/p31-cortex/wrangler.toml`
- **Domain:** trimtab-signal.workers.dev (2 req/dashboard)
- **Bindings:** 8 — D1: `p31-cortex`; DO: `OrchestratorDO`, `LegalAgentDO`, `GrantAgentDO`, `ContentAgentDO`, `FinanceAgentDO`, `BenefitsAgentDO`, `KofiAgentDO`
- **Entry:** `src/index.ts`
- **Purpose:** AI cortex for multi-agent workflows: legal deadlines, grant tracking, content scheduling, financial analysis, benefits, Ko-fi. Cron: 07:00 + 18:00 UTC daily.
- **Category:** ACTIVE

### kenosis-mesh
- **Path:** `04_SOFTWARE/kenosis-mesh/wrangler.toml`
- **Domain:** trimtab-signal.workers.dev (2 req/dashboard)
- **Bindings:** 7 — DO: `R_NODE`, `ANODE`, `BNODE`, `CNODE`, `DNODE`, `ENODE`, `FNODE`
- **Entry:** `src/index.js`
- **Purpose:** 7-node SIC-POVM quantum topology mesh. K4 complete graph with forward-routing between nodes A–F and central R node.
- **Category:** ACTIVE

### p31-quantum-edge
- **Path:** `04_SOFTWARE/packages/quantum-edge/wrangler.toml`
- **Domain:** quantum-edge.p31ca.org (route commented out, ready)
- **Bindings:** 4 — KV: `TELEMETRY_KV`, `STATE_KV`, `ALERTS_KV`; DO: `NodeOneCoordinator`
- **Entry:** `worker.ts`
- **Purpose:** Node One telemetry ingestion for biological metrics (calcium, PTH, HRV, vitamin D). Sub-50ms latency during calcium crisis events.
- **Category:** ACTIVE

### p31-telemetry
- **Path:** `04_SOFTWARE/telemetry-worker/wrangler.toml`
- **Domain:** production: p31ca.org (telemetry endpoint)
- **Bindings:** 1 — KV: `TELEMETRY_KV`
- **Entry:** `src/worker.ts`
- **Purpose:** Anonymous performance telemetry from Spaceship Earth. COPPA-compliant, no PII, 30-day retention. Separate from spaceship-relay.
- **Category:** ACTIVE

### p31-kofi-webhook
- **Path:** `wrangler-kofi.toml` (repo root)
- **Domain:** kofi.p31ca.org (388 req/dashboard)
- **Bindings:** 1 — KV: `NODE_COUNT_KV`
- **Entry:** `p31_kofi_webhook_worker.js`
- **Purpose:** Ko-fi webhook receiver. Node count milestones, Discord notifications. Cron: daily digest 17:20 UTC.
- **Category:** ACTIVE

### p31-social-worker
- **Path:** `04_SOFTWARE/cloudflare-worker/social-drop-automation/wrangler.toml`
- **Domain:** social.p31ca.org (2 req/dashboard)
- **Bindings:** 0 (env secrets only)
- **Entry:** `worker.js`
- **Purpose:** Unified social automation: Twitter, Reddit, Bluesky, Mastodon, Nostr, Substack. Wave scheduling (Mon=weekly, Wed=midweek, Fri=weekend, 1st=Zenodo). Cron: 17:00 UTC daily.
- **Category:** ACTIVE

### donate-api
- **Path:** `04_SOFTWARE/donate-api/wrangler.toml`
- **Domain:** donate-api.phosphorus31.org (19 req/dashboard)
- **Bindings:** 0 — secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DISCORD_WEBHOOK_URL`
- **Entry:** `src/worker.ts`
- **Purpose:** Stripe Checkout Session creation. CORS-protected. Handles checkout.session.completed events.
- **Category:** ACTIVE

### p31-ens-relay
- **Path:** `workers.toml` (repo root)
- **Domain:** andromeda.classicwilly.eth, bonding.classicwilly.eth
- **Bindings:** 0
- **Entry:** `src/index.js`
- **Purpose:** ENS domain resolution relay with IPFS gateway fallback.
- **Category:** DORMANT
- **Notes:** No dashboard request count. Experimental/staging only.

### p31-workers (love-ledger)
- **Path:** `04_SOFTWARE/workers/wrangler.toml`
- **Domain:** love-ledger.* on trimtab-signal.workers.dev (routes commented out)
- **Bindings:** 2 — D1: `love-ledger`; DO: `LoveTransactionDO`
- **Entry:** `love-ledger.ts`
- **Purpose:** Distributed L.O.V.E. Token Ledger. Soulbound currency: 50% sovereignty_pool (immutable) / 50% performance_pool (modulated by care_score).
- **Category:** DORMANT
- **Notes:** Routes not yet enabled. Pending D1/DO provisioning.

### p31-pwa
- **Path:** `04_SOFTWARE/packages/node-zero/pwa/wrangler.toml`
- **Bindings:** 0
- **Entry:** `dist/` (Pages build)
- **Purpose:** NodeZero PWA — Cloudflare Pages project, not a traditional Worker.
- **Category:** DORMANT

### p31-command-center
- **Path:** `04_SOFTWARE/sovereign-command-center/wrangler.toml`
- **Bindings:** 0
- **Entry:** `.next/` (Pages build)
- **Purpose:** Next.js command center — Cloudflare Pages project.
- **Category:** DORMANT

### p31-social-broadcast ⚠️ STALE — DO NOT DEPLOY
- **Path:** `04_SOFTWARE/cloudflare-worker/wrangler.toml`
- **Domain:** mesh.p31ca.org (legacy)
- **Bindings:** 0 (Upstash Redis via env)
- **Entry:** `p31_social_broadcast_worker.js`
- **Purpose:** Legacy multi-platform broadcast. All functionality now in `p31-social-worker` (social-drop-automation).
- **Category:** STALE
- **Notes:** Delete candidate per R04. Mock implementations only — real APIs are in p31-social-worker.

---

## Consolidation Candidates

| Keep | Delete | Reason |
|------|--------|--------|
| `p31-social-worker` | `p31-social-broadcast` | Fully consolidated. social-broadcast is stale with mock APIs. |
| `donate-api` | `stripe-donate` (dashboard only) | donate-api is active (19 req). stripe-donate has 0 req, 31d ago. |
| `p31-kofi-webhook` | `p31-kofi-telemetry` (dashboard only) | Main webhook is active (388 req). Telemetry variant has 0 requests. |

---

## Dashboard Workers Without Local Code

| Worker | Requests | Disposition |
|--------|----------|-------------|
| p31-kofi-telemetry | 0 | Delete — superseded by p31-kofi-webhook |
| p31-donation-relay | 0 | Delete — superseded by donate-api |
| p31-zenodo-publisher | 0 | No local code; `zenodo_upload.py` at repo root used instead |
| stripe-donate | 0 (31d ago) | Delete — superseded by donate-api |
| p31-multi-agent-mesh | — | No local wrangler.toml; likely merged into p31-cortex |

---

## R05 Target: Active Workers Needing `/health` Endpoints

Per CWP-2026-014 R05, every ACTIVE Worker needs `GET /health → { service, status, uptime, version, lastRequest, bindings }`:

- [ ] bonding-relay
- [ ] spaceship-relay
- [ ] p31-cortex
- [ ] kenosis-mesh (verify existing endpoint matches schema)
- [ ] p31-telemetry
- [ ] p31-kofi-webhook
- [ ] p31-social-worker
- [ ] donate-api

---

**R04 Status: COMPLETE**
