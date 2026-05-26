# CWP-077: Mesh-Wide Hardening & Validation Protocol

## SYSTEM DIRECTIVE — For P31 Triad Agents (Opus/Architect, Sonnet/Mechanic, DeepSeek/Firmware)

---

## 1. MISSION

Apply the same pre-flight validation methodology used on PHOS (the 13-surface sovereign digital sanctuary) to the **entire P31 mesh infrastructure**. Every subsystem must be hardened against: dynamic import failures, WebAuthn/TPM credential loss, unhandled promise rejections, service worker cache drift, IndexedDB quota exhaustion, WebSocket reconnection loops, and React component fracture at 0 spoons.

The bar: **a single silent failure in any subsystem cannot cascade into a permanent denial of service.**

---

## 2. THE HARDENING PHILOSOPHY (from PHOS)

### 2.1 The "Can't Brick" Rule
Every asynchronous operation must have a retry path. A rejected promise should never be stored permanently. The pattern:

```typescript
// BEFORE (brittle):
let instance = null;
let initPromise = null;

async function getService() {
  if (instance) return instance;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    instance = await createExpensiveService(); // if this throws, initPromise is rejected FOREVER
    return instance;
  })();
  return initPromise;
}

// AFTER (hardened):
async function getService() {
  if (instance) return instance;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      instance = await createExpensiveService();
      return instance;
    } catch {
      initPromise = null;  // RESET so next call retries
      instance = null;
      return null;
    }
  })();
  return initPromise;
}
```

### 2.2 The Error Boundary Rule
Every React root island must be wrapped in a class-based ErrorBoundary. Functional components cannot catch render errors. The boundary must:
- Log the error to persistent storage (localStorage/IndexedDB)
- Display a calm, branded recovery UI
- Offer exactly one path forward: reload
- NEVER show a white blank page

### 2.3 The Circuit Breaker Rule
Critical subsystems (crisis protocols, authentication, panic handlers) must live at the top of the render tree, evaluated before any feature surface. If spoons === 0, the Guardian renders — not the app shell, not the HUD, not the surfaces. Unconditionally.

### 2.4 The Cache-First Rule
Offline-first PWAs must use cache-first strategy for all static assets. Navigate requests use network-first with offline fallback to cached HTML. WASM/data payloads must be cacheable on first fetch and never block initial render.

### 2.5 The Silent Degradation Rule
Every external call (fetch, WebSocket, WebAuthn, Web Speech API, IndexedDB) must be wrapped in try/catch that returns a safe default. No error should propagate to the console as an unhandled rejection. The user should never see a red error screen.

---

## 3. MESH INVENTORY — SUBSYSTEMS REQUIRING AUDIT

### 3.1 Cloudflare Workers (edge compute)

| Worker | Hostname | Repo Path | Risk Profile |
|--------|----------|-----------|-------------|
| Command Center | `command-center.trimtab-signal.workers.dev` | `04_SOFTWARE/cloudflare-worker/command-center/` | KV dashboard, health pinger — verify KV read/write error paths |
| K₄ Cage | `k4-cage.trimtab-signal.workers.dev` | `04_SOFTWARE/k4-cage/` | Mesh KV authority — verify Durable Object/SQLite migration path |
| Agent Hub | `p31-agent-hub.trimtab-signal.workers.dev` | `04_SOFTWARE/p31-agent-hub/` | Orchestrator — verify all agent routing error paths |
| Carrie Agent | `carrie-agent.trimtab-signal.workers.dev` | `04_SOFTWARE/` | Mobile operator hub — verify 5-tab state persistence |
| Fawn Guard | `fawn-guard.trimtab-signal.workers.dev` | `04_SOFTWARE/` | Auth/API gate — verify token validation edge cases |
| Genesis Gate | `genesis-gate.trimtab-signal.workers.dev` | `04_SOFTWARE/k4-cage/` (or separate) | Hardware ingress — verify POST ingestion validation (see PHOS telemetry pattern) |
| PHOS API | `phos-api.trimtab-signal.workers.dev` | `phos/workers/phos-api/` | WebSocket hub + telemetry — already audited |
| Bonding Relay | `p31-bonding-relay.trimtab-signal.workers.dev` | `04_SOFTWARE/cloudflare-worker/` | KV polling relay (3-10s intervals) — verify polling backoff |
| Telemetry | `p31-telemetry.trimtab-signal.workers.dev` | `04_SOFTWARE/telemetry-worker/` | Data ingestion — verify contract validation |
| Stripe Webhook | `p31-stripe-webhook.trimtab-signal.workers.dev` | `04_SOFTWARE/` | Payment events — verify idempotency + signature validation |
| Signaling | `p31-signaling.trimtab-signal.workers.dev` | `04_SOFTWARE/` | WebRTC signaling (Durable Objects) — verify connection lifecycle |
| Atmosphere | `phos-atmosphere.trimtab-signal.workers.dev` | `phos/workers/` | Surface preset resolution — verify fallback preset on KV miss |
| Forge | (worker within p31-forge) | `04_SOFTWARE/p31-forge/` | Cron + webhook — verify grant cron error handling |
| API (phosphorus31.org) | `api-phosphorus31-org.trimtab-signal.workers.dev` | `04_SOFTWARE/` | Donation API — verify Stripe integration error paths |

### 3.2 Cloudflare Pages (static sites)

| Site | URL | Repo Path | Risk Profile |
|------|-----|-----------|-------------|
| p31ca.org | `https://p31ca.org` | `04_SOFTWARE/p31ca/` | Astro static hub — verify all 40+ public HTML footers have correct EIN |
| phosphorus31.org | `https://phosphorus31.org` | `phosphorus31.org/planetary-planet/` | Astro nonprofit site — verify donate page, research narrative |
| BONDING | `https://bonding.p31ca.org` | `04_SOFTWARE/bonding/` | Vite + React + R3F — verify 424 tests pass, R3F WebGL error paths |
| PHOS | `https://phos-btn.pages.dev` | `phos/` | Already hardened (this is the reference implementation) |
| Hearing Ops | `https://ops.p31ca.org` | `04_SOFTWARE/p31-hearing-ops/` | Vite PWA — verify offline contempt prep loads without network |
| Mesh | `https://p31-mesh.pages.dev` | `04_SOFTWARE/cloudflare-pages/p31-mesh/` | WebRTC P2P vagal sync — verify signaling + ICE fallback |
| Vault | `https://p31-vault.pages.dev` | `04_SOFTWARE/cloudflare-pages/p31-vault/` | Component gallery — verify all interactive demos |

### 3.3 Shared Packages

| Package | Path | Risk Profile |
|---------|------|-------------|
| `k4-mesh-core` | `04_SOFTWARE/packages/k4-mesh-core/` | Core mesh library — verify all worker imports |
| `love-ledger` | `04_SOFTWARE/packages/love-ledger/` | Value accounting — verify transaction durability |
| `node-zero` | `04_SOFTWARE/packages/node-zero/` | Hardware interface — verify telemetry contract |
| `sovereign-sdk` | `04_SOFTWARE/packages/sovereign-sdk/` | SDK — verify all public API error paths |
| `quantum-core` | `04_SOFTWARE/packages/quantum-core/` | Core utilities — verify no circular dependencies |

### 3.4 Firmware (ESP32-S3)

| Target | Path | Risk Profile |
|--------|------|-------------|
| Node Zero (Waveshare) | `05_FIRMWARE/node-zero/` | ESP-IDF — verify WiFi reconnect, NVS corruption, LoRa RX buffer overflow, HTTPS timeout, OTA fallback |
| BONDING hardware | `05_FIRMWARE/boards/` | Manufacturing — verify BOM, assembly instructions |

---

## 4. VALIDATION CHECKLIST (apply to EVERY subsystem)

### 4.1 Async Initialization (The `initPromise` Pattern)
- [ ] Does a single failed dynamic import permanently break the service?
- [ ] Is there a retry mechanism when lazy initialization fails?
- [ ] Are all `db.exec()` / `db.query()` / KV `.get()` / `.put()` calls wrapped in try/catch?
- [ ] Do fallback values return a valid type (never `undefined` when `null` is expected)?

### 4.2 WebAuthn / Credential Management
- [ ] Does `navigator.credentials.get()` pass `allowCredentials` with the stored credential ID?
- [ ] Is the credential ID properly base64url-decoded before passing to `allowCredentials`?
- [ ] Are all WebAuthn operations wrapped in try/catch (user cancellation throws `NotAllowedError`)?
- [ ] Is `window.PublicKeyCredential` existence checked before any WebAuthn call?

### 4.3 Service Worker / Offline
- [ ] Are critical static assets (HTML shell, manifest.json, favicon) pre-cached in `install` event?
- [ ] Does `activate` event cleanly delete stale caches by name filter?
- [ ] Does navigate handler fall back to cached HTML on network failure?
- [ ] Is `skipWaiting()` called to activate new SW immediately?
- [ ] Are WASM/data payloads cacheable on first fetch (cache-first strategy)?
- [ ] Is there a cache versioning strategy (bump `CACHE_NAME` on breaking changes)?

### 4.4 React Error Boundaries
- [ ] Is every root `client:only` island wrapped in a class-based `ErrorBoundary`?
- [ ] Does the boundary log the error to persistent storage?
- [ ] Does the boundary display a calm recovery UI (not a white page)?
- [ ] Does the recovery UI offer a clear path forward (reload button)?

### 4.5 WebSocket / Real-Time
- [ ] Does reconnection use exponential backoff (1s → 2s → 4s → ... → 30s max)?
- [ ] Is there a circuit breaker to stop reconnection after N failed attempts?
- [ ] Are malformed messages caught in `onmessage` (JSON.parse wrapped in try/catch)?
- [ ] Does `disconnect()` properly null the `onclose` handler before calling `ws.close()`?

### 4.6 localStorage / IndexedDB
- [ ] Is every `getItem`/`setItem`/`removeItem` wrapped in try/catch?
- [ ] Is there a ring buffer pattern (max N entries, splice oldest) to prevent unbounded growth?
- [ ] Is the storage key namespaced (`phos_*`, `p31_*`) to avoid collisions?
- [ ] Is `typeof window === 'undefined'` checked before any storage access (SSR safety)?

### 4.7 DOM Resilience
- [ ] Can the UI handle rapid-fire button presses (debounce or disable during processing)?
- [ ] Are `setInterval`/`setTimeout` properly cleared in `useEffect` cleanup?
- [ ] Is `AbortController` used for fetch requests, with cleanup in effect return?
- [ ] Are `mounted` flags used before `setState` in async callbacks?

### 4.8 Bundle / Performance
- [ ] Is the hot path (initial render) under 100 KB gzipped?
- [ ] Are large payloads (WASM, data files) lazy-chunked via dynamic import?
- [ ] Are there any unnecessary dependencies in the bundle (check `import` statements)?

### 4.9 Firmware (ESP-IDC-specific)
- [ ] Does WiFi reconnect on disconnect (event handler registered)?
- [ ] Is NVS read/write wrapped in error handling with partition repair?
- [ ] Is there a watchdog timer in case of task starvation?
- [ ] Are heap guards in place for PSRAM/spiram allocation?
- [ ] Is HTTPS certificate bundle attached (esp_crt_bundle_attach)?
- [ ] Are all FreeRTOS task stacks sized appropriately (not over/under)?

---

## 5. KNOWN VULNERABILITY PATTERNS (from PHOS audit)

These are the specific bugs found in PHOS that likely exist elsewhere in the mesh:

### Pattern A: Stale Rejection Lock
```typescript
// BAD: initPromise stores a rejected promise permanently
initPromise = expensiveInit(); // if this throws, initPromise is toast forever

// GOOD: reset on failure
initPromise = (async () => { try { return await expensiveInit(); } catch { initPromise = null; return null; } })();
```

### Pattern B: Missing allowCredentials
```typescript
// BAD: browser shows generic credential picker
navigator.credentials.get({ publicKey: { challenge, rpId, userVerification: 'required' } });

// GOOD: restrict to stored credential
navigator.credentials.get({ publicKey: { challenge, rpId, userVerification: 'required', allowCredentials: [{ id: decodeCredential(storedId), type: 'public-key' }] } });
```

### Pattern C: State Update on Unmounted Component
```typescript
// BAD: promise resolves after unmount
useEffect(() => {
  fetch(...).then(result => setState(result)); // React warning if unmounted
}, []);

// GOOD: mounted guard
useEffect(() => {
  let mounted = true;
  fetch(...).then(result => { if (mounted) setState(result); });
  return () => { mounted = false; };
}, []);
```

### Pattern D: Uncaught WebAuthn Cancellation
User pressing "Cancel" in the biometric/PIN dialog throws `NotAllowedError`. Every `navigator.credentials.create()` and `navigator.credentials.get()` MUST be in try/catch.

### Pattern E: Hardcoded Cache Names Without Version Bump
Service worker cache names like `phos-cache-v1` must be bumped on breaking asset changes. Old caches must be cleaned in `activate` by filtering out names that don't match current version.

---

## 6. TESTING REQUIREMENTS

### 6.1 For Every Worker
```bash
# 1. Deploy with current config
npx wrangler deploy --dry-run  # validate bindings

# 2. Test all endpoints with valid and invalid payloads
curl -X POST <endpoint> -d '{"valid": "payload"}'  # expect 200
curl -X POST <endpoint> -d '{invalid}'              # expect 400
curl -X GET <endpoint> -H "Authorization: Bearer bad_token"  # expect 401

# 3. Verify KV/D1/DO error paths (simulate missing keys)
```

### 6.2 For Every Frontend
```bash
# 1. Build check
npm run build           # must exit 0
npx tsc --noEmit        # zero errors (if TypeScript)

# 2. Test check
npm test                # all tests pass (if test suite exists)

# 3. Bundle analysis
# Verify hot path < 100 KB gzipped
# Verify WASM/data > 1 MB are dynamically imported

# 4. Offline verification
# Build, deploy, load once (online), switch to Airplane Mode, reload
# All surfaces must render without network
```

### 6.3 For Firmware
```bash
# 1. Build check
idf.py build            # must exit 0

# 2. Lint
idf.py lint             # if configured

# 3. Flash + monitor
idf.py -p COM<port> flash monitor  # verify boot log, WiFi connect, HTTPS POST
```

---

## 7. DEPLOYMENT SEQUENCE

```
1. Audit — Run validation checklist against every subsystem
2. Patch — Fix all findings (critical first, then medium, then low)
3. Build — Verify clean build for each patched subsystem
4. Deploy — Release to staging/preview URL
5. Verify — Run smoke tests on live endpoint
6. Promote — Push to production
7. Document — Log all patches in subsystem OWNERS.md or README
```

### Worker-specific deploy commands:
```powershell
# Command center
cd 04_SOFTWARE/cloudflare-worker/command-center
npx wrangler deploy

# K₄ Cage
cd 04_SOFTWARE/k4-cage
bash deploy.sh

# Pages sites
cd 04_SOFTWARE/p31ca
npm run build && npx wrangler pages deploy dist/

# PHOS
cd phos
npm run build && npx wrangler pages deploy dist/ --project-name phos

# PHOS API
cd phos/workers/phos-api
npx wrangler deploy index.ts --name phos-api
```

---

## 8. VERIFIED FACTS (must not hallucinate)

| Fact | Value | Source |
|------|-------|--------|
| EIN (P31 Labs) | 42-1888158 | CP 575E (April 13, 2026) |
| EIN (HCB fiscal sponsor, STALE) | 42-1888158 | Being migrated — do NOT use in new content |
| BONDING test count | 424 tests / 32 suites | Verified April 14 |
| CogPass version | v4.1 | Canonical |
| Relay architecture | Cloudflare KV polling (3-10s intervals) | Not Durable Objects, not WebSocket |
| SE050 PQC support | DOES NOT exist (50KB flash insufficient) | Verified |
| SX1262 link budget | ~170 dB max | Not 178 dB |
| FDA classification | None claimed. Pre-market only. 513(g) RFI before market entry. | Verified April 14 |
| GA charitable form | C-100 ($35) | Not C-200 |
| K₄ planarity | K₄ IS planar — reframed around volumetric enclosure (β₂=1) | Corrected |
| Children initials | S.J. (b. 3/10/2016), W.J. (b. 8/8/2019) | Full names NEVER in filings |

---

## 9. ARCHITECTURAL DECISIONS (must preserve)

| Decision | Rationale |
|----------|-----------|
| No telemetry/analytics SDKs | Zero phone-home. Sovereignty requirement. |
| No third-party CDN fonts | Inter self-hosted. Must work offline. |
| No WebSocket for hardware relay | TLS WebSockets on ESP32 are fragile. HTTPS POST → DO broadcast is battle-tested. |
| Guardian at spoons===0 is pure CSS/static | Zero cognitive load. No animations at 0 spoons. |
| PGLite WASM lazy-chunked | 10 MB never blocks initial render (80 KB hot path). |
| Astro `client:only` islands with `transition:persist` | Single React tree avoids context gap. Survives view transitions. |
| All storage try/caught with fallback | localStorage quota exceeded, IndexedDB unavailable, private browsing — all degrade gracefully. |

---

## 10. DELIVERABLES

For each subsystem in Section 3, produce:

1. **Audit Report** — Checklist results per Section 4, with pass/fail for each item
2. **Patch List** — Every finding with file path, line number, vulnerability class, and fix
3. **Smoke Test Results** — Build output, test output, curl verification
4. **Deployment Evidence** — wrangler deploy output showing version ID

---

*This CWP inherits all patterns validated in PHOS. The bar: every subsystem must survive dynamic import failure, credential loss, network drop, and rapid-fire user input without cascading into permanent denial of service.*

*Ca₉(PO₄)₆*
