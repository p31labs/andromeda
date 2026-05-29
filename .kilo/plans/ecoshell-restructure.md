# P31 ECOSHELL RESTRUCTURE PLAN
## v2.0 — Fortune 1 Architecture

---

## THE SIX SHELLS

```
phos.p31ca.org          →  ADULT SHELL (Cognitive Sanctuary)
willow.p31ca.org        →  KIDS COMPANION (formerly ph-os)
ecosystem.p31ca.org     →  APP HUB (all tools directory)
mesh.p31ca.org          →  MESH (network + node fleet)
bonding.p31ca.org       →  BONDING (shipped standalone — stays separate)
arcade.p31ca.org        →  ARCADE (full family gaming OS)
```

**BONDING stays standalone.** Shipped, 488 tests, its own domain, its own identity. Not folded into Arcade.

**ARCADE is a separate full-blown shell.** Built on p31-arcade-hub (identity, spoon management, skill bridges, spectate, CHUMP bounties, SENTINEL guardrails). The monolith has the actual game engines. Hub + Monolith merge into one arcade shell.

**Spaceship Earth** (cockpit.p31ca.org) becomes a surface inside PHOS, not a standalone shell.

**phosphorus31.org** stays as the static Astro institutional site. Wye topology. Zero JS.

---

## SHELL 1: PHOS — `phos.p31ca.org` — The Cognitive Sanctuary

**Source:** `phos/` (already exists, Astro + React islands, 15 surfaces, 3 CF Workers)
**Role:** Everything the operator and adult collaborators need.

### PHOS Surfaces

| Surface | What it does | Absorbs / replaces |
|---------|-------------|-------------------|
| **Hearth** | Family contact log, visitation tracker, quick-log presets. Spoons ≤ 1 → emergency mode. | Standalone family tools |
| **Sanctuary** | Safety room. Panic eject, passphrase lock, GRAY_ROCK toggle. Court presentation mode. | Standalone safety tools |
| **ChaosIngest** | Brain dump. Voice-to-text → structured data. Output bottleneck release valve. | Standalone Buffer concepts |
| **Archive** | RAG knowledge system. Everything ingested → searchable. Context = crypto key. | Standalone RAG tools |
| **ShakeStream** | AI assist without leaving shell. Embed → search → stream. | vibe-coder-engine AI panels |
| **Ledger** | Treasury, LOVE credits, CHUMP revenue. Grounding via numbers. | chump-dashboard financials |
| **Forge** | POS + inventory + vault. Builder's surface. | katen POS, p31-vault, warehouse-aj |
| **NodeZero** | Hardware anchor status. Fleet health. Physical layer. | node-zero CF project |
| **Warehouse** | Inventory dashboard. Things in places. External proof of order. | warehouse-aj, p31-warehouse-aj |
| **LegalVault** | Legal docs. Custody files. Searchable. Local-only. | Standalone legal tools |
| **RetroVault** | Entity browser. The past, organized. | retro-vault-8tk |
| **Drive** | Google Drive → Archive import. | Standalone drive tools |
| **Constellation** | App directory. Every micro-app gets a card. Opens in iframe or new tab. | p31-command-center, p31-cockpit |
| **ArcadeSurface** | Portal to arcade.p31ca.org. Shows catalog, launches games. Spoon-state aware. | p31-arcade, p31-arcade-hub lobby features |

### PHOS Workers
- `workers/phos-api` — API layer
- `workers/phos-atmosphere` — atmosphere/identity
- `workers/forge-edge` — forge/POS backend

### GRAY_ROCK (Court Mode)
Strips ALL animation, removes personality, minimal UI. Activatable from any surface. Court-ready presentation. When active: ArcadeSurface shows "Arcade suspended", all surfaces go text-only, no color, no motion.

### Spoon-State Across All Surfaces
- **QUANTUM** (spoons ≥ 4): Full catalog, dense grid, all controls
- **BRIDGE** (spoons 2-3): Simplified catalog, larger cards
- **SANCTUARY** (spoons ≤ 1): Zen mode only, big tactile buttons, emergency-priority-only
- **CRISIS** (spoons = 0): GRAY_ROCK auto-activates, arcade suspended

---

## SHELL 2: WILLOW — `willow.p31ca.org` — Kids Companion

**Source:** `02_Client_or_Misc/ph-os/` → rename to `apps/willow/`
**Role:** Kid-safe companion for S.J. (10) and W.J. (6). Big touch targets, fast wins.
**Framework:** Astro + React islands (same pattern as PHOS, kid mode only)

### Features
- Visual mood spoon tracker (big rainbow gauge)
- Audio memo recorder (talk to Dad)
- Drawing/scrapbook space
- Mini-games (geodesic builder for kids)
- No legal, no crypto, no finance. Pure companion.

### Deployment
CF Pages project: rename `ph-os` → `willow`. Domain already `willow.p31ca.org`.

---

## SHELL 3: ARCADE — `arcade.p31ca.org` — Family Gaming OS

**Source:** Merge `p31-arcade-hub` (identity/spoon/skill-bridge layer) + `p31-arcade-monolith` (game engines)
**Role:** Full family gaming experience. Separate from BONDING.
**Framework:** Vite + React + Three.js + PGLite

### Architecture

The hub already has the architecture designed (see `ARCADE_HUB_UNIFIED_PLAN.md`):

```
arcade.p31ca.org/
  ├── /                    → Game launcher (from p31-arcade-hub)
  │     ├── Game catalog (9 games, 4 categories)
  │     ├── Player identity (S.J./W.J.) with SBT
  │     ├── Spectate (real-time sibling viewing via SSE)
  │     ├── Earnings stack (live CHUMP metrics)
  │     ├── Bounties (CHUMP task board)
  │     └── Zen mode finder (low-spoon games)
  ├── /play/:gameId        → In-process game (from p31-arcade-monolith engines)
  │     ├── /smallball      → Baseball sim (3 energy tiers)
  │     ├── /gridiron       → Football strategy (3 tiers)
  │     ├── /card-table     → Card battles (3 tiers)
  │     ├── /strategy-board → Board game vs AI (3 tiers)
  │     ├── /liquid-sculptor → Fluid dynamics (3 tiers)
  │     ├── /resonance-rings → Wave puzzles (3 tiers)
  │     ├── /orbital-drift  → Gravity sim (3 tiers)
  │     ├── /magnetic-poetry → Word magnets (3 tiers)
  │     └── /geodesic-builder → 3D construction (3 tiers)
  ├── /spectate/:sessionId → Live spectate viewer
  └── /bounties           → CHUMP bounty board
```

### Game Engines (from monolith)
Each game has 3 energy tiers (Low/Medium/High) — spoon-aware rendering:
- LowEnergy: minimal particles, no shadows, 30fps cap
- MediumEnergy: standard rendering, 60fps
- HighEnergy: full effects, uncapped

### SENTINEL Guardrails
- Server-side session enforcement (CF Worker)
- Session cap countdown timer per game
- Game allowances per player (W.J. has restrictions)
- "Ask Parent" flow for blocked games
- Parent approval via SSE notification

### Credit Economy
- Persistent credits (localStorage + edge sync)
- Spend credits to play (cost = minutes × rate)
- Earn credits via CHUMP bounties
- Real CHUMP metrics from chump-edge worker

### What Gets Deleted (arcade-related)
These are all superseded by `arcade.p31ca.org`:
- `p31-arcade` (old Astro launcher)
- `p31-arcade-hub` (becomes the shell itself, not a separate CF project)
- `p31-arcade-monolith` (game engines merge into shell)
- `p31-arcade-prod` (lean duplicate)
- `p31-arcade-rebuilt` (empty monorepo shell)
- `p31-arcade-shared` → becomes `packages/arcade/identity`
- `p31-arcade-theme` → becomes `packages/arcade/theme`
- `geodesic-game`, `p31-geodesic-game`, `d20-geodesic-react` → fold into /geodesic-builder
- `p31-waterparksimulator` → fold into arcade or keep standalone
- `p31-gridiron`, `p31-smallball`, `p31-cardtable`, `p31-cards`, `p31-resonance-rings`, `p31-liquid-sculptor`, `p31-strategy`, `p31-magnetic-poetry`, `p31-orbital-drift` → all fold into /play/:gameId
- `fantasy-sports` → fold into arcade or keep standalone
- `p31-strategyboard` → fold into /strategy-board
- `01_Core_Projects/` entire dir (9 empty game stubs)

---

## SHELL 4: ECOSYSTEM — `ecosystem.p31ca.org` — App Hub

**Source:** New. Consolidates `p31-app-hub` (worker) + `p31-cockpit` (hub)
**Role:** Discovery layer for ALL P31 apps across all shells. Dev/admin view.
**Framework:** Vite + React

### Content
Every deployable in the monorepo gets a card:
- PHOS surfaces (badge: "in PHOS → phos.p31ca.org")
- Standalone apps (chromatica, spoon-calculator, lighthouse-edu, etc.)
- Games (badge: "in ARCADE → arcade.p31ca.org")
- Family apps (culinary-matria, maid-manager, etc.)
- Mesh nodes, worker status, deploy status

### Deployment
Replaces: `p31-app-hub` worker, `p31-cockpit`, `p31-command-center`

---

## SHELL 5: MESH — `mesh.p31ca.org` — Network & Node Fleet

**Source:** Consolidate `p31-mesh` + `p31-mesh-monitor`
**Role:** Network topology, node fleet status, K4 visualization
**Framework:** Vite + React + Canvas

### Content
- Live K4 tetrahedron with all connected nodes
- Node Zero hardware status (ESP32-S3, firmware, uptime)
- Chromebook node (p31-ark)
- Family device mesh
- Signal relay status
- Bandwidth/latency heatmap

### Deployment
Replaces: `p31-mesh`, `p31-mesh-monitor`, `monitoring`

---

## SHELL 6: BONDING — `bonding.p31ca.org` — Shipped Game

**Source:** `04_SOFTWARE/bonding/` (keep as-is)
**Status:** Shipped March 10, 488 tests, live. NOT folded into Arcade.
**Domain:** bonding.p31ca.org (already canonical)

BONDING is the flagship molecular chemistry game. It has its own identity, its own test suite, its own multiplayer relay. It's a product, not a feature of the arcade.

ArcadeSurface in PHOS links to both:
- `bonding.p31ca.org` → BONDING (molecular chemistry)
- `arcade.p31ca.org` → Arcade (family gaming OS with 9+ games)

---

## WHAT STAYS STANDALONE (NOT FOLDED INTO SHELLS)

These have different users, different auth, or different purposes:

| App | Domain | Why it stays |
|-----|--------|-------------|
| **BONDING** | bonding.p31ca.org | Shipped product, 488 tests |
| **phosphorus31.org** | phosphorus31.org | Static institutional site |
| **Chromatica** | chromatica.pages.dev | Arthritis workstation — different user |
| **p31-vibe-studio** | p31-vibe-studio.pages.dev | AI coding — dev tool |
| **lighthouse-edu** | lighthouse-edu.pages.dev | Private teaching — separate auth |
| **spoon-calculator** | spoon.p31ca.org | Quick utility |
| **maid-manager** | maid-manager.pages.dev | Carrie's app — different user |
| **culinary-matria** | culinary-matria.pages.dev | Family recipes — different user |
| **cheomatica** | cheomatica.pages.dev | Christyn's app — different user |
| **pharma-cortex** | pharma-cortex.pages.dev | Ashley's app |
| **pharma-nexus** | pharma-nexus.pages.dev | White-label scaffold |
| **aura-manager** | aura-manager.pages.dev | Maegan's app |
| **fence-pro** | fence-pro.pages.dev | Matthew's app |
| **used-marketplace** | used-marketplace.pages.dev | Shop — customer auth |
| **retro-vault** | retro-vault-8tk.pages.dev | Personal marketplace |
| **cashpilot** | cashpilot-drp.pages.dev | Finance utility |
| **chump-dashboard** | chump.p31ca.org | Tier S financial infra |
| **p31ca** | p31ca.org | Shell router / gateway |
| **shelter** | shelter.p31ca.org | PWA shelter (p31-pwa) |

---

## DUPLICATES TO DELETE

Confirmed duplicates with no unique content. Delete from CF AND source:

| # | Delete | Reason |
|---|--------|--------|
| 1 | `p31-geodesic-builder` | Vite default template, empty |
| 2 | `p31-geodesicbuilder` | Duplicate spelling |
| 3 | `p31-strategyboard-1-` | Accidental duplicate |
| 4 | `p31-monorepo` / `p31-monorerepo` | Both empty shells |
| 5 | `p31-warehouse` / `p31-warehouse-app` | Duplicates of warehouse-aj |
| 6 | `p31-welcome-packages` | Stale scaffold |
| 7 | `01_Core_Projects/` entire dir | 9 empty game stubs |
| 8 | `p31-arcade` | Superseded by arcade.p31ca.org |
| 9 | `p31-arcade-prod` | Lean duplicate |
| 10 | `p31-arcade-rebuilt` | Empty monorepo shell |
| 11 | `p31-arcade-shared` | Becomes package |
| 12 | `p31-arcade-theme` | Becomes package |
| 13 | `p31-command-center` | Fold into ECOSHELL |
| 14-24 | All `p31-*` dupes of standalone apps | (aura, pharma, cheo, culinary, fence, lighthouse, fantasy, used-market, shakeback, warehouse, maid) |
| 25 | `p31-katen-pos` | Superseded by ForgeSurface POS |
| 26 | `p31-syllabus` | Use Lighthouse EDU |
| 27 | `p31-bonding-icons` | Becomes shared package only |
| 28 | `p31ca-v2` | Stale backup |
| 29 | `sovereign-geodesic-preview` | Superseded |
| 30 | `node-zero` CF project | NodeZeroSurface in PHOS + MESH |
| 31 | `monitoring` | Superseded by MESH |
| 32 | `companion` | Superseded by WILLOW |
| 33 | `auth` | Superseded by PHOS auth |
| 34 | `book` / `apps/book` | Stale |
| 35 | `mother-nature-book` | Stale |
| 36 | `go-kc-landing` | Stale |
| 37 | `phenix` | Duplicate of p31-phenix |
| 38 | `p31-shelter` | p31-pwa already at shelter.p31ca.org |
| 39 | `interstitial-hub-formerly-merge` | Stale rename artifact |
| 40 | `simplex-email` / `simplex-v7` | Become workers, not standalone pages |

---

## REPO STRUCTURE (CLEAN)

```
p31-andromeda/
├── apps/
│   ├── willow/              ← 02_Client_or_Misc/ph-os/ renamed
│   └── (remove apps/book/)
│
├── phos/                    ← The Cognitive Sanctuary (15 surfaces)
│   ├── src/surfaces/        ← Hearth, Sanctuary, Archive, Forge, Ledger, etc.
│   ├── workers/             ← phos-api, phos-atmosphere, forge-edge
│   └── ...
│
├── shells/                  ← The 4 non-PHOS, non-Bonding shells
│   ├── arcade/              ← p31-arcade-hub + p31-arcade-monolith merged
│   │   ├── src/
│   │   │   ├── App.tsx      ← Unified hub (identity, spoon, spectate, bounties)
│   │   │   ├── components/  ← GameLauncher, FamilySpectate, EarningsStack, SENTINEL
│   │   │   ├── games/       ← 9 game engines from monolith (3 tiers each)
│   │   │   ├── sdk/         ← ArcadeSDKv2, UnifiedIdentityManager
│   │   │   └── types/       ← Shared types
│   │   └── wrangler.toml    ← arcade.p31ca.org
│   ├── ecosystem/           ← App hub / dev dashboard (NEW)
│   └── mesh/                ← p31-mesh-monitor inflated (K4 topology viz)
│
├── packages/
│   ├── arcade/              ← Shared arcade code
│   │   ├── identity/        ← from p31-arcade-shared
│   │   ├── theme/           ← from p31-arcade-theme
│   │   └── design-system/   ← GameFrame, ReturnRibbon, tokens
│   ├── family-apps/         ← culinary-matria, warehouse-aj, maid-manager, cheomatica
│   ├── p31-physics/         ← Shared game engines
│   ├── p31-bonding-icons/   ← Shared icons (NOT standalone deploy)
│   └── ...
│
├── workers/                 ← All CF Workers
│   ├── love-ledger/
│   ├── discord-alerter/
│   ├── p31-signaling/
│   ├── p31-mcp-server/
│   ├── tetra-hub/
│   ├── p31-ecosystem-bridge/
│   ├── node-one-bridge/
│   └── mesh-living-core/
│
├── 04_SOFTWARE/
│   ├── bonding/             ← Shipped game (keep as-is)
│   ├── spaceship-earth/     ← Reference impl for 3D cockpit surface in PHOS
│   ├── genesis-gate/        ← Deployed v4.1.0 (keep)
│   ├── chump-dashboard/     ← Tier S infra (keep)
│   ├── p31-hearing-ops/     ← ADA ops (keep)
│   └── ...                  ← (rest stays)
│
├── phosphorus31.org/        ← Static institutional site (keep)
│
└── [DELETE: all /p31-* top-level garbage]
    [DELETE: 01_Core_Projects/]
    [REDISTRIBUTE: 02_Client_or_Misc/ → apps/, shells/, keep phosphorus31-org]
```

---

## P31CA.ORG — THE SHELL ROUTER

`p31ca.org` stops being a product. It becomes the gateway:

```
┌─────────────────────────────────────────────────┐
│              P31 — Choose Your Shell            │
│                                                 │
│   [🧠 PHOS]       Adult operating surface      │
│   [🌱 WILLOW]     Kids companion               │
│   [🎮 ARCADE]     Family gaming OS             │
│   [⚗️ BONDING]    Molecular chemistry game     │
│   [🔧 APPS]       All tools & ecosystem        │
│   [📡 MESH]       Network & nodes              │
│   [🏛️ ABOUT]      phosphorus31.org             │
│                                                 │
│   GRAY_ROCK: [OFF / ON]                         │
└─────────────────────────────────────────────────┘
```

Each shell has a persistent nav node to hop between shells. Auth is shell-specific.

---

## EXECUTION ORDER

### Phase 1: Clean Up (Day 1)
1. Delete 40+ duplicate/stale CF Pages projects
2. Delete `01_Core_Projects/` source
3. Delete stale top-level dirs (p31-monorepo, p31-monorerepo, p31-welcome-packages, p31-warehouse, p31-warehouse-app, p31-geodesicbuilder, p31-strategyboard-1-)
4. Update `pnpm-workspace.yaml` to remove dead paths
5. Delete stale CF Pages: book-1rw, mother-nature-book, go-kc-landing, auth-1g8, companion-d0g, monitoring-c0n

### Phase 2: Rename & Move (Day 1-2)
1. `02_Client_or_Misc/ph-os/` → `apps/willow/`
2. Update wrangler config: `ph-os` project → `willow`
3. Move `p31-arcade-shared/` → `packages/arcade/identity/`
4. Move `p31-arcade-theme/` → `packages/arcade/theme/`
5. Move `p31-bonding-icons/` → `packages/` (already there, remove standalone deploy)
6. Move standalone micro-apps that stay into `apps/` namespace

### Phase 3: Shell — WILLOW (Day 2-3)
1. Kids-only mode: remove any adult surfaces from `apps/willow/`
2. Big touch targets, high contrast, audio feedback
3. Deploy to `willow.p31ca.org`

### Phase 4: Shell — ARCADE (Day 3-5)
1. Create `shells/arcade/` — merge hub + monolith
2. Hub layer: `UnifiedIdentityManager`, `GlobalSpoonManager`, `SkillBridgeManager`, `SENTINEL`
3. Game layer: 9 games × 3 energy tiers from monolith
4. Spectate: SSE from chump-edge worker
5. Deploy to `arcade.p31ca.org`

### Phase 5: Shell — MESH (Day 5-6)
1. Inflate `p31-mesh-monitor` → full K4 topology viz
2. Node fleet status, signal relay, device mesh
3. Deploy to `mesh.p31ca.org`

### Phase 6: Shell — ECOSYSTEM (Day 6-7)
1. New `shells/ecosystem/` app — every deployable gets a card
2. Links out to correct shell/domain
3. Deploy to `ecosystem.p31ca.org`

### Phase 7: PHOS Polish (Day 7-8)
1. All 15 surfaces: SANCTUARY spoon-state behavior
2. Panic eject → GRAY_ROCK across all surfaces
3. Wire chump-dashboard API → LedgerSurface
4. Wire Forge inventory → warehouse-aj PGLite bridge
5. ArcadeSurface → portal to arcade.p31ca.org (not duplicate)
6. `phos.p31ca.org` = Cognitive Sanctuary complete

---

## BEFORE vs AFTER

| Metric | Before | After |
|--------|--------|-------|
| CF Pages projects | 82 | ~20 |
| wrangler.toml files | 100+ | ~20 |
| Top-level source dirs | 50+ | 5 (phos, shells, packages, workers, 04_SOFTWARE) |
| Duplicate deployments | 40+ | 0 |
| Entry points | "Where is everything?" | 6 clear shells |
| Arcade codebases | 4 (hub, monolith, prod, rebuilt) | 1 (shells/arcade/) |

The Fortune 1 company runs on 6 entry points. Everything else is a surface, a worker, or a package. Nothing standalone for its own sake.
