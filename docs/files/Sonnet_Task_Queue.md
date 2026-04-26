# Sonnet Task Queue — April 13 Evening Sprint
## Execute in parallel. All P1/P2.

### TASK 1: Fawn Guard → Buffer Integration
The standalone Fawn Guard worker (fawn-guard.trimtab-signal.workers.dev) works.
Now integrate it as a React component into the Buffer PWA (pwa/ directory).

**Steps:**
1. Create `pwa/src/components/FawnGuard.tsx`
2. Port the detection logic from the worker's inline JS to a TypeScript module
3. Add a textarea input + real-time highlighting of fawn patterns
4. Integrate into the Buffer's message compose flow
5. Run existing tests — zero regressions

**Acceptance:** `npm run test` passes. FawnGuard component renders in Buffer. Type a hedging message, see highlights.

---

### TASK 2: Genesis Block Ingest Pipeline
The chain viewer (p31ca.org/chain/view) reads blocks. Now build the ingest side.

**Steps:**
1. In `p31-telemetry` worker, add `POST /api/telemetry/ingest` endpoint
2. Accept JSON: `{ event_type, payload, source }`
3. Compute SHA-256 hash chain: `H_n = SHA256(block_n + H_{n-1})`
4. Write to D1 `blocks` table
5. Return `{ block_number, hash, timestamp }`

**Acceptance:** `curl -X POST .../api/telemetry/ingest -d '{"event_type":"TEST","payload":{"msg":"hello"},"source":"cli"}'` returns a valid block with hash.

---

### TASK 3: BONDING Multiplayer Smoke Test
The KV relay is deployed. Run an actual two-tab multiplayer test.

**Steps:**
1. Open bonding.p31ca.org in two browser tabs
2. Create room in tab A, join with code in tab B
3. Build H2O in tab A — verify formula appears in tab B
4. Send a Ping from tab B — verify it appears in tab A
5. Document any bugs found

**Acceptance:** Screenshot of both tabs showing synced state. Bug list if any.

---

### TASK 4: Status Dashboard Enhancement
Command center dashboard is live and KV-backed. Enhance it.

**Steps:**
1. Add a "last pinged" timestamp display next to each worker (from health pinger data)
2. Add color-coded date urgency (red for <48h, yellow for <7d, green for >7d)
3. Add a "refresh" button that re-fetches /api/status without page reload
4. Mobile-optimize: test on 375px width (iPhone SE)

**Acceptance:** Dashboard renders clean on mobile. Refresh button works. Dates color-coded.

---

### TASK 5: p31ca.org/ede Accessibility Audit
EDE (Empathy-Driven Editor) is deployed. Run a Lighthouse audit.

**Steps:**
1. Run Lighthouse on p31ca.org/ede (Accessibility category)
2. Fix any issues below 95 score
3. Ensure keyboard navigation works (Tab, Enter, Escape)
4. Add `aria-label` attributes to all interactive elements
5. Test with screen reader if possible

**Acceptance:** Lighthouse Accessibility score ≥ 95. Zero critical a11y violations.
