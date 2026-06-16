# Ecosystem Integration Research: spaceship-earth → PHOS + P31

## Context

### Apps (same monorepo, differnt stacks)
| App | Stack | URL | Data model |
|-----|-------|-----|------------|
| **spaceship-earth** | Vite 8 + React 19 + R3F + Zustand | `/spaceship-earth/` on p31ca.org | Fetches static JSON files + localStorage overrides |
| **PHOS** | Astro 5 + React 19 + PGlite + Tailwind 3 | phos.p31ca.org | Self-contained: PGlite (2 DBs) + 12 localStorage keys + React Context |
| **p31ca** | Astro 5 + React 19 + Tailwind 4 | p31ca.org | Static pages + embeds spaceship-earth as prebuilt SPA |
| **`@p31/shared`** | Workspace package (15+ entry points) | — | Canon theme, events, economy, telemetry, crypto, UI |

### Current Integration Architecture
```
spaceship-earth (Vite build) ──dist/──► p31ca/public/spaceship-earth/ ──► p31ca.org/spaceship-earth/
                                   (cp -r, no runtime bridge)

PHOS ──► phos.p31ca.org (completely independent Astro site)

@p31/shared ──► consumed by spaceship-earth and p31ca
             └── NOT consumed by PHOS (PHOS has its own parallel theme/state system)
```

### Current Data Flow
```
monorepo root JSON files ──► spaceship-earth fetches at runtime
  spoon-state.json           (static assets from p31ca.org/spaceship-earth/)
  medical-log.json
  equilibrium.json
  quantum-polisher-report.json

PHOS ──► PGlite WASM DBs ──► never shares data with spaceship-earth
  (idb://p31-chaos-vault, idb://p31-karma-ledger)
```

## Research Areas

### 1. Embedding R3F Inside Astro — Spaceship-Earth as an Astro Island

Currently spaceship-earth is a separate Vite app whose built output is copied into p31ca's public dir. No server-side rendering, no data preload, no shared Astro layout. Research:

- **Astro + React + R3F**: Can the R3F Canvas be an Astro `client:only` React island component? What's the bundle size impact of shipping the Three.js runtime through Astro's client JS pipeline vs a standalone Vite build?
- **Astro `<Canvas>` integration**: Are there existing patterns for embedding a full-screen R3F scene inside an Astro page without frame rate drops from Astro's partial hydration overhead?
- **Preloading data**: Could useEquilibrium/useDecisionEngine fetch their JSON during Astro's static build (via `Astro.glob` / `fetch` in `.astro` frontmatter) and inject the initial state as props, eliminating the first-poll latency?
- **Route sharing**: Would migrating spaceship-earth from a separate Vite build to an Astro page at `p31ca.org/spaceship-earth/` (rather than a copied SPA) simplify deployment? What breaks?
- **References**: https://docs.astro.build/en/guides/framework-components/ | https://docs.pmnd.rs/react-three-fiber/getting-started/examples | Astro + R3F production examples

### 2. Unifying the Theme Fork — PHOS Should Consume `@p31/shared`

PHOS has its own standalone theme: `/phos/tailwind.config.mjs` with `phos` color namespace (zinc background, `#39ff14` accent). The `@p31/shared` package at `packages/shared/src/theme/` has a complete canon system (276 CSS variables, Tailwind v4 preset, 7 skin presets, Zustand store, React hooks). Research:

- **Tailwind v3 → v4 migration** for PHOS: PHOS uses Tailwind 3.4 with a custom config. The shared canon preset targets Tailwind v4. What's the migration path? Can Tailwind v3 consume a v4 preset?
- **Theme mapping**: PHOS has 4 biological theme tiers (CRISIS, SANCTUARY, BRIDGE, QUANTUM). The shared system has 7 skin presets (operator, kids, grayRock, aurora, highContrast, lowMotion, light). Can PHOS tiers map to skin presets, or does PHOS need its own skin preset added?
- **CSS variable overlap**: Shared CSS defines `--color-cyan: #4db8a8`, PHOS currently uses `#39ff14` as accent. How to reconcile brand token values across both apps?
- **Bundle impact**: What's the gzip cost of importing `@p31/shared/theme` into PHOS? Tree-shakeable?
- **References**: https://tailwindcss.com/docs/upgrade-guide | `packages/shared/src/theme/`

### 3. Real-Time State Sync — Shared Worker vs BroadcastChannel vs PGlite

PHOS and spaceship-earth currently never communicate at runtime. They both manage spoon state independently. If they share the same origin (p31ca.org), they could share state. Research:

- **SharedWorker** pattern: A SharedWorker that wraps PGlite and exposes a common state interface to both apps. PHOS already uses PGlite. Could spaceship-earth use the same PGlite instance via SharedWorker? Advantages: single RAF loop, shared IndexedDB connection, no duplication.
- **BroadcastChannel API**: Simple message passing between tabs for state updates (spoon change, calcium update). Both apps listen for `phos-state-change` / `dashboard-state-change` events. No shared memory, but real-time cross-tab updates.
- **Service Worker message relay**: SW intercepts both origins and relays state between clients. Already present in p31ca.com? Could extend.
- **localStorage storage event**: Both apps can listen for `window.addEventListener('storage', ...)` to detect changes from the other app. PHOS already has this pattern in KarmaEngine. Works cross-tab but not within the same tab.
- **Zustand persist middleware** with a shared storage key: Both apps import the same Zustand store from `@p31/shared` and persist to the same `localStorage` key. Changes in one app automatically propagate via `storage` event.
- **References**: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker | https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel | https://github.com/pmndrs/zustand#persist-middleware | https://pglite.dev/docs/worker

### 4. Centralizing the Static Data Files

Currently the JSON "database" (spoon-state.json, equilibrium.json, etc.) lives as static files that spaceship-earth fetches at runtime. These are written by external tooling (Jitterbug compiler), not by the apps themselves. Research:

- **PGlite as the canonical data store**: PHOS already has PGlite running. Could the equilibrium data live in a shared PGlite table that both apps read from? This would eliminate stale JSON copies and enable real-time updates.
- **Cloudflare KV as a real-time bridge**: The relay worker (`worker/index.ts`) already has KV access. Could equilibrium state be pushed/pulled through KV instead of stale JSON files?
- **Maintaining the JSON fallback**: If we keep static files for zero-latency initial load, how to ensure they're regenerated on every deploy? CI pipeline? Astro build hook?
- **Schema versioning**: The JSON files have no schema validation. Research embedding a JSON Schema $id in each file and running a lightweight validator (Ajv) on fetch.

### 5. Architectural Shell — Unified PWA with App Switching

spaceship-earth (dashboard), PHOS (spoon tracker), p31ca ops, bonding game — they're separate Deployments/URLs but share the same user and data. Research:

- **Monolith or micro-frontend?** Should these be separate Astro pages under p31ca.org (single deploy, shared layout, shared SW) or remain independent deployments (independent scaling, independent failure domains)?
- **PWA scope**: If all apps are under p31ca.org, a single Service Worker covers all of them. Research SW scoping, cache strategies for R3F assets (Three.js is ~260KB gzip), and offline fallback for the dashboard.
- **Unified navigation**: Pattern for a shared top-bar / bottom-nav that appears across all pages (like `PHOSShell.tsx` but at the p31ca level). Should this be an Astro layout component shared by all pages?
- **References**: https://web.dev/articles/service-worker-scope | https://docs.astro.build/en/guides/pwa/ | https://whatwebcando.today/

### 6. Identity — Offline-First DID Without Auth

spaceship-earth generates a random `did:key:z6Mk...` for relay communication. PHOS has no identity at all. Research:

- **DID generation in the shared package**: `@p31/shared/sovereign` already has `generateDID()`. Should all apps use this consistently for a persistent device-level identity?
- **Identity scope**: Per-device? Per-user? Per-app-instance? How to handle multi-device (phone + laptop)?
- **Relay auth**: The relay worker uses Ed25519 signatures. If identity is random and generated fresh on each page load, signatures are meaningless. Research persistent identity via crypto.subtle.generateKey() stored in IndexedDB.

### 7. Deployment Consolidation

Current state: 5 separate Cloudflare Pages projects (p31ca, phos, p31-hearing-ops, p31-mesh, p31-vault) + 15 Workers. Research:

- **Single Pages project with routes**: Can phos + p31ca + hearing-ops be one Astro project with subdirectories and a shared `_routes.json`?
- **Build time impact**: Current build chain: Vite build → sync → Astro build → deploy (~30s). What's the bottleneck? Could Turborepo caching help?
- **Reference**: https://developers.cloudflare.com/pages/configuration/routing/

## How to Return Results

For each numbered area (1-7), return:
1. Recommended architecture with rational
2. 1-2 concrete alternatives with tradeoffs
3. Code sketch or config diff for the recommended path
4. Migration effort estimate (small / medium / large)
5. Links to authoritative docs, examples, or production references
