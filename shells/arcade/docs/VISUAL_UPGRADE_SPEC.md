# P31 Arcade Visual Upgrade Specification

## Overview

**Target:** Transform 9 arcade games from functional to visually stunning while maintaining 60fps on Chromebook Celeron and iPhone A13.

**Philosophy:** Family-first aesthetics that strengthen the Love Economy through visual cohesion.

---

## Technical Foundation

### Canon Colors (P31 Universal)
```
--phos-green: #39ff14       /* S.J. / Growth / Co-op */
--cyan-vibe: #00f5ff       /* W.J. / Flow / Movement */
--orchid-soul: #da70d6     /* Care / Love Economy */
--chump-gold: #feca57      /* Earnings / Value */
--sentinel-blue: #54a0ff   /* Trust / Safety */
```

### Performance Budget
- **Target:** 60fps @ 720p
- **GPU Memory:** <100MB
- **Load Time:** <3 seconds
- **Draw Calls:** <100 per frame
- **Texture Memory:** 512MB max

### Tech Stack
- **3D:** Three.js r160 (WebGL 2.0)
- **2D:** PixiJS v7 (GPU-accelerated sprites)
- **Assets:** WebP textures, KTX2 compressed, glTF 2.0 models
- **Shaders:** Custom GLSL with fallback materials

---

## Game Upgrade Specifications

### ⚾ Smallball (Phase 1, HIGH)

**Current:** Flat 2D sprites, basic physics

**Target:** 2.5D isometric with crowd parallax

**Implementation:**
- Isometric camera (30° angle, orthographic)
- 3D player models (low-poly, 500 triangles max)
- Crowd layer system:
  - 3 parallax layers (near/mid/far)
  - Procedural crowd sprites (32 variations)
  - React to game events (cheer animations)
- Court surface: Normal-mapped hardwood
- Ball physics: Trail particles (cyan on W.J., phos on S.J.)
- Lighting: Single directional + ambient

**Performance:**
- Draw calls: ~45 (players, court, crowd, UI)
- Poly count: 2K scene max
- Shaders: 2 custom (court, ball trail)

**Love Economy Visuals:**
- Co-op mode: Stadium glows orchid
- Care flow: Heart particles from scorer to sibling
- Avatar cursor: Color-coded baseball cap (cyan/phos)

---

### 🏈 Gridiron (Phase 1, HIGH)

**Current:** Flat sprites, basic AI

**Target:** Broadcast sports aesthetic

**Implementation:**
- Broadcast camera system:
  - Play camera (following ball)
  - Sky cam (overview between plays)
  - Replay cam (cinematic angles)
- Field: 3D turf with grass shader (wind animation)
- Player models: Low-poly with team colors (phos/cyan)
- Weather effects: Particle rain/snow (optional toggle)
- HUD: Broadcast overlay style (yard lines, score bug)

**Performance:**
- Draw calls: ~60 (22 players, field, effects)
- Poly count: 3K scene max
- LOD: Reduced detail for distant players

**Love Economy Visuals:**
- Co-op: Formation lines glow phos/cyan
- Touchdown: Dual-color fireworks (phos + cyan burst)
- Sibling combo: "Teamwork!" floating text

---

### 💧 Liquid Sculptor (Phase 2, HIGH)

**Current:** Basic fluid simulation

**Target:** HDR bloom, 10K particles

**Implementation:**
- Particle system: 10,000 fluid particles
- HDR pipeline: Bloom + tone mapping
- Viscosity shaders: Different "materials" (water, honey, slime)
- Force fields: Visualized as distortion ripples
- Background: Dark gradient with subtle nebula
- Color mixing: CMYK simulation with P31 canon

**Performance:**
- GPU particles via transform feedback
- FBO ping-pong for fluid sim
- Adaptive particle count (5K-10K based on device)

**Love Economy Visuals:**
- Co-op: Split-color fluids (left cyan, right phos)
- Mixing: Orchid where colors blend
- Care flow: Heart-shaped vortex on collaborative sculpt

---

### 🌊 Resonance Rings (Phase 2, HIGH)

**Current:** Basic node graph

**Target:** Oscillating spring network

**Implementation:**
- Spring-mass network physics
- Oscillator visualization:
  - Amplitude = node size
  - Frequency = color pulse rate
  - Phase = rotation offset
- Wave interference patterns (constructive/destructive)
- Sound wave visualization: Ripple propagation
- Grid: Radial layout with elastic connections

**Performance:**
- 50 nodes max, 200 springs
- GPU instancing for nodes
- Verlet integration (CPU)

**Love Economy Visuals:**
- Co-op: Two emitters with phase-locked waves
- Harmony: Orchid resonance where waves align
- Sibling out-of-sync: Gentle pulsing reminder

---

### 🪐 Orbital Drift (Phase 2, HIGH)

**Current:** Simple orbits

**Target:** Starfield, atmosphere shaders

**Implementation:**
- Starfield: 1000 point stars with parallax
- Planet shaders:
  - Atmosphere: Fresnel rim lighting
  - Surface: Procedural noise (rocky/gas)
  - Rings: Transparent geometry with shadow
- Gravity wells: Visual distortion (lensing effect)
- Orbit trails: Fading path lines
- Camera: Follow spacecraft or free orbit

**Performance:**
- Point stars via THREE.Points
- LOD planets (simple geometry distant)
- Atmosphere shader (single custom)

**Love Economy Visuals:**
- Co-op: Tether line between spacecraft
- Orbit sync: Binary star system visual
- Care flow: Energy transfer beam (cyan→phos or reverse)

---

### 🃏 Card Table (Phase 3, MEDIUM)

**Current:** Minimalist flat design

**Target:** Glass morphism refresh

**Implementation:**
- Table: Frosted glass surface (CSS/WebGL blur)
- Cards: 3D flip with motion blur
- Light: Dynamic shadows from virtual "window"
- Chips: Physics-based stacking (micro-interactions)
- Background: Subtle gradient with noise

**Performance:**
- CSS backdrop-filter for glass (fallback to solid)
- Card flip: CSS 3D transform
- Physics: Micro-impulse only, not full sim

**Love Economy Visuals:**
- Co-op: Shared hand glows orchid
- Win: Cards fan with dual-color highlights
- Sibling turn: Gentle pulse on their cards

---

### ♟️ Strategy Board (Phase 3, MEDIUM)

**Current:** Minimalist flat

**Target:** Geometric board beauty

**Implementation:**
- Board: 3D marble/stone texture
- Pieces: Low-poly geometric forms (cone, sphere, cube)
- Movement: Smooth interpolation with arc
- Capture: Particle dissolution effect
- Think AI: Subtle thought bubble visualization
- Ambient: Dust particles in light shafts

**Performance:**
- 32 pieces max, instanced rendering
- Board: Single plane with normal map
- Particles: 50 max for captures

**Love Economy Visuals:**
- Co-op: Shared strategy overlay
- Good move: Both pieces glow briefly
- Checkmate: Victory fireworks (phos + cyan)

---

### 🏗️ Geodesic Builder (Phase 4, MEDIUM)

**Current:** 3D basic

**Target:** Avatar cursors, build animations

**Implementation:**
- Avatar cursors:
  - S.J.: Floating cyan geometric shape (icosahedron)
  - W.J.: Floating phos geometric shape (dodecahedron)
- Build animation: Piece growth from center
- Structure glow: Completion pulse through connected pieces
- Physics: Gentle sway in "wind" (Maxwell rigidity reference)
- Background: Geodesic dome wireframe environment

**Performance:**
- Avatar instancing
- Build: Scale animation (no physics)
- Max 50 shapes (per GeodesicRoom DO limit)

**Love Economy Visuals:**
- Collaborative build: Mixed-color pieces where hands meet
- Structure completion: Entire build pulses orchid
- Care flow: Heart-shaped particles during build

---

### 🧲 Magnetic Poetry (Phase 3, LOW)

**Current:** Functional drag-drop

**Target:** Neon fridge magnet aesthetic

**Implementation:**
- Magnets: 3D extruded text with rounded corners
- Fridge: Brushed metal surface with reflections
- Physics: Magnetic snap (visualized with field lines)
- Lighting: Kitchen environment map
- Poem complete: Camera pan + soft glow

**Performance:**
- 50 word magnets max
- Simple box geometry with bevel
- Reflection: MatCap material (cheap)

**Love Economy Visuals:**
- Co-op: Word palette color-coded (cyan/phos)
- Poem: Final composition in mixed colors
- Share: Screenshot with family watermark

---

## Shared Systems

### 1. Co-op Border Glow System
```glsl
// Phos green pulse around screen edge when in co-op
uniform float time;
uniform vec3 color; // phos-green or cyan-vibe

float pulse = sin(time * 3.0) * 0.5 + 0.5;
vec3 glow = color * pulse * 0.3; // 30% max intensity
```

### 2. Care Flow Particles
- Heart-shaped particles (low-poly model)
- Trail system: Source → Destination
- Emission: On score/win/collaboration
- Colors: Orchid trail, phos/cyan source

### 3. Avatar Cursor System
- Floating geometric shape above player input
- S.J.: Icosahedron, cyan
- W.J.: Dodecahedron, phos
- Animation: Gentle bob + rotation

### 4. CHUMP Earnings Overlay
```
┌──────────────────────────────────────────────┐
│  💰 $480/mo fund    [progress bar]    45cr   │
│  ├── CHUMP: $450  ████████████████████░░░  │
│  └── Arcade: $30  ██░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────┘
```
- Glass morphism: backdrop-filter blur(10px)
- Micro-animation: Credit increase flash
- Position: Corner overlay, dismissible

### 5. Dual-Color Victory Fireworks
- Particle burst with two color streams
- Phos + Cyan mix to orchid at center
- GPU particle system (Three.js Points)
- Trigger: Win state, completion, milestone

---

## Phase Roadmap

### Phase 1 (Weeks 1-2): Flagship Sports
- Smallball: Isometric engine, crowd system
- Gridiron: Broadcast camera, field shaders
- **Deliverable:** Playable demo both games

### Phase 2 (Weeks 3-4): Physics Wonders
- Liquid Sculptor: HDR pipeline, particle sim
- Resonance Rings: Spring network, oscillation viz
- Orbital Drift: Atmosphere shaders, starfield
- **Deliverable:** Physics suite with Love Economy FX

### Phase 3 (Week 5): UI Refresh
- Card Table: Glass morphism, 3D flip
- Strategy Board: Geometric pieces, animations
- Magnetic Poetry: Neon magnets, fridge aesthetic
- **Deliverable:** Polished casual games

### Phase 4 (Week 6): Collaboration
- Geodesic Builder: Avatar cursors, build animations
- Co-op system integration all games
- **Deliverable:** Full sibling co-op experience

### Phase 5 (Weeks 7-8): Optimization
- Chromebook Celeron validation
- iPhone A13 testing
- 60fps lock verification
- **Deliverable:** Production-ready arcade

---

## Performance Validation

### Chromebook Celeron
- Target: 30fps minimum, 60fps preferred
- Fallback: Reduce particle count by 50%
- Fallback: Disable HDR/bloom
- Fallback: Simplified shadows

### iPhone A13
- Target: 60fps locked
- Metal API via Three.js
- Adaptive resolution (720p native)

### Android Mid-range
- Target: 30fps minimum
- Texture quality: Medium
- Effects: Selective enable

---

## Asset Pipeline

### Export Settings
- **Textures:** WebP, 80% quality, 1K/2K sizes
- **3D Models:** glTF 2.0, Draco compression
- **Audio:** Ogg Vorbis, 128kbps
- **Fonts:** WOFF2, subset for arcade only

### CDN Structure
```
assets.p31ca.org/arcade/
├── smallball/
│   ├── models/      (*.glb)
│   ├── textures/    (*.ktx2, *.webp)
│   └── shaders/     (*.glsl)
├── gridiron/
├── shared/
│   ├── particles/   (heart, star textures)
│   ├── fonts/       (arcade font family)
│   └── shaders/     (common utilities)
└── ui/
    ├── glass/       (glass morphism sprites)
    └── icons/       (game icons, 48px-512px)
```

---

## Reference Inspiration

- **Osmos:** Ambient fluid aesthetics, soft glow
- **Monument Valley:** Isometric beauty, impossible geometry
- **Tetris Effect:** Particle choreography, synesthesia
- **Alto's Odyssey:** Flow state visuals, parallax depth

---

## Success Metrics

1. **Performance:** 60fps maintained on target devices
2. **Engagement:** Session length increase 20%
3. **Co-op:** Spectate mode adoption 40%
4. **Family:** Parent dashboard reports positive feedback
5. **Technical:** Zero memory leaks, <3s load times

---

**Document Status:** Draft v1.0
**Owner:** P31 Visual Team
**Review:** Weekly during Phase execution
