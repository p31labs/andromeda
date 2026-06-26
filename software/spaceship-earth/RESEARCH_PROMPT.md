# Deep Research: React Three Fiber Dashboard — Production Polish

## Context
We have a React Three Fiber dashboard (`src/`) that renders a K4 tetrahedron (DeltaMesh) as the default view, with MolecularField starfield behind it and a transparent Canvas overlay. Three view modes: DELTA (tetrahedron), POSNER (molecule), DECIDE (icosahedron). Uses `@react-three/drei` for helpers, `zustand` for state, Vite 8 + Rolldown for build. Deployed via Cloudflare Pages.

## Issues to Research

### 1. Animation Architecture — Eliminating Triple-Motion Collisions

Currently THREE animation systems run simultaneously on the same objects:
- `OrbitControls autoRotate` (camera orbit)
- `useFrame` manual group rotation (object spin)
- `<Float>` per-vertex bobbing (position/rotation noise)

This produces disorienting compounded motion. Need research on:
- Best practice: Orbital camera vs object rotation vs vertex animation — when to use each, how to combine without conflict
- For a "live" tetrahedron that reacts to data (entropy drives rotation speed, stage drives color): should rotation be on the object or the camera?
- Is there a canonical R3F pattern like "camera orbits, object idles, Float animates leaves"? Or should we pick ONE system per visual layer?
- https://github.com/pmndrs/react-three-fiber/discussions
- https://docs.pmnd.rs/react-three-fiber/tutorials/animation

### 2. Canvas Transparency — Layering R3F Canvas Over a Separate WebGL Scene

Current: MolecularField (independent WebGL renderer, z-index 0, opaque) + R3F Canvas (z-index 1, alpha: true, clearColor 0x000000 0). Two separate RAF loops, mismatched camera perspectives.

Research:
- Best approach for a persistent starfield background with a transparent R3F overlay — is a separate WebGL renderer still the right choice in 2026, or can R3F handle the starfield natively with better performance?
- If keeping two renderers: how to synchronize RAF? How to align camera parallax?
- If moving starfield INTO R3F: `@react-three/drei <Stars>` vs custom `<Points>` — performance with 2000+ particles on mobile?
- https://docs.pmnd.rs/react-three-fiber/performance
- GPU memory impact of two concurrent WebGL contexts

### 3. Line Rendering — WebGL lineWidth Is Broken

`linewidth` > 1 is only supported on Chrome with specific ANGLE backends. Firefox, Safari, mobile ignore it. Current code uses `<line>` / `LineBasicMaterial` with `linewidth={1}` (the default).

Research:
- Best cross-browser approach for thick/thin 3D lines in R3F (2026)
- `drei`'s `<Line>` component vs `<FatLine>` vs custom `LineGeometry` (three/examples) vs mesh-based tube geometry
- Performance tradeoffs: tube geometry for 6 edges (cheap) vs LineGeometry with shader-based thickness
- https://threejs.org/examples/#webgl_lines_fat
- https://github.com/pmndrs/drei#Line

### 4. Geometry Disposal — Preventing GPU Memory Leaks

`new THREE.BufferGeometry().setFromPoints(...)` is called on every render in the component body (DeltaMesh.tsx:189-190). No `dispose()` call.

Research:
- What's the canonical R3F pattern for static geometry that depends on props? (e.g., edges that change color)
- `useMemo` + `useEffect(() => () => geo.dispose(), [])` — is this sufficient?
- Does R3F auto-dispose geometries assigned to `<bufferGeometry>`? Or is manual `dispose()` required?
- https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects
- https://docs.pmnd.rs/react-three-fiber/performance#dispose

### 5. Stage Color Map — Eliminating Duplicated Constants

The same 6-stage color map (`VOID`→`SEED`→`SPROUT`→`SAPLING`→`BLOOM`→`FRUIT`) is hardcoded in 3+ places (DeltaMesh.tsx, DecisionIcosahedron.tsx, App.tsx).

Research:
- Best pattern for shared constants in a Vite/R3F project: exported const object, barrel file, tiny npm package within monorepo?
- TypeScript pattern: `const STAGE_COLORS = {...} as const` + `type Stage = keyof typeof STAGE_COLORS` for type safety
- Could this live in a shared theme module that also drives CSS custom properties?

### 6. useEquilibrium — Eliminating `any` and Adding Runtime Validation

`useEquilibrium.ts:31` uses `let serverEq: any = {}`. `JSON.parse(localStorage.getItem(...))` returns `any`. No validation on parsed data shape.

Research:
- Lightweight runtime validation in 2026: Zod vs valibot vs arktype for a Vite bundle
- Bundle size impact (Zod ~12KB min+gzip, valibot ~1KB)
- Pattern: parse external data (fetch + localStorage) through a Zod schema with `.catch()` defaults
- Type inference: `z.infer<typeof EquilibriumSchema>` to derive the TypeScript interface and eliminate manual `EquilibriumState`
- https://zod.dev
- https://valibot.dev

### 7. Stale Closure in ProofOfCare

`pocState` is captured in a closure inside a `useEffect` — if the effect fires before state settles, `wasCoherent` uses stale values.

Research:
- `useRef` pattern for reading latest state inside effect without triggering re-run
- `useEffectEvent` (React 19 experimental) vs `useRef` workaround
- https://react.dev/reference/react/useRef#troubleshooting
- https://twitter.com/dan_abramov/status/1582568307566833664

### 8. Dead Components

Multiple components (MaturityDashboard, ObservatoryRoom, VaultRoom, GlobeRoom, LarmorHUD) are defined but never imported in App.tsx. They represent years of prior development.

Research:
- Codebase archaeology: grep for imports of these components across the p31ca Astro project to see if they're used elsewhere
- If truly dead: should they be removed, or kept as reference implementations?
- Pattern for a component library that includes dead code documentation

### 9. Build Pipeline — Vite 8 → Astro → Cloudflare Pages

Current flow: `vite build` → `cp dist/*` → `astro build` → `wrangler pages deploy`. This syncs Vite output into Astro's public dir.

Research:
- Better patterns for embedding a standalone R3F SPA inside an Astro site
- Astro with React islands: could the R3F Canvas be an island component instead of a separate Vite build?
- Performance comparison: separate Vite build vs Astro + `client:only` React component for a full-screen Three.js scene
- https://docs.astro.build/en/guides/framework-components/#using-framework-components

## How to Return Results

For each numbered item, return:
1. Recommended approach with code snippet
2. Alternative(s) with tradeoffs
3. Links to authoritative docs or examples
4. Bundle size / performance impact if relevant
