# WCD R01 — Ecosystem Audit: All Deployed Applications

**Date**: 2026-05-24
**Method**: Comprehensive audit of all applications in scope areas: 04_SOFTWARE/p31ca/, 04_SOFTWARE/bonding/, 04_SOFTWARE/spaceship-earth/, workers/, packages/
**Source Data**: WCD-R04_WORKER_INVENTORY.md, connectivity-summary.md, routing-verification-summary.md, command-center status.json

---

## Legend
- ✅ = Operational, properly configured
- ⚠️ = Issues present but functional
- ❌ = Critical issues, non-operational, or unverified
- 🟡 = Partial configuration / placeholder values

---

## 04_SOFTWARE/p31ca/ — Technical Hub (Astro/Pages)

### p31ca.org
- **Path**: 04_SOFTWARE/p31ca/
- **Type**: Astro static site → Cloudflare Pages
- **Status**: ✅
- **Build**: npm run build clean
- **Deploy**: p31ca Pages project
- **Issues**: None critical. Static hub with fleet links.

### Hearing Ops (ops.p31ca.org)
- **Path**: 04_SOFTWARE/p31-hearing-ops/
- **Type**: Vite PWA → Pages project `p31-hearing-ops`
- **Status**: ✅
- **Build**: Clean
- **Deploy**: Separate Pages project (correct isolation)
- **Issues**: None

### Workers under p31ca/
- **p31-passkey** — ✅ KV + D1 bindings, full config
- **p31-fhir** — ⚠️ Epic FHIR integration, secrets required (EPIC_CLIENT_ID, etc.), cron via command-center
- **p31-sync** — ⚠️ Secret P31_SYNC_SECRET required, no route defined
- **glass-box-ws** — ✅ PQC session storage, ML-KEM-768
- **p31ca workers/sync, passkey, fhir** — All tracked, configs present

---

## 04_SOFTWARE/bonding/ — BONDING Game

### BONDING (bonding.p31ca.org)
- **Path**: 04_SOFTWARE/bonding/
- **Type**: Vite + React + R3F + Zustand + Vitest
- **Status**: ✅ SHIPPED March 10, 2026
- **Tests**: 424 tests / 32 suites (canonical)
- **Build**: Clean (tsc --noEmit, vite build)
- **Multiplayer**: Cloudflare KV polling relay (3-10s intervals)
- **Genesis Block**: Court-grade telemetry, IndexedDB persistence
- **Issues**: None critical. Root GET 404 expected (route-only worker).

### bonding-relay (04_SOFTWARE/bonding/worker/)
- **Path**: 04_SOFTWARE/bonding/wrangler.toml
- **Bindings**: D1 p31-state-db, KV TELEMETRY_KV
- **Status**: ⚠️ Potential duplicate of N0/worker p31-bonding-relay
- **Issues**: Different bindings than N0 version. Different entry point.

---

## 04_SOFTWARE/spaceship-earth/ — Dashboard

### Spaceship Earth
- **Path**: 04_SOFTWARE/spaceship-earth/
- **Type**: Vite + R3F dashboard
- **Status**: 🟡 In Development
- **Worker**: spaceship-relay (04_SOFTWARE/spaceship-earth/wrangler.toml)
- **Bindings**: KV SPACESHIP_TELEMETRY
- **Issues**: Name mismatch (spaceship-relay vs spaceship-earth). Not tracked in CC.

---

## workers/ — Cloudflare Worker Fleet

### Tier 1: Core Infrastructure (CC Tracked)

| Worker | Status | Issues |
|--------|--------|--------|
| phosphorus31-org | ✅ | Static Pages, minimal config |
| p31ca-org | ✅ | Standard Pages |
| ops-p31ca-org | ✅ | Dedicated Pages project |
| p31-bonding-relay | ✅ | Route-only, root 404 expected |
| command-center | ✅ | Heavy bindings (4×R2, KV, D1, DO), secrets required |
| genesis-gate | ✅ | Secret ADMIN_TOKEN required |
| p31-telemetry | ✅ | API-only, root 404 expected |
| donate-api | ⚠️ | KV idempotency commented out, secrets required |
| p31-stripe-webhook | ⚠️ | Name mismatch (p31-social-broadcast), secret UPSTASH_TOKEN |
| api-phosphorus31-org | ⚠️ | Name mismatch (p31-donation-relay), DNS unverified |
| fawn-guard | ⚠️ | Name mismatch (p31-bouncer), secret BOUNCER_GATE_TOKEN |
| p31-signaling | ⚠️ | Name mismatch (p31-arcade-signal), CPU limit 10ms |
| p31-vault | ✅ | Pages project |
| p31-mesh | ✅ | Pages project |
| k4-cage | ✅ | DO + KV bindings, secrets required |
| p31-bouncer | ✅ | Same as fawn-guard |
| p31-technical-library | ⚠️ | Name mismatch (status-dashboard), minimal config |
| love_ledger_worker | ⚠️ | Two wrangler.toml files, CWP-042 implemented |
| p31-social-engine | ⚠️ | Name mismatch (p31-social-worker), many secrets required |

### Tier 2: K₄ Topology Workers

| Worker | Status | Issues |
|--------|--------|--------|
| k4-cage | ✅ | DO + KV, secrets required |
| k4-personal | ✅ | Not in CC, shares KV namespace |
| k4-hubs | ✅ | Not in CC, secrets required |
| tetra-hub | ✅ | Not in CC, read-only aggregator |
| p31-agent-hub | ✅ | Not in CC, AI binding, free-tier DOs |
| k4-agent-hub | ⚠️ | Name collision with p31-agent-hub, placeholder fallbacks |

### Tier 3: Mesh & State Workers

| Worker | Status | Issues |
|--------|--------|--------|
| mesh-living-core | ✅ | Pure DO, KV/D1 commented |
| p31-ecosystem-bridge | ✅ | CORS-safe, env vars required |
| node-one-bridge | ⚠️ | Placeholder KV ID, secret required, references missing worker |
| p31-state | ⚠️ | Two wrangler.toml files, D1 commented |
| p31-identity-sbt | ✅ | Soulbound token issuer |
| p31-convergence-hub | ✅ | Staging + prod, same KV |
| geodesic-room | ✅ | K₄ room DO |
| kenosis-mesh | ⚠️ | 7 DOs, secret required, hardcoded account_id |
| spaceship-relay | ✅ | KV binding, name mismatch |
| p31-quantum-edge | ✅ | Smart placement, Node One telemetry |
| cf-edge-lab | ✅ | AI playground, minimal |
| p31-mcp-server | ⚠️ | Not in CC, KV/routes commented, MCP protocol |
| p31-sync | ⚠️ | Secret required, no route |
| p31-passkey | ✅ | Full config |
| p31-fhir | ⚠️ | Epic FHIR, secrets required, cron shared |
| glass-box-ws | ✅ | PQC, staging envs |
| p31-google-bridge | ⚠️ | GOOGLE_CLIENT_ID = "replace-me", secret required |
| p31-forge | ⚠️ | KV commented, many secrets, cron commented |
| p31-foundry-worker | ✅ | Queue-based, optional secret |
| p31-cortex | ⚠️ | 7 DOs, AI binding, most complex worker |
| discord-alerter | ⚠️ | Minimal config (3 lines), no bindings |

### Tier 4: Game & Arcade Workers

| Worker | Status | Issues |
|--------|--------|--------|
| p31-arcade-signal | ✅ | CPU limit 10ms, name mismatch |
| p31-smallball-signal | ✅ | 5 KV + R2, DO migrated to KV |
| p31-gridiron-signal | ⚠️ | Two identical configs (p31-cards + p31-gridiron) |
| spin-matchmaking | ✅ | Cross-script DO |
| spin-logistics | ✅ | Paired with matchmaking |
| bonding-relay | ⚠️ | Duplicate with N0 version |

### Tier 5: Pages / Static Sites

| Worker | Status | Issues |
|--------|--------|--------|
| p31-vault | ✅ | Pages, prod alias needs branch |
| p31-mesh | ✅ | Static |
| p31-hearing-ops | ✅ | Dedicated Pages |
| p31ca | ✅ | Hub |
| chromatica | ❌ | All placeholder IDs |
| matriarch-culinary-node | ❌ | Placeholder KV ID |
| mvp-template | ❌ | Template, all placeholders |

### Tier 6: Ghost Workers (CC only, no repo config)

| Worker | Status | Issues |
|--------|--------|--------|
| p31-lab | ❌ | No wrangler.toml |
| will-workshop | ❌ | No wrangler.toml |
| bash-lab | ❌ | No wrangler.toml |
| willow-garden | ❌ | No wrangler.toml |
| christyn-corner | ❌ | No wrangler.toml |
| carrie-agent | ❌ | No wrangler.toml |
| p31-phenix | ❌ | No wrangler.toml |

---

## packages/ — Shared Packages

### Key Packages
- **k4-mesh-core** — Shared mesh utilities ✅
- **k4-agent-hub** — Worker with 4 hub DOs ⚠️ (name collision with p31-agent-hub)
- **quantum-edge** — Node One telemetry ✅
- **p31-foundry** — Queue-based jobs ✅
- **worker-utils** — Shared CORS/health utilities ✅
- **love-ledger** — SPOONS_KV integration ✅
- **sovereign-sdk** — Sovereign data patterns ✅
- **quantum-core** — Core quantum utilities ✅
- **node-zero** — Node Zero PWA ✅

---

## Summary Metrics

| Metric | Count |
|--------|-------|
| Total wrangler.toml files | 67 |
| CC tracked workers | 26 |
| Ghost workers | 7 |
| Untracked workers | 30+ |
| Name mismatches | 6 |
| Duplicate configs | 8 groups |
| Placeholder ID workers | 3 |
| Commented-out bindings | 2 |
| Total KV namespaces | ~30 |
| Total D1 databases | ~10 |
| Total R2 buckets | ~6 |
| Total DOs | ~25 |
| AI-bound workers | 5 |
| Cron-triggered workers | 7 |

---

## Critical Issues

1. **7 ghost workers** — No repo config, cannot audit/redeploy
2. **30+ untracked workers** — Status dashboard blind to most fleet
3. **6 name mismatches** — Health checks unreliable
4. **3 placeholder workers** — Not deployable (chromatica, matriarch-culinary-node, mvp-template)
5. **donate-api** — KV idempotency commented, Stripe webhook dedup not active
6. **p31-google-bridge** — GOOGLE_CLIENT_ID = "replace-me"
7. **p31-state** — Two configs, risk of deploying wrong version
8. **p31-bonding-relay** — Potential duplicate generations
9. **p31-gridiron-signal** — Two identical configs
10. **discord-alerter** — Minimal config, no bindings declared

---

## Recommendations

1. Add all untracked workers to status.json
2. Resolve name mismatches (align wrangler.toml names with CC)
3. Remove/archive ghost worker entries or provision configs
4. Consolidate duplicate configs
5. Provision real IDs for placeholder workers or mark as templates
6. Enable KV idempotency on donate-api
7. Set GOOGLE_CLIENT_ID for p31-google-bridge
8. Audit discord-alerter for completeness
9. Document bonding-relay duplication decision
10. Track all workers in single manifest

---

*Based on WCD-R04 inventory, connectivity-summary.md, routing-verification-summary.md, and command-center status.json*
