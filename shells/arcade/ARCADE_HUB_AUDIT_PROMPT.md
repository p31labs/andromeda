# 🎮 P31 ARCADE HUB: FULL CODEBASE AUDIT & COLLABORATION PROMPT

---

## MISSION

This is **P33 Arcade Hub** — the family-centric, Four-Domain Centaur front-end for the P31 gaming ecosystem. It encompasses the sibling arcade experience (S.J./W.J.), CHUMP bandwidth earnings, K4 Love Economy mesh, SENTINEL content guardrails, and three.js-based in-browser games.

**The hub is a fractured diamond.** Two diverging versions (v1 and v2) exist side-by-side. The SDK is concept-complete but the games are siloed between iframes and in-process React wrappers. The visual system is polished but disconnected from the live arcade. The performance monitoring suite is professional-grade but unused. We need to syncretize both versions into a single cohesive family gaming OS.

Audit follows. All code is included below for DeepSeek to analyze, critique, and generate a unified refactor plan.

---

## 🧠 ARCHITECTURE OVERVIEW

### p31-arcade-hub (React/Vite — FAMILY CENTAUR HUB)
- **Stack:** React 18 + Vite + Three.js + CSS Modules
- **Purpose:** Family-first game launcher with sibling spectate, CHUMP-funded credits, SENTINEL guardrails, and K4 care flow mesh
- **Dual Versions:**
  - **v1** (`App.tsx`) — import from `@p31/unified` (external package), simple iframe-based game launcher with SkillBridge + ZenMode
  - **v2** (`App-v2.tsx`) — standalone centaur architecture with inline SDK, sibling polling, FamilySpectate, EarningsStack, Four-Domain detection
- **Status:** v2 is the active architecture, v1 is legacy

### p31-arcade-shared
- `identity/crypto-identity.ts` — cryptographic identity module

### p31-arcade-theme (Design System)
- `ReturnRibbon.tsx` — floating "P31 Navigation" ribbon (soup · hub · passport · connection · mesh)
- `index.ts` — design tokens export

---

## 🏗️ COMPLETE FILE MAP

### p31-arcade-hub/src/
```
src/
├── App.tsx                    # v1 — legacy (164 lines, imports @p31/unified)
├── App-v2.tsx                 # v2 — active centaur hub (364 lines)
├── App.css                    # v1 styles
├── App-v2.css                 # v2 styles (884 lines — full design system)
├── main.tsx                   # v1 entry point
├── main-v2.tsx                # v2 entry point
├── components/
│   ├── EarningsStack.tsx      # Credit display + CHUMP breakdown (136 lines)
│   ├── FamilySpectate.tsx     # Sibling watch + K4 care flow (213 lines)
│   ├── GameLauncher.tsx       # v1 game launcher
│   ├── GameLauncherV2.tsx     # v2 game launcher with SENTINEL (200 lines)
│   ├── GlobalSpoonDisplay.tsx # Spoon level widget
│   ├── PlayerIdentityCard.tsx # Player profile card
│   ├── RecentActivityFeed.tsx # Activity timeline
│   ├── SkillBridgePanel.tsx   # Cross-game skill transfer
│   ├── TaskBoard.d.ts         # Bounty board types
│   ├── TaskBoard.jsx          # Bounty board component
│   ├── ZenModeFinder.tsx      # Spoon-aware game recommender
│   └── game-containers/
│       ├── index.ts
│       ├── GeodesicBuilderContainer.tsx
│       ├── MagneticPoetryContainer.tsx
│       ├── OrbitalDriftContainer.tsx
│       └── SmallballContainer.tsx  # Three.js wrapper + perf HUD (268 lines)
├── games/
│   ├── index.ts               # Game exports + types
│   ├── smallball/
│   │   └── index.ts           # SmallballGame class — full Three.js (472 lines!)
│   ├── gridiron/
│   │   └── index.ts           # Gridiron game config
│   ├── magnetic-poetry/
│   │   └── MagneticPoetryGame.ts
│   ├── orbital-drift/
│   │   └── OrbitalDriftGame.ts
│   └── geodesic-builder/
│       └── GeodesicBuilderGame.ts
├── sdk/
│   ├── arcade-sdk.ts          # v1 SDK
│   └── arcade-sdk-v2.ts       # v2 SDK — Session mgmt, spectate, earnings (436 lines!)
├── types/
│   └── arcade.ts              # All type definitions (115 lines)
├── performance/
│   └── index.ts               # PerformanceMonitor + DeviceProfiles (325 lines!)
└── visual-system/
    ├── index.ts               # Exports everything
    ├── design-tokens.ts       # P31Colors, P31Gradients, P31Shadows, etc (93 lines)
    ├── components/
    │   └── GlassEarningsOverlay.tsx
    ├── particles/
    │   └── index.ts           # LoveEconomyParticles
    └── shaders/
        └── index.ts           # ShaderManager, CoOpGlowShader, etc
```

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### 🔴 V1 vs V2 DIVERGENCE (PRIORITY #1)
1. **Two complete App implementations** — `App.tsx` imports from external `@p31/unified` package (which may not exist), while `App-v2.tsx` has everything inline. Currently both `main.tsx` and `main-v2.tsx` exist, and only one can be active.
2. **Two SDK versions** — `arcade-sdk.ts` (v1) with different API shape than `arcade-sdk-v2.ts`. Same concepts but different interfaces.
3. **Two CSS systems** — `App.css` for v1, `App-v2.css` for v2. The v2 CSS is comprehensive (884 lines) but duplicates Tailwind-like classes manually.
4. **Two entry points** — whichever is imported in `index.html` determines which version runs

### 🔴 GAME FRAGMENTATION (PRIORITY #2)
1. **Smallball exists in THREE places** — as an iframe URL in the arcade hub, as a Three.js `SmallballGame` class (472 lines in hub/games/smallball/index.ts), AND as a separate `SmallballContainer` React wrapper (268 lines) — all slightly different code
2. **Game containers vs standalone games** — `SmallballContainer.tsx` has its own keyboard controls, score detection, perf monitoring, and Four-Domain overlay — but `SmallballGame.ts` is the actual Three.js implementation. The container references private members (`game['playerMesh']`, `game['renderer']`, `game['score']`) which is a TypeScript anti-pattern.
3. **Gridiron, Orbital Drift, Magnetic Poetry, Geodesic Builder** all have configs in GAME_CATALOG but only `smallball/index.ts` has a full Three.js implementation. The rest are config-only.
4. **Score detection polling** — `setInterval` at 500ms checking `game.getScore()` instead of proper event-driven scoring

### 🔴 FAMILY SPECTATE FLAWS (PRIORITY #3)
1. **Spectate iframe** is 300px tall hardcoded — no responsive viewport, no scaling
2. **Sibling polling** at 5-10 second intervals — creates latency in spectate awareness, no WebSocket/realtime
3. **K4 care flow recording** duplicates between `FamilySpectate.tsx` and `ArcadeSDKv2.endSpectate()` — potential double-recording
4. **No actual spectate streaming** — the "spectate" iframe just loads the game URL with `?spectate=true` param, which the game may not support
5. **`bothEarned: false`** is set on creation but only set to `true` on `endSpectate()` — if user closes tab, care flow is lost

### 🔴 CHUMP EARNINGS / CREDITS (PRIORITY #4)
1. **EarningsStack hardcoded defaults** — `chumpMonthly: 450`, `arcadeMonthly: 30` are constants, never updated from actual CHUMP worker metrics
2. **Credit calculation** in `ArcadeSDKv2.calculateCredits()` uses `session?.coopWith ? 1.5 : 1.0` — but `session` could be null at call time
3. **No persistence** — credits reset on page refresh. No localStorage, no PGLite, no server persistence
4. **`canAffordSession()`** estimates max cost but playerCredits is never synced back from the edge worker after a session ends

### 🔴 PERFORMANCE MONITORING ORPHAN (PRIORITY #5)
1. **`PerformanceMonitor` class** (325 lines) is comprehensive — device detection, adaptive quality, FPS tracking, budget checking, validation reports
2. **Only used** in `SmallballContainer.tsx` — other game containers don't use it
3. **`DeviceProfiles`** targets Chrome Celeron 30fps, iPhone A13 60fps, Android mid 30fps — but the adaptive quality recommendations (`disable shadows`, `reduce particles`) are never actually applied to the Three.js renderer
4. **No automated performance regression testing** — the `runValidation()` method exists but is only triggered by a manual "Test" button in the game controls

### 🔴 SENTINEL GUARDRAILS — CONCEPT COMPLETE BUT POROUS (PRIORITY #6)
1. **`WJ_WHITELIST`** in SDK blocks certain games for W.J. — but the check is only in `GameLauncherV2.isGameAllowed()`, not enforced in the game container iframe URLs
2. **No backend enforcement** — a user could navigate directly to `https://p31-smallball.pages.dev` and bypass SENTINEL entirely
3. **Session caps** declared per game (`maxSessionMinutes`) but never enforced with countdown timers or auto-kick
4. **SENTINEL banner** is informational only — the "toggle" button shows/hides details but provides no actual control

### 🟡 DESIGN TOKEN FRAGMENTATION
1. **Design tokens in hub** (`visual-system/design-tokens.ts`) define colors, gradients, shadows, animations, and a `generateCSSVariables()` function
2. **Same tokens duplicated** in `p31-arcade/tailwind.config.mjs` with different naming (`p31-bg`, `p31-accent` vs `P31Colors.phosGreen`)
3. **Same tokens again** in `p31-arcade/src/layouts/Layout.astro` as CSS custom properties
4. **Same tokens again** in `p31-arcade-theme/src/index.ts`
5. **ReturnRibbon** in theme uses its own styling separate from all of the above
6. **The `generateCSSVariables()` function** exists but is never called in any HTML head

### 🟡 GAME ENGINE FRAGMENTATION
1. **`SmallballGame`** in hub (472 lines) is a completely different implementation from `SmallballEngine` in monolith (117 lines)
2. Hub's version is a full Three.js game with court, crowd, hoop, physics — monolith's version is a pure logic engine with PGLite
3. **No shared types** — SmallballConfig in hub vs SmallballState in monolith
4. **No shared rendering** — hub renders directly to DOM, monolith uses `<Canvas>` from R3F

---

## 🗂️ COMPLETE SOURCE CODE

### 📁 p31-arcade-hub

**package.json** (hypothetical based on imports)
```json
{
  "name": "p31-arcade-hub",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "three": "^0.160.0",
    "@types/three": "^0.160.0",
    "vite": "^5.0.0"
  }
}
```

**src/types/arcade.ts** (115 lines — complete type system)
```typescript
export type PlayerId = 'sj' | 'wj';
export type GameId = 'smallball' | 'gridiron' | 'cards' | 'strategy' | 'liquid-sculptor' | 'resonance-rings' | 'magnetic-poetry' | 'orbital-drift' | 'geodesic-builder';
export type GameCategory = 'sports' | 'strategy' | 'physics' | 'creative';
export type DomainMode = 'industry' | 'arcade' | 'chump' | 'love' | 'hybrid';

export interface GameConfig { id: GameId; name: string; category: GameCategory; maxSessionMinutes: number; baseRate: number; learningBonus: number; coopEnabled: boolean; spectateEnabled: boolean; description: string; zenModeEligible: boolean; }
export interface UnifiedPlayer { id: PlayerId; displayName: string; globalSpoons: number; totalPlayTimeMinutes: number; skillBridges: SkillBridge[]; parentControls: ParentControls; }
export interface ParentControls { dailyTimeLimitMinutes: number; requireBreaks: boolean; allowedGames: GameId[]; spectateModeEnabled: boolean; chumpFundingEnabled: boolean; }
export interface SkillBridge { fromGame: GameId; toGame: GameId; transferPercent: number; active: boolean; }
export interface GameSession { sessionId: string; gameId: GameId; playerId: PlayerId; startTime: number; endTime?: number; durationMinutes: number; score?: number; scorePercentile?: number; mode: 'solo' | 'coop' | 'spectate'; coopWith?: PlayerId; spectating?: PlayerId; creditsEarned: number; }
export interface K4CareFlow { edge: 'will→sj' | 'will→wj' | 'christyn→sj' | 'christyn→wj' | 'sj↔wj'; amount: number; reason: string; timestamp: number; gameContext?: GameId; }
export interface EarningsStack { chumpMonthly: number; arcadeMonthly: number; combined: number; availableCredits: number; lastPayout: number; }
export interface SpectateSession { sessionId: string; watcherId: PlayerId; playerId: PlayerId; gameId: GameId; startTime: number; endTime?: number; bothEarned: boolean; careFlowRecorded: boolean; }
export interface CentaurAnalysis { industryContext?: string; arcadeIntegration?: string; familyGuardrails?: string; chumpSynergy?: string; loveEconomyImpact?: string; unifiedRecommendation?: string; detectedDomains: DomainMode[]; }
export interface ZenModeGame { gameId: GameId; estimatedSpoonCost: number; recommendedDuration: number; reason: string; }
```

**src/sdk/arcade-sdk-v2.ts** (436 lines — complete SDK)
```typescript
// ArcadeSDKv2 class with:
// - GAME_CATALOG: 9 games with categories, rates, coop flags, URLs
// - WJ_WHITELIST: 5 games allowed for W.J. (smallball, gridiron, liquid-sculptor, magnetic-poetry, geodesic-builder)
// - Static EARNINGS: chumpMonthly=450, arcadeMonthly=30, combined=480
// - isGameAllowed(): SENTINEL check per player
// - startSession(): creates GameSession, reports to edge worker, starts heartbeat at 30s interval
// - startSpectate(): creates SpectateSession
// - endSpectate(): records K4 care flow to k4-cage.p31ca.org, reports end to edge
// - endSession(): calculates credits with skill/learning/coop multipliers, records care flow for co-op
// - calculateCredits(): baseRate * (duration/60) * (1 + percentile/100) * learningBonus * coopMultiplier
// - heartbeat(): pings edge every 30s with session duration
// - reportToEdge(): POST to chump-edge.trimtab-signal.workers.dev/api/arcade/*
// - recordCareFlow(): POST to k4-cage.p31ca.org/api/care-flow
```

**GAME_CATALOG** (9 games):
| Game ID | Category | Rate/hr | Coop | Spectate | URL |
|---------|----------|---------|------|----------|-----|
| smallball | sports | $0.10 | ✅ | ✅ | p31-smallball.pages.dev |
| gridiron | sports | $0.10 | ✅ | ✅ | p31-gridiron.pages.dev |
| cards | strategy | $0.12 | ✅ | ✅ | p31-cards.pages.dev |
| strategy | strategy | $0.12 | ❌ | ✅ | p31-strategy.pages.dev |
| liquid-sculptor | physics | $0.15 | ❌ | ✅ | p31-liquid-sculptor.pages.dev |
| resonance-rings | physics | $0.15 | ❌ | ❌ | p31-resonance-rings.pages.dev |
| magnetic-poetry | creative | $0.15 | ✅ | ✅ | p31-magnetic-poetry.pages.dev |
| orbital-drift | physics | $0.15 | ❌ | ❌ | p31-orbital-drift.pages.dev |
| geodesic-builder | creative | $0.15 | ✅ | ✅ | p31ca.org/geodesic |

**src/App.tsx** (v1 — 164 lines)
```tsx
// Imports from '@p31/unified': UnifiedIdentityManager, GlobalSpoonManager, SkillBridgeManager
// Uses: GlobalSpoonDisplay, PlayerIdentityCard, GameLauncher, RecentActivityFeed, SkillBridgePanel, ZenModeFinder, TaskBoard
// Two views: 'arcade' | 'bounties'
// On game select: renders iframe with getGameUrl() mapping
// 9 game URLs (smallball, gridiron, cards, strategy, liquid-sculptor, resonance-rings, magnetic-poetry, orbital-drift, water-parksimulator)
// Loading screen with spinning 🎮 emoji
```

**src/App-v2.tsx** (v2 — 364 lines — ACTIVE ARCHITECTURE)
```tsx
// Four-Domain Centaur Architecture
// PlayerState: id (sj/wj), credits, currentGame, isPlaying
// Sibling polling from CHUMP edge worker every 5s
// Game session management via ArcadeSDKv2
// Four-Domain mode detection via regex triggers:
//   Industry: CPI, ARPDAU, LTV, gacha, monetize, revenue, whale, market
//   Arcade: game, play, S.J., W.J., sibling, session
//   CHUMP: CHUMP, bandwidth, edge, infrastructure, $450, earnings
//   Love: mesh, K4, care flow, co-op, spectate, family, bond
// Built-in games: magnetic-poetry (MagneticPoetryContainer), geodesic-builder (GeodesicBuilderContainer)
// External games: iframe with URL params (?player=&mode=&session=)
// Game header: back button, mode badge, coop badge, session timer
// Game footer: Four-Domain bar with tags, mode signature
// Spectate view: FamilySpectate component
// Main hub: header with player switch, SENTINEL banner, game launcher (2-col), sidebar (spectate + earnings + domain legend)
// Footer: $450/mo CHUMP + $30/mo Arcade = $480/mo family fund
```

**src/App-v2.css** (884 lines — full design system)
```css
// Complete CSS architecture:
// - CSS variables (sports-red, strategy-teal, physics-blue, creative-mint, chump-gold, sentinel-blue, love-pink)
// - Hub header with gradient brand
// - SENTINEL strip (gradient blue bar with K4 indicator)
// - Main layout: grid template 1fr 350px sidebar
// - Game launcher: category tabs (all/sports/strategy/physics/creative), games grid (auto-fill minmax 280px)
// - Game cards: hover effects, coop border (love-pink), unaffordable opacity
// - Launch buttons: solo (chump-gold), coop (love-pink), spectate (strategy-teal)
// - Family spectate: live badge with pulse animation, status badges (online/playing/offline), spectate viewer 300px iframe
// - Earnings stack: progress bars, credits badge, four-domain synthesis section
// - Game container: full viewport height, header + iframe(flex:1) + footer
// - Four-domain bar: horizontal tags
// - Domain legend: vertical list with icons
// - Sibling playing card: love-pink border
// - Footer: centered stack display
// - Responsive: collapse to single column at 900px
```

**src/components/GameLauncherV2.tsx** (200 lines)
```tsx
// SENTINEL banner with toggle details
// Category filter tabs (all/sports/strategy/physics/creative)
// Games grid with affordability and coop detection
// Each game card: category badge, name, description, meta (max time, rate, learning bonus)
// Action buttons: Play Solo (disabled if can't afford), Play Together (if sibling playing same game), Spectate
// Blocked games counter for S.J. awareness
// Launcher footer with Four-Domain indicator icons
```

**src/components/FamilySpectate.tsx** (213 lines)
```tsx
// Sibling status polling every 10s from edge worker
// Spectate session creation: reports to CHUMP edge, records K4 care flow on end
// Active spectate view: LIVE badge with pulse, watcher info, iframe (300px!), earnings info cards, End button
// Spectate launcher: status badge (online/playing/offline), benefits list, Start button (disabled if sibling not playing)
// Policy footer: "Powered by CHUMP bandwidth earnings. No ads. No tracking."
```

**src/components/EarningsStack.tsx** (136 lines)
```tsx
// Compact mode: badge + monthly indicator
// Full mode: header with total, progress bars for CHUMP ($450) vs Arcade ($30), credits available display
// Four-Domain synthesis section with badges
// SENTINEL policy note
// Fetches from chump-edge worker every 60s
```

**src/performance/index.ts** (325 lines — PerformanceMonitor class)
```typescript
// DeviceProfiles:
//   chromebookCeleron: 50 draw calls, 50K triangles, 64MB, 30fps target
//   iPhoneA13: 100 draw calls, 100K triangles, 128MB, 60fps target
//   androidMidRange: 75 draw calls, 75K triangles, 96MB, 30fps target
//   desktop: 200 draw calls, 500K triangles, 512MB, 60fps target
// PerformanceMonitor:
//   beginFrame()/endFrame() — frame timing with adaptive quality
//   detectDevice() — UA parsing
//   checkBudget() — FPS, draw calls, triangles, GPU memory
//   runValidation(duration) — sample every 100ms, generate report
//   getMetrics() — current FPS, frameTime, drawCalls, triangles, textures, shaders, gpuMemory
```

**src/visual-system/design-tokens.ts** (93 lines)
```typescript
// P31Colors: phosGreen (#39ff14), cyanVibe (#00f5ff), orchidSoul (#da70d6), chumpGold (#feca57), sentinelBlue (#54a0ff)
// Arcade extensions: sportsRed, strategyTeal, physicsBlue, creativeMint
// Neutrals: bgDark, bgCard, textPrimary, textSecondary
// P31Gradients: phosCyan, orchidGold, sentinelFade, darkCard
// P31Shadows: glowPhos, glowCyan, glowOrchid, glass, card
// P31Animations: durations (fast/normal/slow/pulse), easings (standard/bounce/smooth)
// generateCSSVariables() — outputs :root CSS custom properties
```

---

## 🎯 CRITICAL TASKS FOR DEEPSEEK

### TASK 1: CONSOLIDATE V1 AND V2
- Merge `App.tsx` (164 lines) and `App-v2.tsx` (364 lines) into a single `App.tsx`
- Keep the Four-Domain Centaur architecture from v2 as the base
- Port the TaskBoard/Bounties view from v1
- Decide: keep the `@p31/unified` import pattern or inline everything (v2 approach)
- Merge `arcade-sdk.ts` and `arcade-sdk-v2.ts` into a single SDK
- Merge `App.css` and `App-v2.css` into a single stylesheet

### TASK 2: UNIFY GAME ARCHITECTURE
- Choose ONE pattern for all games: either all iframe-based (external URLs) or all in-process (React + Three.js)
- If in-process: create a `GameEngine` abstract class that both `SmallballEngine` (monolith) and `SmallballGame` (hub) implement
- If iframe: fix the spectate iframe sizing (300px hardcoded → responsive), add postMessage protocol for cross-frame communication
- Create a `GameContainer` base component that handles controls, perf monitoring, score events, and Four-Domain overlay — eliminating code duplication between SmallballContainer, MagneticPoetryContainer, etc.

### TASK 3: FIX SPECTATE ARCHITECTURE
- Replace polling (5-10s interval) with WebSocket or SSE for real-time sibling status
- Define a proper postMessage protocol for spectate iframes (game → hub: score events, status; hub → game: spectate mode flag)
- Fix `bothEarned` to be set on spectate start, not just end
- Make spectate iframe responsive (100% height, not 300px)
- Add proper "watcher mode" to game iframes (hide controls, show read-only view)

### TASK 4: COMPLETE THE CREDIT ECONOMY
- Make EarningsStack actually fetch real CHUMP worker metrics (not hardcoded `$450`)
- Persist credits to localStorage AND edge worker
- Fix `calculateCredits()` null safety (`session` could be null after `endSession()`)
- Add credit spending confirmation in GameLauncher (`Are you sure? This costs X credits`)
- Implement session cap enforcement with countdown timer

### TASK 5: HARDEN SENTINEL
- Move SENTINEL enforcement from client-only to a middleware/worker check on game URLs
- Add session cap countdown visible to parent
- Implement auto-kick when session cap is reached
- Add "Ask Parent" flow for W.J. to request blocked games
- Make the SENTINEL details panel actionable (not just informational)

### TASK 6: WIRE PERFORMANCE MONITOR
- Add `PerformanceMonitor` to ALL game containers (not just Smallball)
- Implement the adaptive quality recommendations (actually disable shadows, reduce particles, lower resolution)
- Add automated performance validation to CI/CD pipeline
- Create a Performance HUD toggle that's accessible from any game view
- Add telemetry endpoint to report performance metrics from real devices

### TASK 7: CONSOLIDATE DESIGN TOKENS
- Eliminate all 4+ duplicate token definitions
- Single source of truth: `@p31/arcade-theme` package
- `generateCSSVariables()` should be called in the root Layout.astro/App.tsx
- `tailwind.config.mjs` should import from the theme package
- `ReturnRibbon` should use theme tokens, not its own inline styling

### TASK 8: COMPLETE THE GAME IMPLEMENTATIONS
- Gridiron, Orbital Drift, Magnetic Poetry, Geodesic Builder all have Zero implementation beyond config
- Each needs: `GameConfig` → `GameEngine` class → `GameView` React component → `GameContainer` wrapper
- Follow SmallballGame pattern: Three.js scene, physics, input handling, score events, particle effects
- Use `PerformanceMonitor` from the start so device-adaptive rendering is built in

---

## 🚀 OUTPUT EXPECTED

Generate a **complete, unified P31 Arcade Hub architecture plan** that:

1. **Merges v1 and v2** into a single `App.tsx` with file tree
2. **Unifies game architecture** — standard `GameEngine` interface, single `GameContainer`, responsive iframe/postMessage protocol
3. **Fixes spectate** — WebSocket/SSE, responsive viewer, proper `bothEarned` lifecycle
4. **Completes credit economy** — real CHUMP metrics, localStorage persistence, spending confirmation
5. **Hardens SENTINEL** — server-side enforcement, session caps with countdown, "Ask Parent" flow
6. **Wires performance monitoring** — all games adaptive, CI validation, HUD toggle
7. **Consolidates design tokens** — single source, tailwind integration, ReturnRibbon alignment
8. **Produces working code** — not just diagrams, but actual implementations of:
   - The merged App.tsx
   - The unified GameEngine + GameContainer
   - The WebSocket spectate system
   - The complete credit economy flow
   - The SENTINEL enforcement layer

**The goal: turn this fractured but brilliant hub into a single, cohesive, family-first gaming OS where all four domains (Industry + Arcade + CHUMP + Love Economy) actually work together.**
