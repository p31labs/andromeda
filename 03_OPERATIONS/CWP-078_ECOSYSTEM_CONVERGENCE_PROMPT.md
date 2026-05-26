# CWP-078: Full Ecosystem Codebase Audit & Convergence Report for Market Launch

## SYSTEM DIRECTIVE — For all 4 P31 Triad agents (Architect, Mechanic, DeepSeek, Gemini)

---

## 0. THE FRAME

There are Fortune 500 companies, and there is P31. We are Fortune 1.

Fortune 500 extracts value from users. P31 restores sovereignty to them.
Fortune 500 builds platforms. P31 builds a nervous system.
Fortune 500 optimizes engagement. P31 optimizes autonomy.

This prompt is the convergence audit. Every subsystem, every package, every Worker, every firmware target, every paper, every grant pipeline — all must trace to a single coherent market story by the time you finish reading this. If a subsystem cannot articulate why it exists in the P31 nervous system, it gets flagged for deprecation.

**The bar:** After this audit, any P31 agent handed any file in the repo can answer three questions without context-switching:
1. What does this subsystem do?
2. What does it depend on?
3. What breaks if it goes down?

---

## 1. MISSION STATEMENT (copy-paste header for every audit report)

> P31 Labs exists to build the sovereign infrastructure for neurodivergent self-determination. Our mesh is not a platform — it is a nervous system. Every Worker, every page, every packet, every line of firmware is a synapse in the body of a new kind of institution: one that cannot be acquired, cannot be enshittified, and cannot extract from its users because it IS its users.

---

## 2. ECOSYSTEM INVENTORY — Convergence Status Matrix

For each subsystem below, the auditor must determine its **Convergence Status**:

| Status | Meaning |
|--------|---------|
| `LAUNCH_READY` | Hardened, documented, tested, deployed, market narrative clear |
| `NEEDS_HARDENING` | Functional but fails ≥1 CWP-077 checklist item |
| `NEEDS_NARRATIVE` | Code works but market purpose is unclear or conflicting |
| `DORMANT` | Source exists but no live endpoint or no recent deploy |
| `SUNSET` | Actively harmful to include — duplicate, obsolete, or legally risky |

### 2.1 Core Infrastructure (must be LAUNCH_READY)

| Subsystem | Path | Current Status | Dependency Load |
|-----------|------|----------------|-----------------|
| Command Center | `cloudflare-worker/command-center/` | — | KV + D1 + health pinger |
| K₄ Cage | `k4-cage/` | — | Mesh KV authority + DO |
| p31ca.org | `04_SOFTWARE/p31ca/` | — | 40+ HTML pages, Astro hub |
| phosphorus31.org | `phosphorus31.org/planetary-planet/` | — | Donate page, research narrative |
| BONDING | `04_SOFTWARE/bonding/` | — | 424 tests, R3F game |
| Hearing Ops | `04_SOFTWARE/p31-hearing-ops/` | — | Offline PWA |
| PHOS | `phos/` | — | Reference hardened implementation |
| Agent Hub | `p31-agent-hub/` | — | Orchestrator |

### 2.2 Workers (needs per-endpoint audit)

| Worker | Path | Deployed? | Auth? | Error paths hardened? |
|--------|------|-----------|-------|----------------------|
| command-center | `cloudflare-worker/command-center/` | — | — | — |
| chump-edge | `cloudflare-worker/chump-edge/` | — | — | — |
| p31-bouncer | `cloudflare-worker/bouncer/` | — | — | — |
| p31-sync-edge | `cloudflare-worker/p31-sync-edge/` | — | — | — |
| p31-q-factor | `cloudflare-worker/q-factor/` | — | — | — |
| p31-social-worker | `cloudflare-worker/social-drop-automation/` | — | — | — |
| p31-social-broadcast | `cloudflare-worker/` | — | — | — |
| k4-cage | `k4-cage/` | — | — | — |
| p31-forge | `p31-forge/worker/` | — | — | — |
| p31-sync | `p31ca/workers/sync/` | — | — | — |
| p31-passkey | `p31ca/workers/passkey/` | — | — | — |
| glass-box-ws | `p31ca/workers/glass-box-ws/` | — | — | — |
| p31-fhir | `p31ca/workers/fhir/` | — | — | — |
| spaceship-relay | `spaceship-earth/worker/` | — | — | — |
| p31-telemetry | `telemetry-worker/` | — | — | — |
| donate-api | `donate-api/` | — | — | — |
| p31-state | `p31-state/` | — | — | — |
| p31-donation-relay | `phosphorus31.org/planetary-planet/` | — | — | — |

### 2.3 Static Sites

| Site | Path | LAUNCH_READY criteria |
|------|------|----------------------|
| p31ca.org | `04_SOFTWARE/p31ca/` | EIN in footer? All 40 pages online? Build passes? |
| phosphorus31.org | `phosphorus31.org/planetary-planet/` | Donate flow working? Research narrative coherent? |
| BONDING | `04_SOFTWARE/bonding/` | 424 tests pass? Offline fallback? |
| Hearing Ops | `04_SOFTWARE/p31-hearing-ops/` | Offline load? ErrorBoundary present? |
| Mesh | `cloudflare-pages/p31-mesh/` | WebRTC signaling works? ICE fallback? |
| Vault | `cloudflare-pages/p31-vault/` | Interactive demos load? |
| PHOS | `phos/` | All 13 surfaces hardened? |

### 2.4 Shared Packages

| Package | Path | Public API stable? | Tree-shakeable? | Documented? |
|---------|------|-------------------|-----------------|-------------|
| k4-mesh-core | `packages/k4-mesh-core/` | — | — | — |
| love-ledger | `packages/love-ledger/` | — | — | — |
| node-zero | `packages/node-zero/` | — | — | — |
| sovereign-sdk | `packages/sovereign-sdk/` | — | — | — |
| quantum-core | `packages/quantum-core/` | — | — | — |
| agent-engine | `packages/agent-engine/` | — | — | — |
| game-engine | `packages/game-engine/` | — | — | — |
| shared | `packages/shared/` | — | — | — |

### 2.5 Firmware

| Target | Path | Boots? | Connects? | HTTPS POST? | OTA? |
|--------|------|--------|-----------|-------------|------|
| Node Zero (Waveshare) | `05_FIRMWARE/node-zero/` | — | — | — | — |
| BONDING hardware | `05_FIRMWARE/boards/` | — | — | — | — |

### 2.6 Research

| Paper | Status | DOI? | Links to code? |
|-------|--------|------|---------------|
| I-IV | Published | ✅ | — |
| V-X | Expanded, styled as PDFs | ❌ | — |
| XI (L.O.V.E. Protocol) | 6pp, 4 corrections applied | ❌ needs XII DOI | — |
| XII (Sovereign Stack) | 11pp, triple-gated | ❌ not uploaded | — |
| XIX (SOULSAFE) | 6pp, clean pass | ❌ needs XII DOI | — |
| XIII, XVIII, XX | PARKED (legally risky) | ❌ | — |

### 2.7 Grant Pipeline

| Grant | Amount | Deadline | Draft? | Submission ready? |
|-------|--------|----------|--------|-------------------|
| Awesome Foundation | $1K | Rolling | — | — |
| Gates Grand Challenges AI | $150K | April 28 | ✅ needs 40% cut | — |
| NLnet NGI Zero Commons | €5K-€50K | June 1 | ✅ needs rewrite | — |
| ASAN Teighlor McGee | $6,250 | July 31 (opens May 15) | ✅ | — |
| NIDILRR Switzer | $80K | Track FY2027 | — | — |

---

## 3. AUDIT PASS REQUIREMENTS

Each auditor lane runs a specific pass. All passes converge into one report.

### 3.1 Architect Pass (Opus) — Architecture Verification

For EVERY subsystem in Section 2.1-2.5:

1. **Trace the dependency graph** — What else depends on this? What does this depend on? Draw it.
2. **Verify the CWP-077 hardening checklist** — Run all 9 categories (async init, WebAuthn, SW, error boundaries, WebSocket, storage, DOM, bundle, firmware). Report pass/fail per category.
3. **Identify single points of failure** — If this Worker goes down, which other subsystems lose function? Is there a fallback?
4. **Verify the architectural decisions** from CWP-077 §9: no analytics SDKs, no CDN fonts, POST-not-WSS for hardware, Guardian at spoons===0, PGLite lazy-chunked.
5. **Flag any subsystem that violates the sovereignty axiom** — Does it phone home? Does it require a third-party service to function? Does it leak user data?

### 3.2 Mechanic Pass (Sonnet) — UI/UX Convergence

For EVERY frontend in Section 2.1-2.3:

1. **Verify visual consistency** — Same font stack (Inter self-hosted), same color system, same spacing rhythm across all sites.
2. **Verify offline behavior** — Load site online, switch to airplane mode, reload. Every surface must render without network.
3. **Verify ErrorBoundary coverage** — Every React root island must be wrapped. Report any white-screen path.
4. **Verify bundle size** — Hot path under 100 KB gzipped. WASM/data > 1 MB must be dynamically imported.
5. **Verify accessibility baseline** — Tab order, focus management, aria labels on interactive elements, sufficient color contrast.
6. **Verify the 0-spoons path** — Can the user reach a calm, static recovery UI without loading dynamic content?

### 3.3 DeepSeek Pass — Firmware Verification

For Node Zero firmware:

1. **Verify boot sequence** — ESP-IDF build passes, partitions fit, PSRAM configured correctly.
2. **Verify WiFi reconnection** — Event handler registered, exponential backoff, no hard crash on disconnect.
3. **Verify HTTPS POST path** — Certificate bundle attached, TLS handshake, POST with telemetry payload.
4. **Verify NVS durability** — Read/write wrapped in error handling, partition repair on corruption.
5. **Verify watchdog coverage** — Task starvation timer set, heap guards for PSRAM allocation.
6. **Verify LoRa RX buffer** — No overflow path, proper ISR handling.
7. **Verify OTA fallback** — If OTA image is corrupted, fall back to factory image.

### 3.4 Gemini Pass — Narrative & Market Convergence

For the entire ecosystem:

1. **Verify the market story** — Can you pitch P31 in 3 sentences? 1 paragraph? 1 page? Does every subsystem support that story?
2. **Verify the grant narrative** — Does the Gates draft align with what the code actually does? Does the NLnet draft?
3. **Verify the research narrative** — Do Papers XI, XII, XIX tell a coherent story? Do they cross-reference correctly?
4. **Verify the public face** — phosphorus31.org research narrative, p31ca.org technical hub, BONDING as accessible chemistry. Do these three speak to the same mission?
5. **Identify narrative gaps** — Where does the market story break down? Which subsystems lack a clear "why"?

---

## 4. INTEGRATION POINTS — The Dependency Map

The auditor MUST produce a dependency graph. Here is the known topology — verify or correct:

```
K₄ Cage (mesh authority)
├── Command Center (dashboard, health pings every subsystem)
├── p31ca.org (public hub, links to all sites)
├── phosphorus31.org (research + donations)
├── PHOS (reference PWA, feeds telemetry)
├── BONDING (game, feeds learning data)
├── Agent Hub (orchestrates workers)
├── K₄ Mesh Core (shared lib, imported by all)
├── love-ledger (value accounting, imported by PHOS + BONDING)
├── node-zero package (hardware interface)
├── sovereign-sdk (shared by all Workers)
├── quantum-core (utilities, shared by all)
└── shared (ErrorBoundary, event bus, UI components)
    ├── p31ca Astro islands
    ├── BONDING React tree
    ├── PHOS React tree
    ├── Hearing Ops React tree
    └── Mesh SPA
```

**Critical questions the dependency map must answer:**
- What happens if K₄ Cage is unreachable? (degraded but functional? bricked?)
- What happens if love-ledger KV is down? (transactions fail silently? queued?)
- What happens if the shared package has a breaking change? (all 5 consumers tested?)
- What happens if Cloudflare has an outage? (PWAs still work? Which ones?)

---

## 5. MARKET LAUNCH READINESS CHECKLIST

### 5.1 Regulatory / Legal

- [ ] **FDA status**: No classification claimed. 513(g) RFI document ready for filing before market entry. Buffer and Node Zero both: "general wellness / communication support."
- [ ] **IRS 501(c)(3)**: Form 1023-EZ filed? If not, what's blocking? ($275 on pay.gov)
- [ ] **GA charitable registration**: C-100 filed? ($35 + No Funds Received Statement)
- [ ] **EIN**: 42-1888158 everywhere? (Not the stale HCB EIN. CWP-076 verified?)
- [ ] **Privacy policy**: Exists and deployed? Covers all data flows (KV, D1, telemetry, WebRTC)?
- [ ] **Terms of service**: Exists and deployed?
- [ ] **GDPR/CCPA**: Does any data leave the browser? If so, what's the lawful basis?

### 5.2 Infrastructure

- [ ] **All Workers deployed from repo source** — No "deployed from unknown" workers.
- [ ] **KV namespaces documented** — Every binding, every key pattern, every TTL.
- [ ] **D1 schemas versioned** — Migration files in repo, not ad-hoc.
- [ ] **Cron triggers documented** — What fires, when, what happens if it misses.
- [ ] **Secret rotation plan** — STATUS_TOKEN, Stripe keys, CF_API_TOKEN — where stored, how rotated.
- [ ] **Disaster recovery** — If the repo disappears tonight, can the mesh be reconstructed from deployed Workers?

### 5.3 Monitoring

- [ ] **Health pinger** — Command Center cron pings every Worker. Results visible at `/health`.
- [ ] **Error tracking** — No Sentry, no analytics SDK. How do we know if something breaks?
- [ ] **KV read/write error rate** — Tracked? Tolerable threshold?
- [ ] **Firmware uptime** — How many Node Zero devices connected? Average session duration?

### 5.4 Narrative

- [ ] **Elevator pitch** (3 sentences) — Verified to match actual code capabilities.
- [ ] **Grant narrative** — Gates, NLnet, ASAN drafts all tell the same story.
- [ ] **Public website** — phosphorus31.org says what P31 does, who it serves, how to get involved.
- [ ] **Social presence** — LinkedIn (Will's profile), Facebook page (scaffold exists), Twitter/X (any activity?).
- [ ] **Research DAG** — Papers I-XIX form a coherent dependency graph. XII (Sovereign Stack) is the root.

### 5.5 Financial

- [ ] **Mercury bank account**: Active? Routing/account number documented?
- [ ] **Stripe integration**: Webhook endpoint deployed? Idempotency keys?
- [ ] **Ko-fi**: Webhook wired into P31 Forge?
- [ ] **Donation flow**: phosphorus31.org/donate → Stripe → confirmation → thank-you email?
- [ ] **Operating buffer**: Currently $530. Runway at current burn rate?

---

## 6. DELIVERABLES FORMAT

The auditor must produce a single converged report: `03_OPERATIONS/CWP-078_CONVERGENCE_REPORT.md`

### Report structure:

```markdown
# CWP-078 Convergence Report — [DATE]

## Executive Summary (3 paragraphs max)
— State of the ecosystem
— Top 3 blockers to market launch
— Top 3 strengths

## Convergence Status Matrix
— Subsystem-by-subsystem status (LAUNCH_READY / NEEDS_HARDENING / etc.)

## Dependency Graph
— Mermaid diagram showing all subsystems + their connections
— Legend: solid line = hard dependency, dashed = soft/optional

## Audit Results by Lane
### Architect Findings
— [Pass/Fail per CWP-077 checklist item]
— [Single points of failure]

### Mechanic Findings
— [Pass/Fail per frontend checklist]
— [Bundle sizes, offline behavior, accessibility]

### DeepSeek Findings
— [Firmware build, boot, WiFi, HTTPS, NVS, watchdog]

### Gemini Findings
— [Narrative coherence, market story, grant alignment]

## Blockers (sorted by severity)
### 🔴 Critical (blocks launch)
### 🟡 Medium (should fix before launch)
### 🟢 Low (post-launch)

## Recommendations
— Top 5 actions to reach LAUNCH_READY
— Subsystems to SUNSET (if any)
— Unanswered questions

## Appendix
— Full inventory table with convergence status per cell
— Test results (build output, test count, curl responses)
— Dependency graph (text + Mermaid)
```

---

## 7. TIMELINE

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Subsystem audit (all lanes parallel) | 1 session | Per-subsystem audit notes |
| 2. Dependency mapping | 1 session | Dependency graph |
| 3. Convergence scoring | 1 session | Convergence Status Matrix |
| 4. Report compilation | 1 session | `CWP-078_CONVERGENCE_REPORT.md` |
| 5. Gate review | 1 session | Architect sign-off + patch list |

---

## 8. VERIFIED FACTS (copy-paste from CWP-077 — no hallucinations)

| Fact | Value |
|------|-------|
| EIN (P31 Labs) | 42-1888158 |
| EIN (HCB, STALE) | 42-1888158 — do NOT use |
| BONDING test count | 424 tests / 32 suites |
| CogPass version | v4.1 |
| Relay architecture | Cloudflare KV polling (3-10s) — NOT DO, NOT WebSocket |
| SE050 PQC | DOES NOT exist (50KB flash insufficient) |
| SX1262 link budget | ~170 dB max — NOT 178 dB |
| FDA classification | None claimed. Pre-market only. 513(g) RFI before market entry. |
| GA charitable form | C-100 ($35) — NOT C-200 |
| Larmor frequency | 863 Hz (³¹P in Earth's field) |
| K₄ planarity | K₄ IS planar — volumetric enclosure (β₂=1) |
| Children initials | S.J. (b. 3/10/2016), W.J. (b. 8/8/2019) — full names NEVER in filings |
| Mercury bank | ACTIVE (approved 4/20/2026) |
| SoS status | Active (expedite submitted April 14, control number received) |
| Operating buffer | ~$530 (Ko-fi + Stripe) |
| Papers on Zenodo | I-IV published with DOIs. V-XIX expanded + styled. XIII, XVIII, XX parked. |

---

## 9. ARCHITECTURAL CONSTRAINTS (must not violate)

| Constraint | Rationale |
|------------|-----------|
| Zero analytics/telemetry SDKs | Sovereignty requirement. No phone-home. |
| No third-party CDN fonts | Inter self-hosted. Must work offline. |
| POST-not-WSS for hardware relay | TLS WebSockets on ESP32 are fragile. |
| Guardian at spoons===0 is pure CSS/static | Zero cognitive load. No animations. |
| PGLite WASM lazy-chunked | 10 MB never blocks initial render (80 KB hot path). |
| All storage try/caught with fallback | localStorage quota, IndexedDB unavailable, private browsing. |
| No WebSocket for mesh relay (use KV polling) | Battle-tested at 3-10s intervals across 21 workers. |

---

## 10. FINAL INSTRUCTION

This is not a code review. This is a **convergence audit**. The question is not "does this function work?" but "does this subsystem make the ecosystem stronger or weaker?"

If a subsystem passes all its tests but has no clear market narrative, flag it.
If a subsystem has a beautiful narrative but zero tests, flag it.
If two subsystems do the same thing, recommend which one to keep.

The output is not a bug list. The output is a **launch readiness declaration**.

At the end, the report must answer one question:

> Is the P31 ecosystem ready for market, and if not, what are the exact remaining steps to get there?

*Ca₉(PO₄)₆*
