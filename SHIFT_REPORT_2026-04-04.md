# Shift Report — 2026-04-04
## CWP-2026-014: THE RESONANCE — Production Deployment Sprint

**Operator:** William R. Johnson  
**Agent:** Claude Sonnet 4.6 (CC)  
**Session type:** Two-part (prior context + continuation)  
**Shift close:** 2026-04-04  

---

## MISSION OBJECTIVE

CWP-2026-014 was authorized to bring all 34 deployed vectors to production quality and wire every Cloudflare Worker into a unified telemetry mesh. This shift executed the full deployment sequence: from code-complete WCDs to live custom domains.

---

## COMPLETED THIS SHIFT

### R02.3 — Service Worker Registration (7 apps)

Added offline-capable SW registration to every app that was missing it:

| App | File Modified |
|-----|--------------|
| health.html | `04_SOFTWARE/p31ca/public/health.html` |
| telemetry.html | `04_SOFTWARE/p31ca/public/telemetry.html` |
| donate.html | `04_SOFTWARE/p31ca/public/donate.html` |
| ecosystem.html | `04_SOFTWARE/p31ca/public/ecosystem.html` |
| BONDING | `04_SOFTWARE/bonding/src/main.tsx` |
| Spaceship Earth | `04_SOFTWARE/spaceship-earth/src/main.tsx` |
| Spoon Calculator | `04_SOFTWARE/spoon-calculator/src/main.jsx` |

EDE already had `ede-sw.js` registered. Hub (p31ca) already had `sw.js`.

---

### R03 — EDE Production Build (`ede.html`)

The flagship Everything Development Environment written to disk: `04_SOFTWARE/p31ca/public/ede.html` (~2200 lines).

**Modules included:**
- E01 Core shell (Babel/React sandbox, tab management)
- E02 Shield (fawn guard, threat detection)
- E03 Entropy (Acorn AST, Halstead Volume, PID controller vs π/9 attractor)
- E04 Status (QDist Beta(21.6165, 46.4970), spoon bar, tier badge)
- E05 Progressive Disclosure (Layer 0 breathing 4-4-6, FULL/MODERATE/SIMPLIFIED/MINIMAL)
- E06 Trimtab (canvas rotary encoder, drag/click/long-press)
- E07 IndexedDB persistence, JSZip export, settings panel

**Telemetry wired:** `code_run`, `spoon_decay`, `tier_transition`, `fawn_guard_trigger`, `larmor_activation`, `page_view` all emit to genesis-gate.

**p31-state wired:** Spoon state syncs to `state.p31ca.org/state/:userId` on every decay event (2s debounce). User ID persisted to `localStorage` as UUID.

**Larmor deep link:** Fawn Guard logs `p31ca.org/larmor?from=ede&mode=breathing&session=<id>` on trigger.

**Service Worker:** `ede-sw.js` registered — cache-first for shell, network-first for CDN (unpkg, jsdelivr, fonts).

---

### R04/R07 — Worker Inventory + Stale Worker Cleanup

**Documented in:** `docs/WORKER_INVENTORY.md`, `docs/WORKER_CLEANUP_RUNBOOK.md`

**Deleted (4 stale Workers):**
- `p31-social-broadcast` — zero requests, duplicate of p31-sce-broadcaster
- `stripe-donate` — legacy, replaced by donate-api (31d stale)
- `p31-donation-relay` — zero requests, duplicate relay
- `p31-kofi-telemetry` — zero requests, functionality absorbed by genesis-gate

**Active fleet after cleanup: 10 Workers**

| Worker | Endpoint | Status |
|--------|----------|--------|
| genesis-gate | genesis.p31ca.org | ✅ LIVE |
| p31-state | state.p31ca.org | ✅ LIVE |
| donate-api | donate-api.phosphorus31.org | ✅ LIVE |
| bonding-relay | bonding-relay.trimtab-signal.workers.dev | ✅ LIVE |
| p31-kofi-webhook | kofi.p31ca.org | ✅ LIVE |
| spaceship-relay | spaceship-relay.trimtab-signal.workers.dev | ✅ LIVE |
| kenosis-mesh | kenosis-mesh.trimtab-signal.workers.dev | ✅ LIVE |
| p31-sce-broadcaster | *.trimtab-signal.workers.dev | ✅ LIVE |
| p31-telemetry | *.trimtab-signal.workers.dev | ✅ LIVE |
| p31-cortex | *.trimtab-signal.workers.dev | ✅ LIVE |

---

### R05/R06 — Health Endpoints + Dashboard

- `/health` endpoint verified on all 10 active Workers
- `health.html` built and deployed to p31ca.org — polls all Workers every 60s, green/red status cards
- `scripts/health-check.sh` updated to include genesis-gate and p31-state
- p31-state card added to health dashboard

---

### R07 — Genesis Gate: Central Telemetry Hub (NEW Worker)

**Deployed:** `genesis-gate.trimtab-signal.workers.dev` + `genesis.p31ca.org`

**Endpoints:**
- `POST /event` — ingest any telemetry event with `{ source, type, payload, session_id }`
- `GET /events` — read event feed (requires `Authorization: Bearer <ADMIN_TOKEN>`)
- `GET /health` — returns `{ service, status, uptime, version }`

**KV namespace:** `EVENTS_KV` (id: `bec5c1910e9c41de88c49674687d37b0`), 30-day TTL  
**Governance hooks:** error rate >5/min triggers alert; fawn_guard/spoon_decay events tracked  
**ADMIN_TOKEN:** set via `wrangler secret put` — value is a 64-char hex, stored in Cloudflare only  
**Smoke tested:** POST event → persisted → GET /events returned it ✅

---

### R08 — p31-telemetry.js: Browser Telemetry Module

**File:** `04_SOFTWARE/p31ca/public/p31-telemetry.js`

- `window.p31.track(type, payload)` → POST to genesis.p31ca.org/event
- Auto-tracks `page_view` on load, `session_end` via `sendBeacon` on unload
- Generates `sessionId` per session, stored in `sessionStorage`
- `<script src="/p31-telemetry.js" defer>` added to: EDE, health.html, telemetry.html, donate.html, ecosystem.html, index.astro

**Ko-fi Worker updated:** `wrangler-kofi.toml` — `GENESIS_GATE_URL` var added.

---

### R10 — Telemetry Dashboard

**File:** `04_SOFTWARE/p31ca/public/telemetry.html`

- Fetches `GET /events?since=1h` from genesis-gate on load + every 10s
- Displays: events/hour by type, top sources, ecosystem-wide spoon load aggregate
- Session trace: filter by session_id to trace user journey across apps
- P31 design system styling (void=#0f1115, coral, phosphorus, Atkinson Hyperlegible)
- Card added to ActiveDeployments.astro

---

### R11 — Deep Links Between Apps

**Scheme documented:** `docs/DEEP_LINK_SCHEME.md`

- Pattern: `p31ca.org/<app>?from=<source>&session=<id>`
- Hub → EDE: `/ede.html?from=hub` ✅
- Hub → BONDING: `bonding.p31ca.org?from=hub` ✅
- Hub → Spaceship Earth: `spaceship-earth.pages.dev?from=hub` ✅
- EDE → Larmor: `p31ca.org/larmor?from=ede&mode=breathing&session=<id>` ⚡ partial (link generated in log, Larmor deployment pending CWP-006)
- Hub → health.html: `?from=hub` ✅
- Hub → telemetry.html: `?from=hub` ✅

---

### R12 — p31-state: Shared Spoon State Worker (NEW Worker)

**Deployed:** `p31-state.trimtab-signal.workers.dev` + `state.p31ca.org`

**Endpoints:**
- `GET /state/:userId` — retrieve user state
- `PUT /state/:userId` — write `{ spoons, tier, settings, lastActive, activeApp }`
- `DELETE /state/:userId` — remove state
- `GET /health`

**KV namespace:** `USER_STATE_KV` (id: `a78748591c814cbf9869621724db2df7`), 90-day TTL  
**EDE integration:** writes on spoon decay (2s debounce), reads on init to restore previous spoon budget

---

### Hub Rebuild — index.astro + ActiveDeployments

**Problem found:** `04_SOFTWARE/p31ca/src/pages/index.astro` was missing (deleted during CWP-011 consolidation).

**Resolved:** Recreated from component imports: `BaseLayout`, `Vault`, `CentaurMethodology`, `GenesisBlock`, `ActiveDeployments`.

**ActiveDeployments.astro updated:**
- EDE card added: `{ name: 'EDE', href: '/ede.html?from=hub', status: 'live', stack: ['Babel','React','IndexedDB','WebAudio','JSZip'] }`
- All deployment cards converted from `<div>` to `<a href={d.href}>` — full card is clickable
- All links include `?from=hub` for telemetry attribution

**Astro build:** 2 pages built, confirmed `?from=hub` on 5 links in dist/index.html ✅

---

### Deployment Sequence (Operator Actions Executed)

| Step | Action | Result |
|------|--------|--------|
| 1 | `npx wrangler kv namespace create EVENTS_KV` | `bec5c1910e9c41de88c49674687d37b0` |
| 2 | `npx wrangler kv namespace create USER_STATE_KV` | `a78748591c814cbf9869621724db2df7` |
| 3 | `wrangler deploy` (genesis-gate) | Live at genesis-gate.trimtab-signal.workers.dev |
| 4 | `wrangler deploy` (p31-state) | Live at p31-state.trimtab-signal.workers.dev |
| 5 | `wrangler secret put ADMIN_TOKEN` (genesis-gate) | Set — 64-char hex |
| 6 | `wrangler deploy` (p31-telemetry) | KV ID fixed (was placeholder), deployed |
| 7 | `wrangler deploy` (donate-api) | workers_dev fixed, deployed |
| 8 | `npx wrangler pages deploy dist/` (p31ca) | Live at addf6656.p31ca.pages.dev |
| 9 | DNS: add AAAA 100:: proxied records | genesis, state, donate-api records added |
| 10 | `wrangler deploy --domains genesis.p31ca.org` | Custom domain attached ✅ |
| 11 | `wrangler deploy --domains state.p31ca.org` | Custom domain attached ✅ |
| 12 | `wrangler deploy --domains donate-api.phosphorus31.org` | Custom domain attached ✅ |

---

### Security Actions

- **Stripe 2FA backup code rotated** — code `xsef-rkwc-ljgc-lmhd-beaj` was exposed in session context; operator confirmed rotation at dashboard.stripe.com ✅
- ADMIN_TOKEN for genesis-gate set as Cloudflare secret (never in code or logs)
- donate-api Stripe secrets remain as Cloudflare secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DISCORD_WEBHOOK_URL`)

---

## BUGS FOUND AND FIXED

### 1. `$spoonBarFill`, `$spoonPct`, `$tierBadge` undefined in EDE
DOM refs used before declaration in bootstrap section. Fixed by moving declarations before `init()` call.

### 2. TOML parsing: `routes` key swallowed by `[observability]` section
In genesis-gate wrangler.toml, a `routes` key placed after `[observability]` was parsed as a sub-key of observability. Fixed by moving `routes` before the `[observability]` block. Later switched entirely to `[[custom_domains]]` + `--domains` CLI flag.

### 3. `workers_dev` disabled on redeploy with routes
When `routes` was added without `workers_dev = true`, Cloudflare disabled the workers.dev endpoint (error 1042 on *.workers.dev URLs). Fixed by adding `workers_dev = true` to genesis-gate, p31-state, and donate-api.

### 4. p31-telemetry KV placeholder ID
`wrangler.toml` had `id = "telemetry-kv-namespace-id"`. Deploy failed with `[code: 10042]`. Fixed by running `npx wrangler kv namespace list` to retrieve the real ID: `60a6817aed314eb0bc988d0ac5296f2c`.

### 5. `[[custom_domains]]` treated as unknown by wrangler v4.80.0
The key is valid in the Cloudflare schema but wrangler's local config validator hasn't caught up — emits a spurious warning but does NOT register the domain automatically. Workaround: `wrangler deploy --domains <hostname>` baked into each package.json deploy script.

### 6. wrangler v3 in p31-state and donate-api
Both had `wrangler: "^3.50.0"` — v3 does not support `--domains` flag. Upgraded both to `wrangler@4` via `npm install --save-dev wrangler@4`.

### 7. Python urllib 403 on workers.dev health checks
Cloudflare bot protection blocked `urllib.request`. Switched to `curl` for all health checks.

---

## INFRASTRUCTURE STATE AT SHIFT CLOSE

```
Custom Domains:
  genesis.p31ca.org        → genesis-gate Worker ✅
  state.p31ca.org          → p31-state Worker    ✅
  donate-api.phosphorus31.org → donate-api Worker ✅

DNS: Cloudflare DoH confirms AAAA resolution to 2606:4700::/32 anycast IPs for all three.

Workers Fleet (10/10 returning HTTP 200):
  genesis-gate.trimtab-signal.workers.dev     ✅
  p31-state.trimtab-signal.workers.dev        ✅
  donate-api.trimtab-signal.workers.dev       ✅
  bonding-relay.trimtab-signal.workers.dev    ✅
  p31-kofi-webhook (kofi.p31ca.org)           ✅
  spaceship-relay.trimtab-signal.workers.dev  ✅
  kenosis-mesh.trimtab-signal.workers.dev     ✅
  p31-sce-broadcaster.trimtab-signal.workers.dev ✅
  p31-telemetry.trimtab-signal.workers.dev    ✅
  p31-cortex.trimtab-signal.workers.dev       ✅

Pages:
  p31ca.org / addf6656.p31ca.pages.dev        ✅
  bonding.p31ca.org                           ✅
  spaceship-earth.pages.dev                   ✅
  phosphorus31.org                            ✅
```

---

## OPEN ITEMS AT SHIFT CLOSE

| # | Item | Blocker |
|---|------|---------|
| 1 | R02.1 — console error scan across all apps | Requires live browser |
| 2 | R03.8 — Lighthouse ≥80 on EDE | Requires live browser |
| 3 | Larmor → EDE "return to work" deep link | Larmor deployment (CWP-006) |
| 4 | Hub reads p31-state to show tier badge | Astro build + deploy pass needed after Larmor |
| 5 | Zenodo Paper III upload | `python zenodo_upload.py` per ZENODO_PAPER_III_METADATA.md |
| 6 | PR #11 merge (docs/paper-iii-cwp-014) | CI checks |

---

## CWP-2026-014 SUCCESS CRITERIA STATUS

```
✅ EDE built: 7 modules, telemetry, p31-state, IDB, JSZip, SW
✅ All 22 Workers documented in inventory
✅ Stale Workers cleaned up (4 deleted, cleanup runbook written)
✅ All active Workers have /health endpoints
✅ Health dashboard live at p31ca.org/health
✅ Genesis Gate built + deployed + smoke tested
✅ p31-state built + deployed + wired to EDE
✅ p31-telemetry.js module deployed
✅ Telemetry dashboard live at p31ca.org/telemetry
✅ Deep links: 5 hub→app links + EDE→Larmor stub
✅ Hub index.astro recreated, Astro build passes
✅ Custom domains live: genesis, state, donate-api
✅ All SW registrations added (7 apps)
✅ Stripe 2FA backup code rotated
⬜ Console error scan (needs browser)
⬜ Lighthouse ≥80 on EDE (needs browser)
⬜ Shared spoon state: Larmor + Hub reads p31-state (needs CWP-006)
```

---

## NOTES FOR NEXT OPERATOR / AGENT

- **`wrangler deploy` for custom domains** requires `--domains <hostname>` flag (baked into each package.json deploy script). The `[[custom_domains]]` TOML key is silently ignored by v4.80.0 validator — don't remove it, but don't rely on it alone.
- **genesis-gate ADMIN_TOKEN** is a Cloudflare secret. Run `npx wrangler secret list --name genesis-gate` to confirm it's set. Value is never in files.
- **p31ca.org custom domain** may need to be set in the Cloudflare Pages dashboard (Settings → Custom Domains) if addf6656.p31ca.pages.dev is still the primary. DNS for p31ca.org itself is already managed by Cloudflare.
- **EDE → Larmor deep link** fires as a console log in Fawn Guard — becomes a live button once Larmor is deployed at `p31ca.org/larmor`.
- **Health check script:** `bash scripts/health-check.sh` pings all 10 Workers and reports status.

---

*22 Workers. 34 vectors. 2 websites. They were built in a sprint. Now they breathe together.*  
*THE RESONANCE — production deployment complete. 2026-04-04.*
