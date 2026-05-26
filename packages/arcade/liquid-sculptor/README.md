# P31 Liquid Sculptor

A **10,000 particle fluid simulation** built with CPU-side `Float32Arrays`, custom additive blending shaders, and PGLite for decentralized state persistence.

## Key Technical Achievements

### Zero Post-Processing (Chromebook-Optimized)
- **NO** true HDR bloom
- **NO** GPGPU/FBO ping-pong textures
- **NO** external image assets

Instead: Custom Canvas-generated bloom textures + additive blending shaders that maintain **60fps on low-end devices**.

## Architecture

### CPU-Side Physics (NOT WebGL GPGPU)
```typescript
// Raw Float32Arrays for 10,000 particles
positions = new Float32Array(10000 * 3);  // x, y, z
velocities = new Float32Array(10000 * 3);  // vx, vy, vz
colors = new Float32Array(10000 * 3);      // r, g, b
properties = new Uint8Array(10000);         // type: Cyan/Phos/Orchid
```

Physics loop runs in `useFrame`, updating arrays directly:
```typescript
for (let i = 0; i < PARTICLE_COUNT; i++) {
  // Apply gravity
  velocities[i3 + 1] += gravity;
  
  // Apply drag
  velocities[i3] *= drag;
  
  // Update positions
  positions[i3] += velocities[i3];
  
  // Love Economy: Color mixing when crossing center
  if (Math.abs(positions[i3]) < 4.0) {
    colors[i3] = lerp(colors[i3], ORCHID.r, mixFactor);
  }
}

// Notify Three.js
geometry.attributes.position.needsUpdate = true;
geometry.attributes.color.needsUpdate = true;
```

### Procedural Bloom (Zero Texture Load)
```typescript
// Canvas-generated soft radial gradient
const bloomTexture = generateBloomTexture(128, 1.0);

// Custom shader with additive blending
blending: THREE.AdditiveBlending,
depthWrite: false,
transparent: true
```

### Event Sourcing (Not Particle Sync)
Don't sync 10,000 particle positions over network. Sync **events**:

```typescript
// Sync this (tiny):
{ type: 'DRAG_FORCE', x: 0.5, y: -0.2, radius: 8, strength: 2 }

// Not this (huge):
{ positions: [10000 floats], colors: [10000 floats] }
```

Peers re-simulate deterministically using the same `prng_seed`.

## Spoon Theory UI

| Level | Spoons | Duration | Features |
|-------|--------|----------|----------|
| **Low** | 1 | 5 min | Gallery viewing, spectate replays |
| **Medium** | 3 | 15 min | Guided pouring, gravity simulation |
| **High** | 6 | 30 min | Multi-touch sculpting, force fields |

## Love Economy Visuals

| Trigger | Effect |
|---------|--------|
| Cyan + Phos particles cross center | Gradual blend to Orchid color |
| Love Vortex activated | Heart-shaped parametric attractor |
| GAME_WIN | Sweep lights Cyan → Phos |

## Database Schema (PGLite)

- **sculpture_sessions**: `prng_seed` for deterministic replay
- **sculpt_events**: Append-only event log (POUR, DRAG_FORCE, TRIGGER_VORTEX)
- **sculpture_snapshots**: Saved Float32Array states
- **sculpture_gallery**: Public shared sculptures

## The Care Vortex

When triggered, particles are pulled into a **mathematical heart shape**:

```typescript
const t = (i / count) * Math.PI * 2 + vortexTime;
const heartX = 16 * Math.pow(Math.sin(t), 3) * 0.1;
const heartY = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * 0.1;

// Pull velocity towards heart coordinates
vx += (heartX - px) * pullStrength;
vy += (heartY - py) * pullStrength;
```

## Project Structure

```
src/
├── utils/
│   └── bloomTexture.ts        # Procedural radial gradients
├── engine/
│   ├── Mulberry32.ts          # Seeded PRNG
│   └── FluidPhysics.ts        # CPU-side 10k particle physics
├── db/
│   ├── PGLiteProvider.tsx     # Event sourced schema
│   └── hooks.ts               # Live queries
├── components/
│   ├── FluidCanvas.tsx        # R3F + custom shader
│   ├── SpoonRouter.tsx        # Energy selection
│   ├── LowEnergyView.tsx      # Gallery viewing
│   ├── MediumEnergyView.tsx   # Guided pouring
│   └── HighEnergyView.tsx     # Active sculpting
└── App.tsx
```

## Commands

```bash
cd p31-liquidsculptor
npm install
npm run dev
```

## Performance Targets

- **60 FPS** on Chromebook Celeron
- **10,000 particles** at 60fps
- **16ms frame time** budget
- **Additive blending** without post-processing

## P31 Canon Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Cyan | `#00f5ff` | Left emitter, Flow |
| Phos | `#39ff14` | Right emitter, Growth |
| Orchid | `#da70d6` | Mixed center, Care Vortex |

## License

MIT - P31 Labs
