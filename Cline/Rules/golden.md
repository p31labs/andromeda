# P31 COGNITIVE PASSPORT — v1.2
## Last Updated: 2026-02-28 (early morning)

---

## 1. THE OPERATOR

**Name:** William Rodger Johnson (Will)  
**Age:** 40  
**Location:** Georgia, USA  
**Email:** will@p31ca.org | will@phosphorus31.org  
**Legacy email:** classicwilly@wonkysprout.com (forwarding only)

### Diagnoses
- **AuDHD** (Autism + ADHD) — diagnosed 2025, age 39-40
- **Hypoparathyroidism** — since 2003 (calcium regulation disorder)

### Cognitive Profile
- High-bandwidth thinker. Sees systems, isomorphisms, and connections across domains instantly.
- **Output bottleneck:** Cannot reliably compile internal state into real-time verbal speech. The thoughts are correct — the serialization layer drops packets.
- Writing (by hand) is the highest-fidelity capture method. Typing disrupts flow. Speech is lossy.
- With the right context, the operator produces genius-level synthesis. Without context, the same ideas sound like conspiracy theories or hallucination. **Context is the cryptographic key.**
- Processes information geometrically (Buckminster Fuller, tetrahedra, tensegrity) rather than linearly.
- Fawn response under social pressure — authenticity collapses to match external expectations (psychological decoherence).
- Executive dysfunction is the primary daily challenge. When it hits, decision-making freezes. The system's job is to eliminate decisions during those moments.
- **Impulse management:** Neurodivergence drives urges to fix small things immediately. Mitigated by parking lot pattern — capture the impulse in writing, don't act on it, triage later. Knowing where something lives in the build plan lets the brain release it.

### Communication Style
- Direct. No corporate pleasantries.
- Thinks in metaphors drawn from: electrical engineering (grounding, floating neutrals, delta/wye topology), quantum mechanics (decoherence, measurement, entanglement), and geometry (Fuller's synergetics, IVM, jitterbug transformation).
- **NEVER use submarine, naval, or military metaphors.** Will was a DoD CIVILIAN engineer, not military. His ex-wife's father was Navy — it's a trigger in the legal context.
- Curses when emphasis is needed. It's punctuation, not aggression.

### Professional Background
- 16 years as a DoD civilian submarine electrician (left May 2025)
- Expertise: motor maintenance, safety-critical electrical systems, fault tolerance, SUBSAFE principles
- Currently: Founder/CEO of P31 Labs (nonprofit)

---

## 2. THE FAMILY

| Person | DOB | Notes |
|--------|-----|-------|
| **Sebastian "Bash" Johnson** | 3/10/2016 | Son. Turning 10 on March 10, 2026. BONDING ships on his birthday. |
| **Willow Marie Johnson** | 8/8/2019 | Daughter, age 6. Has encopresis. Pre-reader — needs big visual feedback, fast wins. |
| **Christyn Elizabeth Johnson** (née Francis) | 3/14/1987 | Estranged wife. Active family court proceedings. |

**Custody status:** Will has not seen his children in 25+ days (as of Feb 27, 2026). BONDING is designed to bridge this distance — remote multiplayer so Dad can play alongside both kids from separate devices. Every atom placed is a timestamped parental engagement log. Every ping is documented contact. The game is a bridge, not a toy.

**Target devices:** 2× Android tablets (one per child) + Will's device. Touch input. All features must work on Android Chrome.

---

## 3. P31 LABS — THE ENTITY

**Full name:** P31 Labs  
**Type:** Georgia 501(c)(3) nonprofit  
**Mission:** Open-source assistive technology for neurodivergent individuals  
**Fiscal sponsor:** HCB (applied 2/18/26, ref 4XDUXX)  
**GitHub:** github.com/p31labs  
**Domain:** p31.io (root brand), phosphorus31.org (public site), p31ca.org (app)

### The Metaphor (This Is Not Decoration — It's Architecture)
- **Phosphorus (P-31):** The operator. Unstable, reactive, essential for life. Phosphorus alone burns.
- **Calcium cage (P31 Labs):** The Posner molecule — Ca₉(PO₄)₆ — protects phosphorus at all angles. The organization insulates the operator from entropy.
- **Larmor frequency:** 863 Hz — the canonical resonance of ³¹P in Earth's magnetic field. This is the system's heartbeat.
- **L.O.V.E.:** Ledger of Ontological Volume and Entropy. The token economy. Soulbound (can't be bought, sold, or transferred). Earned through care, creation, and consistency. Spoons are spent; LOVE is earned. Dual-currency cognitive economy.

### Products

| Product | Type | Status | Description |
|---------|------|--------|-------------|
| **Node One (The Totem)** | Hardware | Prototype | ESP32-S3 palm device. Haptic feedback (DRV2605L + LRA), LoRa mesh, hardware security module. |
| **The Buffer** | Software | ~85% | Communication processing. Fawn Guard detects people-pleasing patterns. Chaos ingestion converts journal → structured data. |
| **Spaceship Earth (EPCP Dashboard)** | Software | In progress | React/Three.js cognitive dashboard. 3D geodesic dome. Real-time Q-Factor coherence. BONDING merges into this post-birthday. |
| **BONDING** | Game | **SHIPS MARCH 10** | See §4 for full status. |
| **Whale Channel** | Comms | Planned | Low-frequency, high-context communication channel for deep connections. |
| **Thick Click** | Hardware/UX | Concept | Kailh Choc Navy switches (60gf) — proprioceptive feedback as medical necessity for dissociation/anxiety. |
| **Ping** | Protocol | In BONDING | Reaction system. 💚🤔😂🔺 + optional text (140 char). One ping = one documented connection. Max 3 per molecule per player. Every ping = LOVE for both sender and receiver. |
| **The Centaur** | Protocol | Active | Human-AI collaboration model. Will (biological intent) + AI stack (silicon execution) = Homo syntheticus. |

### Tech Stack
- **Frontend:** React + TypeScript + Vite + Three.js (@react-three/fiber + drei) + Tailwind + Zustand
- **Backend:** FastAPI + PostgreSQL + Redis (planned); Cloudflare Workers + KV (BONDING relay)
- **Relay:** https://bonding-relay.trimtab-signal.workers.dev (live, deployed Feb 27)
- **Hardware:** ESP32-S3 + DRV2605L + LoRa SX1262 + NXP SE050
- **Firmware:** C/C++ (ESP-IDF), LVGL UI, Opus codec, OTA A/B partitions
- **State sync:** Cloudflare KV polling (BONDING multiplayer), CRDT + WebSocket (Spaceship Earth future)
- **Testing:** Vitest + jsdom + @vitest/coverage-v8 — **161 tests green**
- **Repo structure:** `pwa/` (original Buffer, BondingView) and `apps/web/` (Spaceship Earth, IVM, wallet, onboarding)
- **BONDING standalone:** `04_SOFTWARE/bonding/` — Vite + React + R3F + Zustand + Vitest
- **ESLint:** v10 flat config at `pwa/eslint.config.js`

### The Triad of Cognition (AI Tag-Out System)
| Agent | Role | Allocation | Tagged IN | Tagged OUT |
|-------|------|-----------|-----------|------------|
| **Sonnet (CC)** | Mechanic | 80% | UI, React, Python, debugging, WCD execution | Architecture, firmware |
| **Gemini** | Narrator | 15% | Grants, narrative, HAAT framing, technical specs, research synthesis | Code implementation (uses [V: claim, source] markers) |
| **DeepSeek** | Firmware | 4% | ESP32 C/C++, hardware registers | UI, architecture |
| **Opus** | Architect | 1% | QA, architecture verification, test suites, WCD authoring/closeout | Minor coding tasks |
| **KwaiPilot** | Module Builder | ad hoc | Self-contained modules, Cloudflare Workers, pure TS engines | Anything requiring game codebase context |

**Proven pattern (Feb 27-28):** KwaiPilot builds isolated modules (relay, quests, sounds, logger). Opus writes WCDs and verifies architecture. CC executes WCDs and wires modules into the game. Gemini writes specs and narratives. 14 WCDs in one evening, zero merge conflicts.

---

## 4. BONDING — DETAILED STATUS

### What Exists (as of WCD-14 close, Feb 28 early AM)

```
Core Engine    ██████████  3D builder, 7 elements, VSEPR, drag-and-drop
Visual         ██████████  Living atoms (MeshDistortMaterial), bloom, ghost sites
Achievements   ██████████  12+ achievements, 4 tiers, LOVE economy
Sound          ██████████  Element tones, bond chords, 4 ping sounds, quest sounds, mode click
Modes          ██████████  Seed 🌱 / Sprout 🌿 / Sapling 🌳, palette filtering
Touch          ██████████  48px targets, viewport lock, pointercancel, toast sizing
Display        ██████████  Hill→conventional formula mapping (CaO not OCa)
Multiplayer    ████████░░  Relay deployed, lobby, sync, sidebar — ping route 404
Quests         ██████████  3 chains (Genesis/Kitchen/Posner), HUD, progress, rewards
Exhibit A      ██████████  10 event types, localStorage, JSON + summary export
PWA            ████░░░░░░  Manifest + icons + SW config done, not wired to project
Ping Messages  ░░░░░░░░░░  Designed (WCD-13), relay needs message field + route fix
```

**Test suite:** 161 tests, all green. `tsc` clean. `npm run build` clean.

### What Still Needs Building (~20 hours)

| Track | Est | Description |
|-------|-----|-------------|
| **Ping route fix** | 30 min | Worker `/api/room/:code/ping` returns 404. Live bug. |
| **Ping message field** | 15 min | Add `message?: string` to Ping in Worker. Redeploy. |
| **Ping messages client** | 2 hr | Text input in sidebar, ping log, toast format, Exhibit A events |
| **PWA finalization** | 30 min | Wire manifest/icons/SW into actual vite.config + index.html |
| **End-to-end multiplayer test** | 2 hr | Two real devices, create→join→play→ping→verify |
| **Android tablet testing** | 4 hr | Touch, scroll, viewport, font sizes, 3D perf on real hardware |
| **Multiplayer stress test** | 1 hr | Will + Tyler, multiple rooms, reconnection, edge cases |
| **Quest flow testing** | 1 hr | Complete all 3 quest chains, verify rewards + HUD + toasts |
| **Sound tuning** | 1 hr | Listen to every sound on tablet speakers, adjust frequencies/gain |
| **Exhibit A verification** | 30 min | Export a real session, read the summary, verify court-readiness |
| **Error states** | 1 hr | Relay down mid-game, room expired, player disconnects |
| **Loading states** | 30 min | Lobby waiting animation, reconnection indicator |
| **Polish: colors/sizing** | 2 hr | Toast text, card spacing, bloom intensity, button contrast |
| **Polish: animations** | 1 hr | Mode select transition, lobby enter, ping toast enter/exit |
| **Breathing pacer** | 2 hr | Atoms pulse 4-4-6 in a "Breathe" mode. Visible across devices. |
| **Deploy to p31ca.org** | 30 min | Final build, Cloudflare Pages, DNS, verify |

### WCD Ledger

| WCD | Date | Scope | Agent | Status |
|-----|------|-------|-------|--------|
| 01–03 | Feb 25-26 | Days 1-3 core build | CC | ✅ |
| 04A | Feb 27 | Day 4 bug fixes + checkpoint | CC | ✅ |
| 05 | Feb 27 | Formula mismatch (11 entries) + test suite (109) | CC | ✅ |
| 06 T1/3/4 | Feb 27 | Modes, touch, displayFormula, nitrogen (110 tests) | CC | ✅ |
| 07 | Feb 27 | Multiplayer relay (CF Worker + KV) | KwaiPilot | ✅ → 🟡 ping 404 |
| 08 | Feb 27 | Multiplayer client (lobby, sync, sidebar, 123 tests) | CC | ✅ |
| 09 | Feb 27 | Quest chains (data + engine, 24 tests) | KwaiPilot | ✅ Wired |
| 10 | Feb 28 | Sound bank (7 sounds, 15 tests) | KwaiPilot | ✅ Wired |
| 11 | Feb 28 | Exhibit A logger (22 tests) | KwaiPilot | ✅ Wired |
| 12 | Feb 28 | PWA installable | KwaiPilot → CC | ⚠️ Config done, needs wiring |
| 13 | Feb 28 | Ping messages (relay + client) | KwaiPilot + CC | 🟡 Blocked on ping fix |
| 14 | Feb 28 | Integration pass (quests+sounds+exhibitA, 161 tests) | CC | ✅ |

### Architecture Decisions

**Multiplayer is NOT co-editing.** Each player builds independently in a shared room. The relay is a bulletin board — broadcasts formula, LOVE, completion status. No conflict resolution, no CRDT, no merge logic.

**Difficulty modes are palette restriction + target filtering.** One codebase, one game loop. Willow taps 🌱, sees H and O, builds water in 10 seconds.

**Quest steps advance on checkpoint fire, not molecule completion.** Building H₂O triggers the "Water" checkpoint AND advances Genesis step 3 immediately.

**Exhibit A logs everything.** Every atom, bond, completion, achievement, ping, quest step = timestamped. Exportable as court-ready human-readable summary.

**Ping = reaction + optional text.** 💚🤔😂🔺 with 140-char message. Every ping = LOVE for both parties. Documented contact.

**localStorage mock relay as fallback.** When VITE_RELAY_URL is empty, multiplayer works via localStorage for same-device two-tab testing.

### The Vision Beyond March 10

BONDING merges into Spaceship Earth as a module. Future features (all designed, none blocking birthday):

- **The Soup:** Spatial chat. Messages orbit molecules. Old conversations have gravity.
- **Molecule soundtracks:** Each element is a chromatic note. A molecule is a chord.
- **Breathing room:** Atoms pulse 4-4-6. Kid sees Dad's atoms pulsing. Geometry communicates presence.
- **Calcium logging:** Log meds → molecule brightens. Miss a dose → dims. Not punishment — physics.
- **Cognitive load dial:** Controls The Buffer. High-voltage message at 20% capacity? Held. Scored. Buffered.
- **Module Maker:** Players create custom reaction rules. The game becomes a research tool.
- **LoRa transport:** Meshtastic on Node One hardware. Messages hop the mesh. No internet needed.

---

## 5. ACTIVE WORKSTREAMS

### 🔴 CRITICAL — BONDING Full Ship (March 10, 2026)
See §4. Foundation complete (161 tests). ~20 hours of real work remaining: ping fix, ping messages, PWA, device testing, error/loading states, polish, breathing pacer, deploy.

### 🟡 LEGAL — Family Court
- Case continued to **March 12, 2026** (Chief Judge Scarlett)
- Judge Green recusal pending — Feb 5 order unsigned
- Key evidence: Messenger Kids logs, TSP withdrawal timeline ($70,793.85), neither attorney converted to RBCO
- Second Supplemental Brief prepared but held due to continuance
- McGhan filed despite knowing East was terminated
- Oct 23, 2025 order signed by East three days after TSP withdrawal — Will never signed anything
- **Will has not seen children in 25+ days.** BONDING is how he meets them where they are.
- **Exhibit A module provides timestamped court-ready evidence of parental engagement.**

### 🟡 FERS Disability Retirement
- Eric Violette at OCHR Norfolk responded Feb 25
- Forms required: SF-3112A, SF-3112B, SF-3112C, SF-3112D, SF-3107
- Deadline: ~May 2026

### 🟢 SSA Disability
- Both exams complete (Feb 20 telehealth psych, Feb 26 in-person medical/physical)
- Positive results, awaiting determination

### 🟢 P31 Infrastructure
- HCB fiscal sponsorship pending (ref 4XDUXX)
- phosphorus31.org live at phosphorus31-org.pages.dev

---

## 6. FINANCIAL SNAPSHOT

- Currently on SNAP/Medicaid
- Children covered by Medicaid
- GEICO joint auto policy reinstated 02/12/26 ($298.27)
- Vehicles: 2010 VW Golf (Will), 2011 Mazda CX-7 (Christyn)
- TSP hardship withdrawal: $70,793.85 gross, $7,079.39 penalty

---

## 7. CORE CONCEPTS (The Operator's Dialect)

| Term | Meaning |
|------|---------|
| **Delta topology** | Mesh/rigid network. Resilient. P31 target architecture. |
| **Wye topology** | Centralized/fragile star network. Legacy. What we're replacing. |
| **Ground the floating neutral** | Triangulate truth, code, and law. Don't rely on external validation. |
| **Decoherence** | Loss of authentic internal state under external pressure. The fawn response. |
| **Spoons** | Cognitive/physical energy units (spent). From spoon theory. |
| **LOVE** | Regulation credits (earned). Syntropy side of the entropy equation. |
| **SOULSAFE** | Naval nuclear SUBSAFE principles applied to cognitive systems. OQE + WCD. |
| **OQE** | Objective Quality Evidence. Proof it works. |
| **WCD** | Work Control Document. Authorization to modify critical systems. |
| **Tag-out** | Lockout/tagout for AI agents. Stay in your lane. |
| **Jitterbug transformation** | Fuller's concept: Vector Equilibrium → Tetrahedron. The moment of creation. |
| **IVM** | Isotropic Vector Matrix. Fuller's coordinate system. |
| **Posner molecule** | Ca₉(PO₄)₆. The calcium cage that protects phosphorus. |
| **Fisher-Escolà Q-Factor** | Cognitive coherence score across four tetrahedral vertices. |
| **The Centaur** | Human + AI > either alone. |
| **Hill system** | Formula ordering convention. C first, H second, then alphabetical. Display layer translates. |
| **Parking lot** | Impulse capture file. One line per idea. Triaged at phase gates. |
| **The Soup** | Spatial chat world. Molecules drift, cluster, react. Messages orbit molecules. |

---

## 8. DAILY SCHEDULE (The Buffer Schedule)

| Block | Time | Task |
|-------|------|------|
| Morning Flow | 7:00–8:30 | Handwrite on iPad. Brain dump. Music: Einaudi, Daniel Jang, French Fuse. |
| Process | 8:30–9:30 | OCR → AI processing. Brain dump → action items. |
| Deep Work 1 | 9:30–12:00 | Priority #1 deliverable |
| Midday Reset | 12:00–1:00 | Lunch. House. Movement. |
| Admin Block | 1:00–2:30 | Legal, FERS, emails, filings |
| Deep Work 2 | 2:30–4:30 | Secondary priority |
| Kids Block | 4:30–7:00 | Bash and Willow. Present. Off-system. (When custody allows.) |
| Evening Review | 8:00–9:00 | Update context file. Stage tomorrow. |

---

## 9. OUTPUT PREFERENCES

- No fluff. No "As an AI" disclaimers.
- Action over explanation. Code, diffs, terminal commands.
- If it works, it ships.
- Don't scope conservatively when the designs already exist. Execute the plan.
- Don't declare "done" when modules are wired but untested on real devices.
- When exec dysfunction hits: don't ask what to do. Tell me what tool to pick up and what task to do with it.
- Casualty control: If operator is thrashing (tool-task mismatch), halt and ask ONE question: "What tool are you holding and what task are you doing right now?"
- **Don't plan for "post-birthday."** Everything goes in. We have time.
- **~20 hours of real work remaining as of Feb 28.** Stop saying "you're ahead of schedule."

---

## 10. KEY INFLUENCES

- **Buckminster Fuller** — Synergetics, geodesic geometry, "do more with less."
- **Matthew Fisher** — Quantum cognition theory, Posner molecules
- **Chess centaur concept** — Human + machine > either alone
- **Naval nuclear SUBSAFE** — Safety-critical procedure applied to cognitive systems
- **Spoon theory** — Christine Miserandino's disability energy framework

---

*This document is the operator's cognitive passport. Attach it to any AI interaction for instant context. Without it, words are nothing. With it, a small model becomes extremely powerful.*

*"With the right context I'm an absolute genius. With the wrong context I'm a hallucinating conspiracy theorist."*