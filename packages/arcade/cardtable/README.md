# P31 Card Table

A decentralized, offline-first, P2P card game engine with premium **Glassmorphism** aesthetic. Built with **PGLite**, **WebRTC**, procedural **HTML5 Canvas textures**, and **React Three Fiber**.

## Architecture

### Zero External Assets
All card faces, backs, chips, and table textures are generated procedurally via the HTML5 Canvas API. No image files are loaded.

### Tech Stack
- **Vite** + **React** + **TypeScript**
- **TailwindCSS** with glassmorphism utilities
- **React Three Fiber** (R3F) for 3D rendering
- **PGLite** (in-browser PostgreSQL via WASM)
- **WebRTC** for P2P multiplayer
- **CRDT**-enabled event sourcing

### Spoon Theory UI

| Level | Spoons | Duration | Features |
|-------|--------|----------|----------|
| **Low** | 1 | 5 min | Claim daily rewards, spectate replays |
| **Medium** | 3 | 15 min | 3D Solitaire vs AI, paused timing |
| **High** | 6 | 30 min | Live WebRTC P2P with chip physics |

### Database Schema (PGLite)

- **card_sessions** - CRDT-enabled game sessions with PRNG seeds
- **session_players** - Peer participants with hands and chip counts
- **game_events** - Append-only event log (DEAL, PLAY_CARD, BET, COOP_LINK)
- **async_card_matches** - Decentralized challenge queue
- **daily_rewards** - Low-energy async collection

## Key Features

### Phase 1: Tech Stack ✅
- Vite + React + TypeScript
- Tailwind with glassmorphism (`glass-card`, `glass-button`)
- PGLite with IndexedDB persistence
- COOP/COEP headers configured

### Phase 2: Database ✅
- Event Sourced SQL schema
- `prng_seed` for deterministic shuffling
- `deterministic_hash` on every event
- State reconstruction from event log

### Phase 3: Spoon Theory ✅
- Low: Daily rewards, spectate
- Medium: 3D Solitaire vs AI
- High: WebRTC live P2P

### Phase 4: Procedural 3D ✅
- **TableLighting**: SpotLight with soft shadows
- **ProceduralTurf**: Canvas-generated felt texture
- **PlayingCard**: Multi-material BoxGeometry with front/back textures
- **CasinoChip**: Physics-enabled cylinders with CPU simulation
- **FormationLines**: Drei `<Line>` for Love Economy visuals

### Phase 5: Interaction ✅
- Raycasting-based card dragging
- Micro-impulse chip physics (gravity, bounce, friction)
- `useFrame` lerp interpolation for smooth animations

### Phase 6: WebRTC P2P ✅
- **DeterministicDeck**: Mulberry32 PRNG guarantees identical shuffle
- **WebRTCSync**: DataChannel for real-time play
- **Love Economy Triggers**: `COOP_LINK_REQUEST` → orchid glow, `GAME_WIN` → sweep lights
- Event log written to PGLite on both peers

## Project Structure

```
src/
├── utils/
│   └── textureGenerator.ts    # Procedural Canvas textures (ZERO assets)
├── engine/
│   ├── Mulberry32.ts          # Seeded PRNG
│   └── Deck.ts                # Deterministic deck + Fisher-Yates
├── network/
│   └── WebRTCSync.ts          # P2P WebRTC + signaling
├── db/
│   ├── PGLiteProvider.tsx     # Card game schema
│   └── hooks.ts               # Live queries
├── components/
│   ├── CardTable.tsx          # Main R3F scene
│   ├── SpoonRouter.tsx        # Energy selection
│   ├── LowEnergyView.tsx      # Rewards, spectate
│   ├── MediumEnergyView.tsx   # 3D Solitaire
│   └── HighEnergyView.tsx     # WebRTC P2P
└── App.tsx
```

## Procedural Texture Generation

```typescript
// Zero external assets - all generated at runtime
const frontTexture = generateCardFrontTexture('A', 'spades');
const backTexture = generateCardBackTexture(); // P31 branded
const chipTexture = generateChipTexture('#feca57', 100);
const tableTexture = generateTableTexture();
```

## Deterministic Shuffling

```typescript
// All peers use same seed = identical deck order
const deck = createShuffledDeck(sharedSeed);
deck.draw(5); // Same cards on all peers without network transfer
```

## WebRTC Message Flow

1. Player A plays card
2. Animate locally in R3F
3. Write to local PGLite
4. Send JSON payload over DataChannel
5. Player B receives → writes to their PGLite
6. React reactivity triggers B's 3D animation

## Love Economy Visuals

| Event | Visual Effect |
|-------|---------------|
| `COOP_LINK_REQUEST` | Orchid pointLight flood |
| `GAME_WIN` | Cyan + Phos sweepLights |
| Formation Lines | Drei `<Line>` between cards |

## Commands

```bash
cd p31-cardtable
npm install
npm run dev
```

## Glassmorphism Classes

```css
.glass-card    /* bg-white/5 + backdrop-blur + border-white/10 */
.glass-button  /* hover states + transitions */
```

## P31 Canon Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Phos | `#39ff14` | W.J. turn, victory sweep |
| Cyan | `#00f5ff` | S.J. turn, chip value |
| Orchid | `#da70d6` | Co-op mode, formation lines |
| Gold | `#feca57` | Chips, pot value |

## License

MIT - P31 Labs
