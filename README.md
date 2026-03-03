# P31 Andromeda

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Archived](https://img.shields.io/badge/Archive.org-Timestamped-blue.svg)](https://web.archive.org/web/*/github.com/p31labs/andromeda)

## Status: Active — T-7 to Birthday Ship (March 10, 2026)

**P31 Labs** builds open-source assistive technology for neurodivergent individuals.
This monorepo contains all P31 products, architecture, research, and defensive publications.

---

## Live Products

| Product | URL | Status |
|---------|-----|--------|
| **BONDING** | [bonding.p31ca.org](https://bonding.p31ca.org) | **Live — T-7 to full ship** |
| **phosphorus31.org** | [phosphorus31-org.pages.dev](https://phosphorus31-org.pages.dev) | Live |

---

## Directory Structure

```
P31_Andromeda/
├── 00_INGEST/         # Incoming files from mobile sync
├── 01_ADMIN/          # Legal, defensive pubs, work control docs
├── 02_RESEARCH/       # Research artifacts and synthesis
├── 03_ARCHITECTURE/   # System design and specifications
├── 04_SOFTWARE/       # Application code and libraries
│   ├── bonding/       # BONDING game (React + R3F + Zustand) ← ACTIVE
│   ├── frontend/      # P31 Centaur IDE (React + Three.js)
│   ├── backend/       # FastAPI buffer agent
│   └── extensions/    # 4 VS Code extensions
├── 05_FIRMWARE/       # ESP32-S3 Node One hardware code
└── docs/              # Core axioms, executive synthesis, WCD templates
```

---

## BONDING — Primary Active Product

A molecule-building chemistry game for neurodivergent families.
Built for Bash Johnson's 10th birthday (March 10, 2026).

**Why it exists:** Remote multiplayer so a father can play chemistry alongside
his kids from separate devices. Every atom placed is a timestamped parental
engagement log. Every ping is documented contact. The game is a bridge, not a toy.

```
04_SOFTWARE/bonding/
├── src/
│   ├── components/        # React + R3F UI (MoleculeCanvas, ElementPalette, etc.)
│   ├── store/gameStore.ts # Zustand — single source of truth
│   ├── engine/            # Chemistry, sound, achievements, quests
│   ├── genesis/           # Court-grade telemetry + LOVE economy (CWP-03 Rev B)
│   └── data/              # Elements, molecules, achievements
└── worker/                # Cloudflare Worker (telemetry + multiplayer relay)
```

**Dev commands:**
```bash
export PATH="/home/p31/.config/nvm/versions/node/v24.14.0/bin:$PATH"
cd 04_SOFTWARE/bonding
npm install
npx tsc --noEmit          # type check (0 errors)
npx vitest run             # tests (488/488 passing)
npx vite build             # production build
npx wrangler pages deploy dist --project-name=bonding
```

**Current build state (March 3, 2026):**
- 488 / 488 tests passing
- TypeScript: clean
- The Genesis Block (CWP-03 Rev B): live — court-grade telemetry + LOVE economy
- The Cockpit (WCD-08): live — glassmorphism HUD, z-index doctrine
- MolecularWarp: live — element-colored chemistry particle field
- Remaining to ship: multiplayer, difficulty modes, touch hardening

---

## The Genesis Block — Legal Evidence Engine

CWP-03 Rev B is a cryptographically court-admissible telemetry system embedded in BONDING:

- Every atom placed → signed event in the LOVE ledger (IndexedDB + Cloudflare KV)
- Server-side SHA-256 countersignature (Daubert-proof)
- Per-session unique KV keys (zero write contention)
- 30-second incremental flush + IDB backstop on session exit
- Georgia statutes: O.C.G.A. § 24-9-901/902, § 24-8-803, § 24-7-702

Relay: `https://bonding-relay.trimtab-signal.workers.dev`

---

## Defensive Publications

The `01_ADMIN/` directory contains timestamped defensive publications:

- **SOULSAFE v1.0** — Cognitive load management system (SUBSAFE applied to cognition)
- **P31 Defensive Publication v1.1** — Core architecture prior art claims
- **P31 Work Control Documents** — WCD template suite (WCD-01 through WCD-06 types)
- **P31 Bridge Program** — HCB fiscal sponsorship framework

Defensive publication timestamped at Internet Archive: February 25, 2026.

---

## The Triad of Cognition

Three AI agents, strict domain boundaries (SOULSAFE tag-out protocol):

| Agent | Role | Lane |
|-------|------|------|
| **Sonnet (CC)** | Mechanic — 80% | UI, React, debugging, WCD execution |
| **Gemini** | Narrator — 15% | Grants, narrative, research synthesis |
| **Opus** | Architect — 1% | QA, test suites, risk audits, WCD authoring |

---

## Core Metaphor

**Phosphorus (P-31):** The operator. Unstable, reactive, essential for life.
**Calcium cage:** The Posner molecule — Ca₉(PO₄)₆ — protects phosphorus at all angles.
**Larmor frequency:** 863 Hz — canonical resonance of ³¹P in Earth's magnetic field.
**L.O.V.E.:** Ledger of Ontological Volume and Entropy. Soulbound token economy.

---

## Archive Verification

This repository is archived at the Internet Archive for timestamp verification:
- [Archive.org Snapshot](https://web.archive.org/save/https://github.com/p31labs/andromeda)

---

## License

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

---

**P31 Labs** | [p31.io](https://p31.io) | [phosphorus31.org](https://phosphorus31.org)
*Building the cognitive infrastructure for human flourishing. 🔺*
