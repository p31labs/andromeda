# WCD R04 — Cloudflare Worker Audit

**Date:** 2026-05-24
**Method:** Full inventory of all `wrangler.toml` files in main tree (excluding worktrees and archives). Cross-referenced against `04_SOFTWARE/cloudflare-worker/command-center/status.json`.
**Total unique workers found:** 67 (main tree, excluding worktrees/archives)
**Command Center tracked workers:** 26 fleet rows (+ delta-ignition-v3 meta-entry)

---

## Legend

- ✅ = Properly configured, bindings present, no obvious issues
- ⚠️ = Configured but has placeholder values, commented-out bindings, or potential issues
- ❌ = Missing critical config (no entry point, broken bindings, or not a real worker)

---

## TIER 1 — Core Infrastructure Workers

These are the workers tracked by the Command Center status.json as production fleet.

---

### Worker: phosphorus31-org
- **Path**: `wrangler.toml` (root)
- **Bindings**: None (static site via `[site] bucket]`)
- **Entry**: `./dist/_worker.js`
- **Route**: phosphorus31.org (Cloudflare Pages)
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Minimal config. No compatibility flags. Static bucket deploy.

### Worker: p31ca-org
- **Path**: `04_SOFTWARE/p31ca/wrangler.toml`
- **Bindings**: None (Pages static)
- **Entry**: `dist/` (pages_build_output_dir)
- **Route**: p31ca.org, www.p31ca.org
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Standard Pages config.

### Worker: ops-p31ca-org (Hearing Ops)
- **Path**: `04_SOFTWARE/p31-hearing-ops/wrangler.toml`
- **Bindings**: None (Pages static)
- **Entry**: `dist/` (pages_build_output_dir)
- **Route**: ops.p31ca.org
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Dedicated project per note — correct, avoids collision with p31ca hub.

### Worker: bonding-p31ca-org
- **Path**: `N0/worker/wrangler.toml` (name: `p31-bonding-relay`)
- **Bindings**: KV `GAME_KV` (id: `161faa0a...`)
- **Entry**: `src/index.ts`
- **Route**: bonding.p31ca.org
- **In Command Center?**: yes (as `p31-bonding-relay`)
- **Status**: ✅
- **Issues**: Route-only worker — root GET 404 is expected (audit anomaly noted).

### Worker: command-center
- **Path**: `04_SOFTWARE/cloudflare-worker/command-center/wrangler.toml`
- **Bindings**: KV `STATUS_KV`, D1 `EPCP_DB`, R2 `FORENSICS_HOT`, R2 `FORENSICS_COLD`, R2 `ARTIFACTS`, R2 `AUDIT_EXPORTS`, DO `CRDT_SESSION_DO`
- **Entry**: `src/index.js`
- **Route**: `command-center.trimtab-signal.workers.dev`, cron `*/5 * * * *`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Heavy binding footprint (4× R2, KV, D1, DO). Migration re-declaration note about API 10074. Secrets required: `P31_FHIR_SECRET`, `STATUS_TOKEN`, `CF_API_TOKEN`, `DISCORD_WEBHOOK_URL`.

### Worker: genesis-gate
- **Path**: `04_SOFTWARE/genesis-gate/wrangler.toml`
- **Bindings**: KV `EVENTS_KV` (id: `51b6a114...`)
- **Entry**: `src/index.ts`
- **Route**: `genesis-gate.trimtab-signal.workers.dev/health`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Secret `ADMIN_TOKEN` required. Observability enabled.

### Worker: p31-telemetry
- **Path**: `04_SOFTWARE/telemetry-worker/wrangler.toml`
- **Bindings**: KV `TELEMETRY_KV` (id: `20da3c8d...`)
- **Entry**: `src/worker.ts`
- **Route**: `p31-telemetry.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: API-only worker — root GET 404 is expected (audit anomaly noted). Minimal config.

### Worker: donate-api
- **Path**: `04_SOFTWARE/donate-api/wrangler.toml`
- **Bindings**: None active (KV `DONATE_EVENTS` commented out)
- **Entry**: `src/worker.ts`
- **Route**: `donate-api.phosphorus31.org/health`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: KV namespace for idempotency is commented out. Secrets required: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DISCORD_WEBHOOK_URL`. No KV binding means no idempotency for Stripe webhooks.

### Worker: p31-stripe-webhook
- **Path**: `04_SOFTWARE/cloudflare-worker/` (name: `p31-social-broadcast` in wrangler.toml)
- **Bindings**: None (Upstash Redis via secret, not CF binding)
- **Entry**: `p31_social_broadcast_worker.js`
- **Route**: `mesh.p31ca.org/*`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: Name mismatch — wrangler.toml says `p31-social-broadcast` but CC lists as `p31-stripe-webhook`. Route-only worker (root GET 404 expected). Secret `UPSTASH_TOKEN` required but not a CF binding.

### Worker: api-phosphorus31-org
- **Path**: `phosphorus31.org/planetary-planet/wrangler.toml` (name: `p31-donation-relay`)
- **Bindings**: None
- **Entry**: `src/worker/index.ts`
- **Route**: `api-phosphorus31-org.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: Name mismatch — wrangler.toml says `p31-donation-relay` but CC lists as `api-phosphorus31-org`. DNS unverified in audit environment.

### Worker: fawn-guard
- **Path**: `04_SOFTWARE/cloudflare-worker/bouncer/wrangler.toml` (name: `p31-bouncer`)
- **Bindings**: None
- **Entry**: `src/index.js`
- **Route**: `fawn-guard.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: Name mismatch — wrangler.toml says `p31-bouncer` but CC lists as `fawn-guard`. Secret `BOUNCER_GATE_TOKEN` required.

### Worker: p31-signaling
- **Path**: `p31-arcade/workers/arcade-signal/wrangler.toml` (name: `p31-arcade-signal`)
- **Bindings**: None
- **Entry**: `src/index.ts`
- **Route**: `api-arcade.p31ca.org/*`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: Name mismatch — wrangler.toml says `p31-arcade-signal` but CC lists as `p31-signaling`. Route-only worker. CPU limit set to 10ms (free tier).

### Worker: p31-vault
- **Path**: `p31-vault/wrangler.toml`
- **Bindings**: None (Pages static)
- **Entry**: `dist/` (pages_build_output_dir)
- **Route**: `p31-vault.pages.dev`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Pages project. Audit noted prod alias needs CF Pages branch set.

### Worker: p31-mesh
- **Path**: `04_SOFTWARE/cloudflare-pages/p31-mesh/wrangler.toml`
- **Bindings**: None (Pages static)
- **Entry**: `.` (root deploy)
- **Route**: `p31-mesh.pages.dev`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Static Pages project.

### Worker: p31-lab
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `p31-lab.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for p31-lab.** Listed in CC but no corresponding directory or config in main tree. May be deployed from a worktree or missing from repo.

### Worker: will-workshop
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `will-workshop.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for will-workshop.** Listed in CC but no corresponding directory or config in main tree.

### Worker: bash-lab
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `bash-lab.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for bash-lab.** Listed in CC but no corresponding directory or config in main tree.

### Worker: willow-garden
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `willow-garden.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for willow-garden.** Listed in CC but no corresponding directory or config in main tree.

### Worker: christyn-corner
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `christyn-corner.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for christyn-corner.** Listed in CC but no corresponding directory or config in main tree.

### Worker: k4-cage
- **Path**: `04_SOFTWARE/k4-cage/wrangler.toml`
- **Bindings**: DO `K4_TOPOLOGY`, DO `FAMILY_MESH_ROOM`, KV `K4_MESH` (id: `a8a2ab8f...`)
- **Entry**: `src/index.js`
- **Route**: `k4-cage.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: D1 binding commented out. Migration history well-documented. Secrets: `ADMIN_TOKEN`, `INTERNAL_FANOUT_TOKEN`.

### Worker: p31-bouncer
- **Path**: `04_SOFTWARE/cloudflare-worker/bouncer/wrangler.toml`
- **Bindings**: None
- **Entry**: `src/index.js`
- **Route**: `p31-bouncer.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: Same file as fawn-guard above — CC lists both names. Secret `BOUNCER_GATE_TOKEN` required.

### Worker: p31-phenix
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `p31-phenix.pages.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for p31-phenix.** Listed in CC but no corresponding directory or config in main tree. May be a Pages project deployed from a worktree.

### Worker: p31-technical-library
- **Path**: `04_SOFTWARE/status-dashboard/wrangler.toml` (name: `status-dashboard`)
- **Bindings**: None (Pages static)
- **Entry**: `/` (root, static HTML)
- **Route**: `p31-technical-library.pages.dev`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: Name mismatch — wrangler.toml says `status-dashboard` but CC lists as `p31-technical-library`. Minimal config (8 lines).

### Worker: love_ledger_worker
- **Path**: `workers/love-ledger/wrangler.toml` (name: `love-ledger`) AND `04_SOFTWARE/workers/wrangler.toml` (name: `p31-workers`)
- **Bindings**: D1 `love-ledger` (id: `592e3e2e...`), KV `SPOONS_KV` (id: `dbc13218...`), DO `LoveTransactionDO`
- **Entry**: `src/index.ts` (love-ledger) / `love-ledger.ts` (p31-workers)
- **Route**: `love-ledger.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: **Two separate wrangler.toml files claim love-ledger functionality.** `workers/love-ledger/` has D1 binding. `04_SOFTWARE/workers/` has KV+DO bindings and is the orchestrator pool. Potential conflict — the `04_SOFTWARE/workers/wrangler.toml` references `love-ledger.ts` as entry but the actual source is in `workers/love-ledger/src/index.ts`. CWP-042 GME tracking implemented.

### Worker: carrie-agent
- **Path**: *Not found as standalone wrangler.toml*
- **Bindings**: Unknown
- **Entry**: Unknown
- **Route**: `carrie-agent.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ❌
- **Issues**: **No wrangler.toml found for carrie-agent.** Listed in CC but no corresponding directory or config in main tree.

### Worker: p31-social-engine
- **Path**: `04_SOFTWARE/cloudflare-worker/social-drop-automation/wrangler.toml` (name: `p31-social-worker`)
- **Bindings**: None (cron only)
- **Entry**: `worker.js`
- **Route**: `p31-social-engine.trimtab-signal.workers.dev`, cron `0 17 * * *`
- **In Command Center?**: yes
- **Status**: ⚠️
- **Issues**: Name mismatch — wrangler.toml says `p31-social-worker` but CC lists as `p31-social-engine`. Many secrets listed (Twitter, Reddit, Bluesky, Mastodon, Nostr, Substack) — all must be set via `wrangler secret put`. No KV/D1 bindings.

### Worker: p31-q-factor
- **Path**: `04_SOFTWARE/cloudflare-worker/q-factor/wrangler.toml`
- **Bindings**: KV `QFACTOR_KV` (id: `92fb82b2...`)
- **Entry**: `src/index.ts`
- **Route**: `api.p31ca.org/qfactor/*`
- **In Command Center?**: no (NOT in status.json)
- **Status**: ✅
- **Issues**: Not tracked in CC. Secrets: `P31_API_SECRET`, `P31_FHIR_SECRET`. Observability enabled.

### Worker: p31-social-broadcast
- **Path**: `04_SOFTWARE/cloudflare-worker/wrangler.toml`
- **Bindings**: None
- **Entry**: `p31_social_broadcast_worker.js`
- **Route**: `mesh.p31ca.org/*`
- **In Command Center?**: no (NOT in status.json — but may be the `p31-stripe-webhook` entry)
- **Status**: ⚠️
- **Issues**: Appears to be the old name for p31-stripe-webhook. Secret `UPSTASH_TOKEN` required.

---

## TIER 2 — K₄ Topology Workers

The K₄ tetrahedron backbone. All service-bind to each other.

### Worker: k4-cage
- **Path**: `04_SOFTWARE/k4-cage/wrangler.toml`
- **Bindings**: DO `K4_TOPOLOGY`, DO `FAMILY_MESH_ROOM`, KV `K4_MESH`
- **Entry**: `src/index.js`
- **Route**: `k4-cage.trimtab-signal.workers.dev`
- **In Command Center?**: yes
- **Status**: ✅
- **Issues**: See Tier 1 above.

### Worker: k4-personal
- **Path**: `04_SOFTWARE/k4-personal/wrangler.toml`
- **Bindings**: DO `PersonalAgent`, KV `K4_MESH` (same namespace as k4-cage), AI binding
- **Entry**: `src/index.js`
- **Route**: `k4-personal.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Shares KV namespace with k4-cage (logical key isolation). SOULSAFE fusion config present. Observability enabled.

### Worker: k4-hubs
- **Path**: `04_SOFTWARE/k4-hubs/wrangler.toml`
- **Bindings**: DO `HubFusionAgent`, service bindings to `k4-cage` and `k4-personal`
- **Entry**: `src/index.js`
- **Route**: `k4-hubs.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Secrets: `HUBS_WRITE_TOKEN`, `HUB_LIVE_RELAY_SECRET`. Observability enabled.

### Worker: tetra-hub
- **Path**: `workers/tetra-hub/wrangler.toml`
- **Bindings**: Service bindings to `K4_CAGE`, `K4_PERSONAL`, `K4_HUBS`
- **Entry**: `src/index.js`
- **Route**: `tetra-hub.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Read-only aggregator. No KV/D1 — pure service-binding fan-out. Observability enabled.

### Worker: p31-agent-hub
- **Path**: `04_SOFTWARE/p31-agent-hub/wrangler.toml`
- **Bindings**: DO `AgentSession`, service bindings to `k4-cage`, `k4-personal`, `k4-hubs`, AI binding
- **Entry**: `src/index.js`
- **Route**: `p31-agent-hub.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Has `env.internal` variant. Workers AI model: `@cf/meta/llama-3.1-8b-instruct`. Free-tier SQLite DOs.

### Worker: k4-agent-hub (packages)
- **Path**: `packages/k4-agent-hub/wrangler.toml`
- **Bindings**: DO `ForgeHub`, `CounselHub`, `ScholarHub`, `ScribeHub`, KV `K4_AGENT_HUB`
- **Entry**: `src/index.js`
- **Route**: `k4-agent-hub.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. **Potential name collision with `p31-agent-hub`** — different worker name (`k4-agent-hub` vs `p31-agent-hub`) but overlapping purpose. Ollama + simplex-cloud fallback config. Free-tier SQLite DOs.

---

## TIER 3 — Mesh & State Workers

### Worker: mesh-living-core
- **Path**: `workers/mesh-living-core/wrangler.toml`
- **Bindings**: DO `MeshLivingCore`
- **Entry**: `src/index.ts`
- **Route**: `mesh-living-core.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. KV and D1 commented out. Pure DO architecture.

### Worker: p31-ecosystem-bridge
- **Path**: `workers/p31-ecosystem-bridge/wrangler.toml`
- **Bindings**: None
- **Entry**: `src/index.ts`
- **Route**: `p31-ecosystem-bridge.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. CORS-safe `/health`, `/api/sync`, `/api/status`. Env vars for PHOS_ORIGIN and P31CA_ORIGIN.

### Worker: node-one-bridge
- **Path**: `workers/node-one-bridge/wrangler.toml`
- **Bindings**: KV `CREDENTIALS_KV` (id: `node_one_credentials` — placeholder)
- **Entry**: `src/index.ts`
- **Route**: `node-one-bridge.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. KV id is placeholder `node_one_credentials` (not a real UUID). Secret `NODE_ONE_SECRET` required. References `bros-signaling` worker (not found in main tree).

### Worker: p31-state
- **Path**: `p31-state/wrangler.toml` AND `04_SOFTWARE/p31-state/wrangler.toml`
- **Bindings**: DO `MeshOrchestrator`, KV `P31_STATE_KV` (id: `20211dc2...`), service binding to `p31-identity-sbt`
- **Entry**: `src/index.ts`
- **Route**: `p31-state.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: **Two wrangler.toml files with same name `p31-state`** — one at `p31-state/` (has DO + service binding) and one at `04_SOFTWARE/p31-state/` (has KV only, no DO). The `p31-state/` version is more complete. D1 commented out in both.

### Worker: p31-identity-sbt
- **Path**: `p31-identity-sbt/wrangler.toml`
- **Bindings**: KV `SBT_KV` (id: `a1eb9d17...`)
- **Entry**: `src/index.ts`
- **Route**: `p31-identity-sbt.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Soulbound token issuer.

### Worker: p31-convergence-hub
- **Path**: `p31-convergence-hub/wrangler.toml`
- **Bindings**: KV `CONVERGENCE_KV` (id: `187083e7...`)
- **Entry**: `src/engine/convergence-engine.ts`
- **Route**: `p31-convergence-hub.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Has staging + prod environments with same KV id.

### Worker: geodesic-room
- **Path**: `04_SOFTWARE/geodesic-room/wrangler.toml`
- **Bindings**: DO `GeodesicRoom`
- **Entry**: `src/index.ts`
- **Route**: `geodesic-room.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Authoritative K₄ tetrahedron room. Free-tier SQLite DO.

### Worker: kenosis-mesh
- **Path**: `04_SOFTWARE/kenosis-mesh/wrangler.toml`
- **Bindings**: DO `RNode`, `ANODE`, `BNODE`, `CNODE`, `DNODE`, `ENODE`, `FNODE` (7 DOs!)
- **Entry**: `src/index.js`
- **Route**: `kenosis-mesh.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. **7 Durable Objects** — highest DO count of any worker. Secret `AUTH_TOKEN` required. `account_id` hardcoded. Free-tier SQLite DOs.

### Worker: spaceship-relay
- **Path**: `04_SOFTWARE/spaceship-earth/wrangler.toml`
- **Bindings**: KV `SPACESHIP_TELEMETRY` (id: `cb2cbcad...`)
- **Entry**: `worker/index.ts`
- **Route**: `spaceship-relay.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Name says `spaceship-relay` not `spaceship-earth`.

### Worker: p31-quantum-edge
- **Path**: `04_SOFTWARE/packages/quantum-edge/wrangler.toml`
- **Bindings**: KV `TELEMETRY_KV`, KV `STATE_KV`, KV `ALERTS_KV`, DO `NodeOneCoordinator`
- **Entry**: `worker.ts`
- **Route**: `p31-quantum-edge.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Smart placement enabled. Has staging + prod envs. Node One telemetry ingestion.

### Worker: cf-edge-lab
- **Path**: `packages/cf-edge-lab/wrangler.toml`
- **Bindings**: AI binding only
- **Entry**: `src/index.ts`
- **Route**: `cf-edge-lab.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Minimal config — AI playground.

### Worker: p31-mcp-server
- **Path**: `workers/p31-mcp-server/wrangler.toml`
- **Bindings**: DO `CognitiveStateDO` (script: `p31-cognitive-state`)
- **Entry**: `src/index.ts`
- **Route**: `p31-mcp-server.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. KV commented out. Routes commented out. Dev env defined. MCP 2025-03-26 protocol.

### Worker: p31-sync
- **Path**: `04_SOFTWARE/p31ca/workers/sync/wrangler.toml`
- **Bindings**: DO `SyncState`
- **Entry**: `index.ts`
- **Route**: `p31-sync.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. Secret `P31_SYNC_SECRET` required. No route defined.

### Worker: p31-passkey
- **Path**: `04_SOFTWARE/p31ca/workers/passkey/wrangler.toml`
- **Bindings**: KV `CHALLENGES` (id: `d9bf5ef3...`), D1 `p31-passkey-db` (id: `9d284b07...`)
- **Entry**: `src/index.ts`
- **Route**: `p31ca.org/api/passkey/*`, `p31ca.org/api/education/*`, `p31ca.org/api/hardware/*`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Full production + preview config. Well-structured.

### Worker: p31-fhir
- **Path**: `04_SOFTWARE/p31ca/workers/fhir/wrangler.toml`
- **Bindings**: KV `FHIR_TOKENS` (id: `c22cde91...`), D1 `p31-fhir-db` (id: `28fe667d...`)
- **Entry**: `src/index.ts`
- **Route**: `api.p31ca.org/fhir/*`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. Epic FHIR integration. Secrets: `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET`, `HA_WEBHOOK_CRITICAL`, `HA_WEBHOOK_WARNING`. Cron triggered via command-center (shared slot).

### Worker: glass-box-ws
- **Path**: `04_SOFTWARE/p31ca/workers/glass-box-ws/wrangler.toml`
- **Bindings**: KV `GLASS_BOX_KV` (id: `03148dd4...`)
- **Entry**: `src/index.ts`
- **Route**: `glass-box-ws.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. PQC session storage. Has staging + local envs. ML-KEM-768 default.

### Worker: p31-google-bridge
- **Path**: `04_SOFTWARE/p31-google-bridge/wrangler.toml`
- **Bindings**: KV `GOOGLE_OAUTH` (id: `4a21fa71...`)
- **Entry**: `src/index.js`
- **Route**: `p31-google-bridge.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. `GOOGLE_CLIENT_ID` set to `"replace-me"` in vars. Secret `GOOGLE_CLIENT_SECRET` required. Production env overrides redirect URLs.

### Worker: p31-forge
- **Path**: `04_SOFTWARE/p31-forge/wrangler.toml`
- **Bindings**: None active (KV `FORGE_KV` commented out)
- **Entry**: `worker/index.js`
- **Route**: `p31-forge.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. KV commented out. Many secrets listed (Bluesky, Mastodon, Dev.to, Hashnode, Zenodo, Twitter). Cron triggers empty (commented out for free tier). R2 commented out.

### Worker: p31-foundry-worker
- **Path**: `packages/p31-foundry/worker/wrangler.toml`
- **Bindings**: R2 `FOUNDRY_BUCKET`, Queue `FOUNDRY_JOBS` (producer + consumer)
- **Entry**: `src/index.js`
- **Route**: `p31-foundry-worker.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Queue-based job processing. Secret `FOUNDRY_AUTH_SECRET` optional.

### Worker: p31-cortex
- **Path**: `04_SOFTWARE/p31-cortex/wrangler.toml`
- **Bindings**: D1 `p31-cortex` (id: `6a645125...`), 7 DOs (`OrchestratorDO`, `LegalAgentDO`, `GrantAgentDO`, `ContentAgentDO`, `FinanceAgentDO`, `BenefitsAgentDO`, `KofiAgentDO`), AI binding
- **Entry**: `src/index.ts`
- **Route**: `p31-cortex.trimtab-signal.workers.dev`, cron `0 7,18 * * *`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. **7 Durable Objects** — tied for highest DO count. Workers AI. Free-tier SQLite DOs. Most complex worker in the fleet.

### Worker: discord-alerter
- **Path**: `workers/discord-alerter/wrangler.toml`
- **Bindings**: None
- **Entry**: `src/index.ts`
- **Route**: `discord-alerter.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: Not tracked in CC. Minimal config (3 lines). No bindings, no secrets declared. May be incomplete.

### Worker: p31-donation-relay
- **Path**: `phosphorus31.org/planetary-planet/wrangler.toml`
- **Bindings**: None
- **Entry**: `src/worker/index.ts`
- **Route**: `api-phosphorus31-org.trimtab-signal.workers.dev`
- **In Command Center?**: yes (as `api-phosphorus31-org`)
- **Status**: ✅
- **Issues**: Name mismatch with CC. No secrets declared — may rely on env vars from Pages.

---

## TIER 4 — Game & Arcade Workers

### Worker: p31-arcade-signal
- **Path**: `p31-arcade/workers/arcade-signal/wrangler.toml`
- **Bindings**: None
- **Entry**: `src/index.ts`
- **Route**: `api-arcade.p31ca.org/*`
- **In Command Center?**: yes (as `p31-signaling`)
- **Status**: ✅
- **Issues**: CPU limit 10ms (free tier). Name mismatch with CC.

### Worker: p31-smallball-signal
- **Path**: `packages/family-apps/p31-smallball/workers/signal/wrangler.toml`
- **Bindings**: KV `MATCH_STATE`, KV `ANALYTICS`, KV `PLAYER_CACHE`, KV `TENDENCIES`, KV `CROSS_GAME`, R2 `ASSETS`
- **Entry**: `src/index.ts`
- **Route**: `p31-smallball-signal.trimtab-signal.workers.dev`, cron `0 0 * * *`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. 5 KV namespaces + R2. Migration deleted `MatchCoordinator` DO (KV-only now).

### Worker: p31-gridiron-signal (×2)
- **Path**: `p31-cards/workers/signal/wrangler.toml` AND `p31-gridiron/workers/signal/wrangler.toml`
- **Bindings**: KV `MATCH_STATE`, KV `ANALYTICS`, KV `GAMEPLAN_CACHE`, KV `TENDENCIES`, KV `CROSS_GAME`, R2 `ASSETS`
- **Entry**: `src/index.ts`
- **Route**: `p31-gridiron-signal.trimtab-signal.workers.dev`, cron `0 0 * * *`
- **In Command Center?**: no
- **Status**: ⚠️
- **Issues**: **Two identical wrangler.toml files** — `p31-cards/workers/signal/` and `p31-gridiron/workers/signal/` have the same name, same KV IDs, same R2 bucket. Likely one is a copy. Not tracked in CC.

### Worker: spin-matchmaking
- **Path**: `04_SOFTWARE/spin-mesh/matchmaking-do/wrangler.toml`
- **Bindings**: DO `MatchmakingDO`, DO `HandoverDO` (cross-script: `spin-logistics`)
- **Entry**: `./index.ts`
- **Route**: `spin-matchmaking.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Cross-script DO reference.

### Worker: spin-logistics
- **Path**: `04_SOFTWARE/spin-mesh/logistics-do/wrangler.toml`
- **Bindings**: DO `HandoverDO`
- **Entry**: `./dist/index.js`
- **Route**: `spin-logistics.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ✅
- **Issues**: Not tracked in CC. Paired with spin-matchmaking.

### Worker: bonding-relay
- **Path**: `04_SOFTWARE/bonding/wrangler.toml`
- **Bindings**: D1 `p31-state-db` (id: `d7caa9c0...`), KV `TELEMETRY_KV` (id: `60a6817a...`)
- **Entry**: `worker/telemetry.ts`
- **Route**: `bonding-relay.trimtab-signal.workers.dev`
- **In Command Center?**: no (but `p31-bonding-relay` at N0/worker IS listed)
- **Status**: ⚠️
- **Issues**: **Potential duplicate of N0/worker (p31-bonding-relay).** Different bindings — this one has D1+KV, N0 has only KV. Different entry points. May be a different generation of the same worker.

---

## TIER 5 — Pages / Static Sites (no server logic)

These are Cloudflare Pages projects with `pages_build_output_dir` and no Worker logic.

| Worker | Path | In CC? | Status |
|--------|------|--------|--------|
| p31-command-center | `p31-command-center/wrangler.toml` | no | ✅ |
| p31-vault | `p31-vault/wrangler.toml` | yes | ✅ |
| p31-mesh-monitor | `p31-mesh-monitor/wrangler.toml` | no | ✅ |
| p31-arcade | `p31-arcade/wrangler.toml` | no | ✅ |
| p31-arcade-hub | `p31-arcade-hub/wrangler.toml` | no | ✅ |
| p31-arcade-prod | `p31-arcade-prod/wrangler.toml` | no | ⚠️ duplicate of p31-arcade |
| p31-cards | `p31-cards/wrangler.toml` | no | ✅ |
| p31-gridiron | `p31-gridiron/wrangler.toml` | no | ✅ |
| p31-liquid-sculptor | `p31-liquid-sculptor/wrangler.toml` | no | ✅ |
| p31-magnetic-poetry | `p31-magnetic-poetry/wrangler.toml` | no | ✅ |
| p31-orbital-drift | `p31-orbital-drift/wrangler.toml` | no | ✅ |
| p31-resonance-rings | `p31-resonance-rings/wrangler.toml` | no | ✅ |
| p31-vibe-studio | `p31-vibe-studio/wrangler.toml` | no | ✅ |
| p31-hearing-ops | `04_SOFTWARE/p31-hearing-ops/wrangler.toml` | yes | ✅ |
| p31ca | `04_SOFTWARE/p31ca/wrangler.toml` | yes | ✅ |
| chromatica | `chromatica/wrangler.toml` | no | ✅ |
| p31-pwa | `N0/pwa/wrangler.toml` AND `04_SOFTWARE/packages/node-zero/pwa/wrangler.toml` | no | ⚠️ duplicate |
| p31-smallball | `packages/family-apps/p31-smallball/wrangler.toml` | no | ✅ |
| warehouse-aj | `packages/family-apps/warehouse-aj/wrangler.toml` | no | ✅ |
| maid-manager | `packages/family-apps/maid-manager/wrangler.toml` | no | ✅ |
| culinary-matria | `packages/family-apps/culinary-matria/wrangler.toml` | no | ✅ |
| cheomatica | `packages/family-apps/cheomatica/wrangler.toml` | no | ✅ |
| matriarch-culinary-node-dashboard | `matriarch-culinary-node/dashboard/wrangler.toml` | no | ✅ |
| status-dashboard | `04_SOFTWARE/status-dashboard/wrangler.toml` | yes | ⚠️ name mismatch |
| sovereign-command-center | `04_SOFTWARE/sovereign-command-center/wrangler.toml` | no | ✅ |

---

## TIER 6 — Special / Template Workers

### Worker: chromatica (edge-worker)
- **Path**: `chromatica/edge-worker/wrangler.toml`
- **Bindings**: D1 `CHROMA_DB` (placeholder ID), D1 `ACCESSIBILITY_DB` (placeholder ID), R2 `ASSET_STORAGE`, R2 `THUMBNAIL_STORAGE`, KV `SESSION_CACHE` (placeholder ID), KV `VOICE_CACHE` (placeholder ID)
- **Entry**: `src/index.ts`
- **Route**: `chromatica.trimtab-signal.workers.dev`, cron `0 */6 * * *`
- **In Command Center?**: no
- **Status**: ❌
- **Issues**: **All binding IDs are placeholders** (`REPLACE_WITH_REAL_ID`, `REPLACE_WITH_KV_ID`, etc.). Not deployable without provisioning. Arthritis-optimized creative workstation.

### Worker: matriarch-culinary-node-worker
- **Path**: `matriarch-culinary-node/worker/wrangler.toml`
- **Bindings**: DO `PGLiteDurableObject`, KV `PGLITE_PERSISTENCE` (placeholder ID)
- **Entry**: Not specified (type: javascript)
- **Route**: `matriarch-culinary-node-worker.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ❌
- **Issues**: **KV ID is placeholder** `<YOUR_KV_NAMESPACE_ID>`. PGLite Durable Object. Not deployable.

### Worker: mvp-template
- **Path**: `templates/p31-12-pillar-system/edge-worker/wrangler.toml`
- **Bindings**: KV `MVP_CACHE` (placeholder), D1 `MVP_DB` (placeholder), DO `MVPSessionDO`, DO `MVPSyncDO`, R2 `MVP_FILES`
- **Entry**: `src/index.ts`
- **Route**: `mvp-template.p31ca.org`, `mvp-template.trimtab-signal.workers.dev`
- **In Command Center?**: no
- **Status**: ❌
- **Issues**: **Template worker — all IDs are placeholders.** Not intended for direct deployment. 123-line config with PQC, analytics, observability — comprehensive template.

### Worker: project-polyhedron
- **Path**: `wrangler.toml` (root)
- **Bindings**: None (static bucket)
- **Entry**: `./dist/_worker.js`
- **Route**: None defined
- **In Command Center?**: yes (as `phosphorus31-org`)
- **Status**: ✅
- **Issues**: Root-level config. Likely the phosphorus31.org Pages worker.

---

## CROSS-REFERENCE: Command Center vs. Main Tree

### Workers in CC but MISSING from main tree (❌ Ghost workers — 7):

| CC Name | Notes |
|---------|-------|
| p31-lab | No wrangler.toml found anywhere in main tree |
| will-workshop | No wrangler.toml found anywhere in main tree |
| bash-lab | No wrangler.toml found anywhere in main tree |
| willow-garden | No wrangler.toml found anywhere in main tree |
| christyn-corner | No wrangler.toml found anywhere in main tree |
| carrie-agent | No wrangler.toml found anywhere in main tree |
| p31-phenix | No wrangler.toml found anywhere in main tree |

**Assessment:** These 7 workers are listed in the Command Center as "online" but have no corresponding `wrangler.toml` in the main tree. They may be: (a) deployed from worktrees, (b) deployed manually without config in repo, or (c) orphaned entries in status.json.

### Workers in main tree but NOT in CC (⚠️ Untracked — 30+):

Key workers missing from CC tracking:
- **k4-personal** — K₄ backbone worker
- **k4-hubs** — K₄ backbone worker
- **tetra-hub** — K₄ aggregator
- **p31-agent-hub** — AI orchestrator
- **p31-cortex** — 7 DO agents + AI
- **p31-state** — State management
- **p31-identity-sbt** — Soulbound tokens
- **p31-convergence-hub** — Convergence engine
- **geodesic-room** — K₄ room DO
- **kenosis-mesh** — 7 DO mesh
- **p31-quantum-edge** — Node One telemetry
- **p31-fhir** — Epic FHIR integration
- **p31-passkey** — WebAuthn
- **p31-google-bridge** — Google OAuth
- **p31-forge** — Content forge
- **p31-foundry-worker** — Queue-based jobs
- **p31-ecosystem-bridge** — Cross-site bridge
- **mesh-living-core** — Living Mesh DO
- **node-one-bridge** — Wearable bridge
- **p31-mcp-server** — MCP protocol
- **cf-edge-lab** — AI edge lab
- **glass-box-ws** — PQC WebSocket
- **p31-sync** — CRDT sync
- **p31-smallball-signal** — Game signaling
- **p31-gridiron-signal** (×2) — Game signaling
- **spin-matchmaking** + **spin-logistics** — Spin mesh
- **bonding-relay** (04_SOFTWARE/bonding) — Possible duplicate
- **discord-alerter** — Discord alerts
- **p31-q-factor** — Q-factor API
- **k4-agent-hub** (packages) — Agent hub
- **chromatica** (edge-worker) — Placeholder IDs
- **matriarch-culinary-node-worker** — Placeholder IDs

### Name Mismatches (CC name ≠ wrangler.toml name):

| CC Name | wrangler.toml Name | File |
|---------|-------------------|------|
| p31-stripe-webhook | p31-social-broadcast | `04_SOFTWARE/cloudflare-worker/wrangler.toml` |
| api-phosphorus31-org | p31-donation-relay | `phosphorus31.org/planetary-planet/wrangler.toml` |
| fawn-guard | p31-bouncer | `04_SOFTWARE/cloudflare-worker/bouncer/wrangler.toml` |
| p31-signaling | p31-arcade-signal | `p31-arcade/workers/arcade-signal/wrangler.toml` |
| p31-social-engine | p31-social-worker | `04_SOFTWARE/cloudflare-worker/social-drop-automation/wrangler.toml` |
| p31-technical-library | status-dashboard | `04_SOFTWARE/status-dashboard/wrangler.toml` |

---

## DUPLICATE / OVERLAP FINDINGS

1. **p31-state** — Two wrangler.toml files: `p31-state/` (DO + service binding) and `04_SOFTWARE/p31-state/` (KV only). Risk of deploying wrong config.

2. **p31-bonding-relay** — `N0/worker/` (KV only, GAME_KV) vs `04_SOFTWARE/bonding/` (D1 + KV, different IDs). Different generations or different purposes?

3. **p31-gridiron-signal** — Two identical configs at `p31-cards/workers/signal/` and `p31-gridiron/workers/signal/`. Same KV IDs, same R2 bucket. One is likely a stale copy.

4. **p31-arcade** vs **p31-arcade-prod** — Same worker name `p31-arcade`, different configs. `p31-arcade-prod` points to `.pages.dev` URLs instead of custom domains.

5. **p31-pwa** — Two configs: `N0/pwa/` and `04_SOFTWARE/packages/node-zero/pwa/`. Same name, same config.

6. **love-ledger** — `workers/love-ledger/` (D1 binding) vs `04_SOFTWARE/workers/` (KV + DO, references `love-ledger.ts`). The `04_SOFTWARE/workers/` version is the orchestrator pool.

7. **k4-cage** — `04_SOFTWARE/k4-cage/` and `04_SOFTWARE/unified-k4-cage/` have the same name. The unified version is the CWP-30 refactor.

8. **p31-agent-hub** vs **k4-agent-hub** — Different names but overlapping AI agent purpose. `p31-agent-hub` uses K₄ service bindings; `k4-agent-hub` uses 4 hub DOs (Forge, Counsel, Scholar, Scribe).

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Total wrangler.toml files (main tree) | 67 |
| Workers tracked in Command Center | 26 |
| Ghost workers (in CC, not in repo) | 7 |
| Untracked workers (in repo, not in CC) | 30+ |
| Name mismatches | 6 |
| Duplicate/overlap configs | 8 groups |
| Workers with placeholder IDs (not deployable) | 3 |
| Workers with all bindings commented out | 2 |
| Total unique KV namespaces referenced | ~30 |
| Total unique D1 databases referenced | ~10 |
| Total unique R2 buckets referenced | ~6 |
| Total Durable Objects declared | ~25 |
| Workers with AI binding | 5 |
| Workers with cron triggers | 7 |
| Workers with queue bindings | 1 |

### Critical Issues

1. **7 ghost workers** in CC with no repo config — cannot be audited, updated, or redeployed from repo.
2. **30+ workers not tracked in CC** — the status dashboard is blind to most of the fleet.
3. **6 name mismatches** between CC and wrangler.toml — makes automated health checks unreliable.
4. **3 workers with placeholder IDs** (chromatica, matriarch-culinary-node, mvp-template) — not deployable without provisioning.
5. **8 duplicate/overlap config groups** — risk of deploying wrong version.
6. **donate-api** has KV idempotency commented out — Stripe webhook deduplication not active.
7. **p31-google-bridge** has `GOOGLE_CLIENT_ID = "replace-me"` in plaintext vars — not configured for production.

### Recommendations

1. Add all untracked workers to status.json fleet list.
2. Resolve name mismatches — align wrangler.toml names with CC names (or vice versa).
3. Remove or archive ghost worker entries from status.json if no longer deployed.
4. Consolidate duplicate configs (p31-state, p31-bonding-relay, p31-arcade, p31-pwa, k4-cage, p31-gridiron-signal).
5. Provision real IDs for placeholder workers or mark them as templates.
6. Enable KV idempotency on donate-api for Stripe webhook safety.
7. Set GOOGLE_CLIENT_ID for p31-google-bridge production.
