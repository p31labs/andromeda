# P31 Gridiron

A decentralized, offline-first, 5v5 broadcast-style American football management simulation built with **PGLite**, **Event Sourcing**, **CRDTs**, and **React Three Fiber**.

## Architecture

### Tech Stack
- **Vite** + **React** + **TypeScript**
- **TailwindCSS** with P31 Canon Colors + turf colors
- **React Three Fiber** (R3F) for 3D broadcast view
- **PGLite** (in-browser PostgreSQL via WASM)
- **CRDT**-enabled schema for offline sync
- **Event Sourcing** for deterministic replay

### Spoon Theory UI
Energy-based progressive UX pattern:

| Level | Spoons | Duration | Features |
|-------|--------|----------|----------|
| **Low** | 1 | 5 min | Injury reports, box scores, player rest/film study |
| **Medium** | 3 | 15 min | QB accuracy timing drills (rAF canvas) |
| **High** | 6 | 30 min | Full R3F broadcast with play-calling |

### Database Schema (PGLite)

#### 5v5 Roster
- **franchises** - CRDT-enabled teams with resin currency
- **players** - 5 positions: QB, WR, RB, LB, CB, DL with stats
- **playbooks** - Formation-based plays with route vectors
- **play_history_events** - Deterministic play-by-play log
- **matches** - Async decentralized challenges
- **injury_reports** - Low-energy management view

## Getting Started

### Install & Run

```bash
cd p31-gridiron
npm install
npm run dev
```

### Development Notes
- Vite dev server configured with COOP/COEP headers for PGLite SharedArrayBuffer
- `frameloop="demand"` preserves battery in R3F
- Procedural turf generated via CanvasTexture (zero external assets)

## Project Structure

```
src/
├── db/
│   ├── PGLiteProvider.tsx    # Database context + Gridiron schema
│   └── hooks.ts              # Live queries for players, injuries, playbooks
├── engine/
│   ├── Mulberry32.ts         # Deterministic PRNG
│   └── GridironEngine.ts     # 5v5 spatial state machine
├── network/
│   └── MeshSync.ts           # Async matchmaking + hash verification
├── components/
│   ├── SpoonRouter.tsx       # Energy-level selection
│   ├── LowEnergyView.tsx     # Roster & injury management
│   ├── MediumEnergyView.tsx  # QB timing drills
│   └── HighEnergyView.tsx    # R3F broadcast stadium
├── App.tsx
└── main.tsx
```

## Key Features

### Phase 1: Tech Stack ✅
- Vite + React + TypeScript
- Tailwind with turf colors (`turfDark`, `turfLight`)
- PGLite with IndexedDB persistence
- R3F + Drei for 3D

### Phase 2: Database ✅
- 5v5 roster schema (QB, WR, RB, LB, CB, DL)
- Playbooks with spatial route vectors
- Play history events with deterministic hashes
- Injury reports for low-energy UX
- Player effective stats view (XP scaling)

### Phase 3: Spoon Theory ✅
- **Low**: Injury reports, async results, rest/film study buttons
- **Medium**: rAF-based QB timing drill (windup → throw → result)
- **High**: R3F stadium with procedural turf, camera switching

### Phase 4: Broadcast Rendering ✅
- `OrthographicCamera` with `frameloop="demand"`
- Procedural CanvasTexture field (yard lines, end zones)
- `Billboard` sprites for 5v5 players
- Formation lines (Love Economy) using `<Line>` component
- Camera rig: BROADCAST / SKY / ENDZONE modes

### Phase 5: Gridiron Engine ✅
- `Mulberry32` seeded PRNG
- Spatial state machine: PRE_SNAP → ACTIVE → PASS_IN_AIR → TACKLE_RESOLUTION
- Pass rush resolution (OL vs DL)
- Route running vs coverage logic
- Break tackle resolution with YAC

### Phase 6: MeshSync ✅
- Match seed fetching (Cloudflare Worker or local)
- Play-by-play logging with SHA-256 hashes
- `generateMatchHash()` for verification
- Async defensive match queue
- Anti-cheat: headless replay verification

## Deterministic Simulation

```typescript
const engine = new GridironEngine(seed, offense, defense, lineOfScrimmage);
const result = engine.simulatePlay(offPlay, defPlay);
// Same seed + same plays = same result (verifiable replay)
```

## Game Phases

1. **PRE_SNAP**: Formation alignment
2. **ACTIVE**: Ball snapped, pass rush begins
3. **PASS_IN_AIR**: Route resolution, coverage checks
4. **TACKLE_RESOLUTION**: Contact and YAC calculation
5. **COMPLETE**: Final outcome with hash

## P31 Canon Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Phos | `#39ff14` | Growth, opponent defense |
| Cyan | `#00f5ff` | Flow, P31 offense |
| Orchid | `#da70d6` | Care, formation lines, co-op |
| Gold | `#feca57` | Resin, yard markers |
| turfDark | `#1e3f12` | Field base |
| turfLight | `#254c17` | Field stripes |

## License

MIT - P31 Labs
