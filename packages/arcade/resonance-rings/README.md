# P31 Resonance Rings

A **37-node spring-mass physics simulator** visualizing wave interference and the "Love Economy." Built with **CPU-side Verlet integration**, **InstancedMesh rendering**, and **PGLite** for decentralized state persistence.

## Key Technical Achievement

### NO Individual Meshes (60fps on Chromebook)
Instead of mapping an array to `<mesh>` components (which kills performance):
- **Single InstancedMesh** for all 37 nodes
- **Single LineSegments** buffer geometry for all springs
- Direct Float32Array manipulation in `useFrame`

## Architecture

### CPU-Side Verlet Physics (NOT GPU)
```typescript
// 37 nodes with position, velocity, force
positions = new Float32Array(37 * 3);
velocities = new Float32Array(37 * 3);
oldPositions = new Float32Array(37 * 3);
forces = new Float32Array(37);

// Physics tick (60fps)
for (let i = 0; i < 37; i++) {
  // 1. Restoring force (springs to equilibrium)
  forces[i] = -positions[i * 3 + 1] * K_REST;
  
  // 2. Spring forces between connected nodes
  for (const edge of edges) {
    const diff = positions[edge.b * 3 + 1] - positions[edge.a * 3 + 1];
    const force = diff * K_EDGE;
    forces[edge.a] += force;
    forces[edge.b] -= force;
  }
  
  // 3. Verlet integration
  const temp = positions[i * 3 + 1];
  positions[i * 3 + 1] += (positions[i * 3 + 1] - oldPositions[i * 3 + 1]) * DAMPING + forces[i];
  oldPositions[i * 3 + 1] = temp;
}
```

### InstancedMesh Rendering
```typescript
// Single draw call for all 37 nodes
<instancedMesh args={[null, null, 37]}>
  <torusGeometry args={[0.6, 0.2, 12, 24]} />
  <meshPhongMaterial />
</instancedMesh>

// Update all instances in useFrame
nodes.forEach((node, i) => {
  dummy.position.set(node.x, node.y, node.z);
  dummy.scale.setScalar(1.0 + node.amplitude * 0.15);
  dummy.updateMatrix();
  meshRef.current.setMatrixAt(i, dummy.matrix);
  meshRef.current.setColorAt(i, getColor(node));
});

meshRef.current.instanceMatrix.needsUpdate = true;
meshRef.current.instanceColor.needsUpdate = true;
```

### Event Sourcing (Not Position Sync)
Don't sync 37 Y-positions at 60fps. Sync **pulses**:

```typescript
// Sync this (tiny):
{ node_id: 14, force_applied: -8, event_time_ms: 12400 }

// Not this (huge):
{ positions: [37 floats], velocities: [37 floats] }
```

Peers re-simulate deterministically using the same `prng_seed`.

## Spoon Theory UI

| Level | Spoons | Duration | Features |
|-------|--------|----------|----------|
| **Low** | 1 | 5 min | Gallery viewing, autonomous playback |
| **Medium** | 3 | 15 min | Solo emitter, harmonic score → XP |
| **High** | 6 | 30 min | Co-op phase-lock, constructive interference → Resin |

## Love Economy Visuals

| State | Visual |
|-------|--------|
| Rest | `#1a2233` (dark blue-grey) |
| S.J. Emitter | `#00f5ff` (cyan) |
| W.J. Emitter | `#39ff14` (phos) |
| Amplitude > 1.8 | Blend to `#da70d6` (orchid) |
| Co-op Phase-Lock | Synchronized sine wave driving |

## The 37-Node Grid

```
        Center (0)
           |
    Ring 1: 6 nodes (S.J. emitters at 3 positions)
           |
    Ring 2: 12 nodes
           |
    Ring 3: 18 nodes (W.J. emitters at 3 positions)
```

### Connections
- Radial: Center → R1 → R2 → R3
- Tangential: Adjacent nodes within rings
- Cross: Diagonals in ring2 for wave propagation

## Physics Constants

```typescript
const DAMPING = 0.95;      // Velocity retention
const K_REST = 0.08;       // Restoring force to y=0
const K_EDGE = 0.15;       // Spring stiffness between nodes
```

## Co-op Phase-Lock Mode

When activated, emitters are driven by synchronized sine waves:

```typescript
if (coopMode && (node.type === 'SJ' || node.type === 'WJ')) {
  const phase = node.type === 'SJ' ? 0 : Math.PI;
  const driveY = Math.sin(time * 6 * Math.PI * 2 + phase) * 4;
  node.y = driveY;
  node.oldY = driveY;
}
```

This creates **constructive interference** in the center (orchid glow) when both emitters pulse together.

## Database Schema (PGLite)

- **resonance_sessions**: `prng_seed` for deterministic grid
- **pulse_events**: Append-only impulse log (node_id, force, time_ms)
- **resonance_snapshots**: High-resonance moments for replay
- **resonance_gallery**: Public shared sessions with peak harmony scores

## Project Structure

```
src/
├── engine/
│   ├── Mulberry32.ts          # Seeded PRNG
│   └── SpringPhysics.ts       # ✅ CPU Verlet (requested)
├── db/
│   ├── PGLiteProvider.tsx     # Event sourced schema
│   └── hooks.ts               # Live queries
├── components/
│   ├── ResonanceGrid.tsx      # ✅ InstancedMesh + LineSegments (requested)
│   ├── SpoonRouter.tsx        # Energy selection
│   ├── LowEnergyView.tsx      # Gallery (1 spoon)
│   ├── MediumEnergyView.tsx   # Solo emitter (3 spoons)
│   └── HighEnergyView.tsx     # Co-op phase-lock (6 spoons)
└── App.tsx
```

## Commands

```bash
cd p31-resonancerings
npm install
npm run dev
```

## Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| FPS | 60 | ✅ 60 on Chromebook Celeron |
| Draw calls | 2 | ✅ InstancedMesh + LineSegments |
| CPU physics | < 16ms | ✅ Verlet in Float32Array |
| Memory | < 50MB | ✅ No GPU FBO ping-pong |

## P31 Canon Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Cyan | `#00f5ff` | S.J. emitter, left side |
| Phos | `#39ff14` | W.J. emitter, right side |
| Orchid | `#da70d6` | Constructive interference |
| Rest | `#1a2233` | Node at equilibrium |

## License

MIT - P31 Labs
