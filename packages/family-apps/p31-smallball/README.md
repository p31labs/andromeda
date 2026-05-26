# P31 Smallball

A decentralized, offline-first, 2.5D isometric baseball management simulation built with **PGLite**, **Event Sourcing**, and **React Three Fiber**.

## Architecture Overview

### Tech Stack
- **Vite** + **React** + **TypeScript**
- **TailwindCSS** with P31 Canon Colors
- **React Three Fiber** (R3F) for 3D rendering
- **PGLite** (in-browser PostgreSQL via WASM)
- **CRDT**-enabled schema for offline sync
- **Event Sourcing** for deterministic replay

### Spoon Theory UI
The application uses a progressive UX pattern based on "Spoon Theory":

| Energy Level | Spoons | Duration | Features |
|--------------|--------|----------|----------|
| **Low** | 1 | 5 min | Scout reports, claim wins, set training focus |
| **Medium** | 3 | 15 min | Timing-based batting practice minigames |
| **High** | 6 | 30 min | Full R3F stadium with Markov simulation |

### Database Schema (PGLite)
- **franchises** - CRDT-enabled team data with resin currency
- **players** - Athletes with base stats and mutations
- **player_stat_mutations** - Append-only event log for stat changes
- **match_history_events** - Deterministic action log with SHA-256 hashes
- **async_match_queue** - Decentralized challenge/response system
- **scout_reports** - Async rewards for low-energy sessions

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone and enter directory
cd p31-smallball

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Server

The Vite dev server requires COOP/COEP headers for PGLite's SharedArrayBuffer:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These are configured in `vite.config.ts`.

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── db/
│   ├── PGLiteProvider.tsx    # Database context & initialization
│   └── hooks.ts              # React hooks for live queries
├── engine/
│   └── MarkovEngine.ts       # Deterministic baseball simulation
├── network/
│   └── MeshSync.ts           # Decentralized sync & crypto verification
├── components/
│   ├── SpoonRouter.tsx       # Energy-level selection
│   ├── LowEnergyView.tsx     # 1-spoon async actions
│   ├── MediumEnergyView.tsx  # 3-spoon minigames
│   └── HighEnergyView.tsx    # 6-spoon R3F stadium
├── App.tsx                   # Root component
└── main.tsx                 # Entry point
```

## Key Features

### Phase 1: Tech Stack Initialization
- Vite + React + TypeScript configured
- PGLite integration with IndexedDB persistence
- Tailwind with P31 Canon colors (Phos, Cyan, Orchid, Gold)

### Phase 2: Database & Event Sourcing
- PostgreSQL schema with CRDT `_crdt_clock` fields
- Append-only mutation tables
- Live query hooks for reactive UI
- Player effective stats via SQL aggregation

### Phase 3: Spoon Theory UI
- Progressive disclosure based on energy level
- Low: Scout reports, claim async wins, set training focus
- Medium: rAF timing-based batting practice
- High: Full R3F isometric stadium

### Phase 4: 2.5D Rendering Engine
- Orthographic camera with `frameloop="demand"`
- Billboard sprites for players (not 3D meshes)
- Instanced crowd system
- Isometric field geometry

### Phase 5: Deterministic Simulation
- Mulberry32 seeded PRNG (no `Math.random()`)
- Logarithmic stat scaling
- Transition matrix pitch resolution
- SHA-256 match verification

### Phase 6: Decentralized Sync
- Match seed fetching (Cloudflare Worker or local fallback)
- Deterministic action logging
- Cryptographic hashing via SubtleCrypto
- Async defensive matchmaking queue

## Deterministic Simulation

The Markov engine uses a **seeded PRNG** to ensure:
- Same seed = same match outcome
- Verifiable replay
- Anti-cheat via hash verification

```typescript
const engine = new MarkovBaseballEngine(seed, playerStats, pitcherAI);
const atBat = engine.resolveAtBat(); // Deterministic!
```

## Database Hooks

```typescript
// Reactive player data
const { players } = usePlayers();

// Effective stats (base + mutations)
const { stats } = usePlayerEffectiveStats(playerId);

// Apply training mutations
const { applyMutation } = useApplyMutation();
await applyMutation(playerId, 'contact', 5, 'training');

// Scout reports
const { reports } = useScoutReports();
const { claim } = useClaimScoutReport();
```

## P31 Canon Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Phos | `#39ff14` | Growth, W.J. palette, success states |
| Cyan | `#00f5ff` | Flow, S.J. palette, active states |
| Orchid | `#da70d6` | Love Economy, co-op, highlights |
| Gold | `#feca57` | CHUMP earnings, resin currency |

## License

MIT - P31 Labs
