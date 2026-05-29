# PH-OS — Personal Companion Operating System

The personal layer of the P31 ecosystem. PH-OS is a bio-state aware, voice-capable companion interface that integrates your Personal Tetrahedron, Family Cage, and bio-monitoring into a cohesive operating system.

## What PH-OS Is

PH-OS is designed to be the **personal interface layer** — what you use daily to:
- Monitor your bio-state (spoons, calcium, HRV)
- Navigate your Personal K4 Tetrahedron
- Connect with your Family Cage
- Receive companion support from PHOS
- Control QMU theming across all P31 surfaces

## Architecture

```
PH-OS
├── Bio-State Monitor (real-time)
├── Personal Tetrahedron (3D visualization)
├── Family Cage Interface
├── PHOS Companion (voice/chat)
├── QMU Visualizer (theme control)
└── Quick Actions (passport, love ledger, emergency)
```

## Tech Stack

- **React 18** — UI framework
- **Three.js + R3F** — 3D K4 visualization
- **Zustand** — State management
- **Framer Motion** — Animations
- **Vite** — Build tool
- **Tailwind CSS** — Styling

## QMU Integration

PH-OS is deeply integrated with the Quantum Material You system:

```typescript
// Access QMU state
const qmuState = useBioStore.getState().getQMUState();
// 'normal' | 'low' | 'critical'

// QMU affects:
// - Animation speed (motion factor)
// - Color saturation (chroma level)
// - Interface complexity
// - Companion check-in frequency
```

## Bio-State Store

```typescript
interface BioState {
  spoons: number;        // 0-1, energy level
  calcium: number;       // mg/dL, critical for E20.9
  hrv: number;          // ms, stress indicator
  trend: 'improving' | 'stable' | 'declining';
}
```

## Mesh Store

```typescript
interface MeshState {
  connected: boolean;
  vertices: Vertex[];   // Family members
  edges: Edge[];        // Relationships + love ledger
}
```

## Gray Rock Protocol

When calcium ≤ 7.5 mg/dL:
- Interface switches to grayscale
- Motion reduced to minimum
- Emergency contacts auto-notified
- PHOS shifts to "support mode"

```typescript
if (calcium <= 7.5) {
  document.documentElement.classList.add('p31-gray-rock');
  // Emergency mode activated
}
```

## Screens

1. **Home** — Daily overview, quick actions, recommendations
2. **Tetrahedron** — 3D K4 visualization of self/work/family/health
3. **Family Cage** — Member status, love ledger, bio-sync
4. **Bio-State** — Detailed metrics, trends, manual entry

## PHOS Companion

Voice/chat companion that:
- Checks in based on bio-state (more frequent when low)
- Answers questions about your data
- Provides grounding exercises
- Escalates to emergency contacts when needed

## Development

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build
```

## Integration with p31ca.org

PH-OS is the personal layer; p31ca.org is the technical hub. They share:
- Bio-state via `localStorage` (p31:passport:state)
- QMU theming engine
- Mesh connection

Navigate between them:
- PH-OS → Tech Hub: Click "Technical Hub" in sidebar
- Tech Hub → PH-OS: Use PHOS launcher

## License

MIT — P31 Labs
