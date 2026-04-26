# P31 Labs Delta Job Board

**Last Updated:** March 22, 2026

**Live app:** [https://p31ca.org/hiring](https://p31ca.org/hiring) (same as `/delta-hiring/`). **Proof export:** portable `p31.proofRecord` JSON from the hiring UI (browser-local until you export).

---

## How Delta Hiring Works

No resumes. No degrees. Prove your skills through real work challenges.

1. **Browse open roles** below
2. **Complete WCD challenge** for your chosen role
3. **Earn L.O.V.E. tokens** for completed work
4. **Join as Guild Member** with equity

---

## Open Positions (8 Total)

### 🔴 HIGH PRIORITY

#### 1. React Frontend Developer
- **Guild:** Frontend
- **Location:** Remote
- **Priority:** HIGH

Build accessible React components for Spaceship Earth and BONDING game.

**Required Skills:** React, TypeScript, Zustand, Tailwind

**WCD Challenge:** `WCD-FRONT-001`
> Build accessible modal component with animations
- **Reward:** +10 L.O.V.E.
- **Difficulty:** ★★☆☆☆

---

#### 2. 3D Developer (Three.js/R3F)
- **Guild:** Frontend
- **Location:** Remote
- **Priority:** HIGH

Create immersive 3D experiences for Observatory Room (geodesic dome) and Collider Room (particle simulator).

**Required Skills:** Three.js, R3F, WebGL, GLSL

**WCD Challenge:** `WCD-3D-001`
> Implement 2V icosahedron with 55 nodes
- **Reward:** +25 L.O.V.E.
- **Difficulty:** ★★★★☆

---

#### 3. Grant Writer
- **Guild:** Operations
- **Location:** Remote
- **Priority:** HIGH

Research and write federal grant applications (NIDILRR, NSF, DOE).

**Required Skills:** NSF, NIDILRR, Grant Apps

**WCD Challenge:** `WCD-GRANT-001`
> Draft NIDILRR FIP concept paper
- **Reward:** +50 L.O.V.E.
- **Difficulty:** ★★★★★

---

### 🟡 MEDIUM PRIORITY

#### 4. Firmware Engineer (ESP32)
- **Guild:** Hardware
- **Location:** Remote

Build firmware for Node One (ESP32-S3) with haptic feedback (DRV2605L), LoRa mesh, and BLE beacon support.

**Required Skills:** ESP-IDF, C/C++, BLE, LoRa

**WCD Challenge:** `WCD-HW-001`
> Implement DRV2605L haptic pattern library
- **Reward:** +30 L.O.V.E.
- **Difficulty:** ★★★★☆

---

#### 5. Backend Engineer
- **Guild:** Backend
- **Location:** Remote

Extend Cloudflare Workers, design PostgreSQL schemas, implement CRDT sync for Spaceship Earth.

**Required Skills:** Cloudflare, PostgreSQL, Workers, CRDT

**WCD Challenge:** `WCD-BE-001`
> Implement room presence API
- **Reward:** +20 L.O.V.E.
- **Difficulty:** ★★★☆☆

---

#### 6. UI/UX Designer
- **Guild:** Design
- **Location:** Remote

Design accessible interfaces for neurodivergent users. Focus on cognitive load reduction and clear visual hierarchy.

**Required Skills:** Figma, Accessibility, Design Systems

**WCD Challenge:** `WCD-DES-001`
> Design accessible room navigation UI
- **Reward:** +15 L.O.V.E.
- **Difficulty:** ★★☆☆☆

---

#### 7. Community Manager
- **Guild:** Operations
- **Location:** Remote

Grow P31 Labs community across Discord, GitHub, and events.

**Required Skills:** Discord, Social Media, Events

**WCD Challenge:** `WCD-COMM-001`
> Create onboarding flow for new Discord members
- **Reward:** +10 L.O.V.E.
- **Difficulty:** ★☆☆☆☆

---

### 🟢 LOW PRIORITY

#### 8. Technical Writer
- **Guild:** Operations
- **Location:** Remote

Create documentation for API, firmware, and user guides.

**Required Skills:** Markdown, API Docs, GitHub

**WCD Challenge:** `WCD-DOC-001`
> Write API reference for meshSync service
- **Reward:** +10 L.O.V.E.
- **Difficulty:** ★☆☆☆☆

---

## Equity Tiers

| Tier | Tokens Required | Equity | Voting Rights |
|------|----------------|--------|---------------|
| Guild Member | 50 | 0.1% | ✓ |
| Guild Leader | 200 | 0.5% | ✓ + Budget |
| Core Team | 500 | 1.0% | ✓ + Board Seat |

---

## Links

- **Job Board (HTML):** `docs/delta-job-board.html`
- **Hiring app (Vite, help center, WCD library, search, role packets, proof import/export):** `andromeda/04_SOFTWARE/p31-delta-hiring/` — `pnpm --filter p31-delta-hiring dev` (from `andromeda/04_SOFTWARE`); full gate: `pnpm --filter p31-delta-hiring run check`
- **Delta Architecture:** `docs/DELTA_HIRING_SYSTEM_ARCHITECTURE.md`
- **GitHub:** https://github.com/p31labs
- **Website:** https://phosphorus31.org
