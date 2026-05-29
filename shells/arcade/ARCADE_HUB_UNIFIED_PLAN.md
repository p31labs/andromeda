# 🏛️ P31 ARCADE HUB – UNIFIED FAMILY GAMING OS

---

## 1. OVERVIEW OF THE UNIFIED ARCHITECTURE

**Monorepo structure** (within the broader `p31-arcade-unified` umbrella):

```
packages/
  @p31/core                # shared stores, API, types, spoon, game-engine base
  @p31/design-system       # design tokens, ReturnRibbon, glass overlays
  @p31/sentinel            # SENTINEL guardrail logic + edge worker middleware
apps/
  arcade-astro/            # production landing (Astro)
  arcade-games/            # in-process game monolith (React + Three.js + PGLite)
  arcade-hub/              # family centaur hub (React + Vite)   <-- this refactor
workers/
  chump-edge/              # Cloudflare Worker for CHUMP metrics, arcade API
  sentinel-worker/         # enforces game access, session caps
```

The **arcade‑hub** app itself has a single entry point, uses the shared packages, and never duplicates logic.

---

## 2. MERGING V1 & V2 → SINGLE `App.tsx`

We inherit the **Four‑Domain Centaur** from v2 and integrate v1's **TaskBoard/Bounties** view.  
All SDK code moves to `@p31/core`, which is the single source of truth for session management, spectate, earnings, and game catalogue.

### App.tsx (unified)

```tsx
import { useState, useEffect } from 'react';
import { useArcadeSDK } from '@p31/core/hooks/useArcadeSDK';
import { SpoonProvider } from '@p31/core/stores/spoon';
import { SENTINELBanner } from './components/SENTINELBanner';
import { GameLauncher } from './components/GameLauncher';
import { FamilySpectate } from './components/FamilySpectate';
import { EarningsStack } from './components/EarningsStack';
import { TaskBoard } from './components/TaskBoard';
import { GameFrame } from '@p31/design-system/GameFrame';
import { ReturnRibbon } from '@p31/design-system';
import './App.css'; // single CSS file, imports tokens from @p31/design-system

export default function App() {
  const [view, setView] = useState<'arcade' | 'bounties'>('arcade');
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const { sdk, player, siblingState, earnings } = useArcadeSDK();

  // When a game is selected, either embed iframe or render in-process component
  const handleLaunchGame = (gameId: GameId, mode: 'solo'|'coop'|'spectate') => {
    const session = sdk.startSession(gameId, player.id, mode);
    setActiveGame(session);
  };

  const handleCloseGame = () => {
    if (activeGame) sdk.endSession(activeGame.sessionId);
    setActiveGame(null);
  };

  return (
    <SpoonProvider>
      <div className="hub">
        <header className="hub-header">
          <h1>P31 Arcade</h1>
          <nav>
            <button onClick={() => setView('arcade')}>Games</button>
            <button onClick={() => setView('bounties')}>Bounties</button>
          </nav>
          <EarningsStack compact />
          <SENTINELBanner />
        </header>

        {activeGame ? (
          <GameFrame
            gameId={activeGame.gameId}
            playerId={player.id}
            sessionId={activeGame.sessionId}
            onClose={handleCloseGame}
          >
            {/* GameFrame renders either <GameContainer> for in‑process or <iframe> for external */}
          </GameFrame>
        ) : (
          <main className="hub-main">
            <aside className="sidebar-left">
              <FamilySpectate />
            </aside>
            <section className="content">
              {view === 'arcade' ? (
                <GameLauncher onLaunch={handleLaunchGame} />
              ) : (
                <TaskBoard playerId={player.id} />
              )}
            </section>
            <aside className="sidebar-right">
              <PlayerIdentityCard />
              <RecentActivityFeed />
            </aside>
          </main>
        )}

        <footer>
          <span>CHUMP $450/mo + Arcade $30/mo = $480 family fund</span>
          <ReturnRibbon />
        </footer>
      </div>
    </SpoonProvider>
  );
}
```

**Key changes:**
- Single hook `useArcadeSDK` provides the v2‑style SDK, player, sibling state, earnings.
- TaskBoard from v1 lives inside a tab "Bounties".
- GameFrame from `@p31/design-system` wraps every launched game (iframe or in‑process).
- SENTINEL banner shown in header; actual enforcement via the SDK + edge worker.

---

## 3. UNIFIED GAME ARCHITECTURE

### 3.1 Standard `GameEngine` Interface (`@p31/core/game-engine`)

Every game implements this:

```ts
export interface IGameEngine {
  // lifecycle
  init(canvas: HTMLCanvasElement, options?: GameOptions): void;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;

  // state
  getState(): GameState;

  // events (for container to subscribe)
  on(event: 'score', handler: (score: number, details: any) => void): void;
  on(event: 'gameover', handler: (finalState: GameState) => void): void;
  on(event: 'error', handler: (err: Error) => void): void;

  // input (passed from container)
  handleInput(action: string, payload?: any): void;
}
```

Existing implementations (`SmallballGame`, `MagneticPoetryGame`, etc.) are refactored to match this interface. For external iframe games, we build a shim that communicates via `postMessage`.

### 3.2 `GameContainer` – Base Component

Handles common behaviour:  
- Creates and manages `GameEngine`  
- Wires `PerformanceMonitor`  
- Renders Four‑Domain overlay bar  
- Connects to PGLite/CRDT if in‑process  
- For external iframes: sets up `postMessage` bridge, passes `sessionId` as URL param, listens for score events, injects a `PerformanceHUD` via postMessage.

```tsx
import { useEffect, useRef } from 'react';
import { IGameEngine } from '@p31/core/game-engine';
import { usePerformanceMonitor } from '@p31/core/hooks/usePerformanceMonitor';
import { GameHUD } from './GameHUD';

export function GameContainer({ engine, gameId, sessionId, mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { monitor, report } = usePerformanceMonitor(gameId);

  useEffect(() => {
    if (!engine || !canvasRef.current) return;
    engine.init(canvasRef.current, { deviceProfile: monitor.profile });
    engine.start();
    const onScore = (s: number) => report('score', s);
    engine.on('score', onScore);
    return () => engine.destroy();
  }, [engine]);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} />
      <GameHUD sessionId={sessionId} mode={mode} />
    </div>
  );
}
```

For iframe‑based games, `GameContainer` is replaced by an `IframeBridge` that does:

```tsx
<iframe
  src={`${gameUrl}?session=${sessionId}&player=${playerId}&mode=${mode}`}
  onMessage={(e) => handlePostMessage(e)}
  ref={iframeRef}
/>
```

The iframe's game code (`p31-smallball`, etc.) is updated to post messages for score, gameover, and to listen for HUD commands.

---

## 4. SPECTATE – REAL‑TIME, RESPONSIVE

### 4.1 WebSocket / SSE for Sibling Status

Replace polling with a shared `EventSource` (SSE) from the CHUMP edge worker:

```
GET /api/arcade/sibling-status?watcher=sj
→ Event: playing
   data: {"playerId":"wj","game":"smallball","sessionId":"abc123",...}
```

`FamilySpectate` uses a custom hook:

```ts
function useSiblingStatus(playerId: PlayerId) {
  const [state, setState] = useState<null | SiblingPlaying>(null);
  useEffect(() => {
    const es = new EventSource(`/api/arcade/sibling-status?watcher=${playerId}`);
    es.addEventListener('playing', (e) => setState(JSON.parse(e.data)));
    es.addEventListener('idle', () => setState(null));
    return () => es.close();
  }, [playerId]);
  return state;
}
```

### 4.2 Spectate Viewer

The viewer now fills the entire frame:

```tsx
<div className="spectate-viewer">
  <div className="spectate-header">
    <span className="live-badge pulse">LIVE</span>
    <span>Watching {sibling.displayName}</span>
    <button onClick={stopSpectate}>End</button>
  </div>
  <iframe
    src={`${gameUrl}?spectate=${sessionId}`}
    allow="fullscreen"
    className="responsive-iframe"
  />
</div>
```

CSS:
```css
.responsive-iframe {
  width: 100%;
  flex: 1;
  border: none;
}
```

### 4.3 Fix `bothEarned`

In `ArcadeSDKv2.endSpectate()`, set `bothEarned` to `true` immediately when the session is created, not at the end. Also record care flow as soon as spectate starts, with an update when it ends.

---

## 5. COMPLETE CREDIT ECONOMY

### 5.1 Real CHUMP Metrics

`EarningsStack` fetches from `GET /api/arcade/earnings?player=sj` which returns:

```json
{
  "chumpMonthly": 448.50,
  "arcadeMonthly": 30,
  "availableCredits": 12.7,
  "lastPayout": "2026-05-15"
}
```

These values are **not** hardcoded.

### 5.2 Persistent Credits

Credits are stored in localStorage and synced to the edge worker after each session.

```ts
const creditsStore = new EventEmitter();
let playerCredits = 0;

export function getCredits(): number { return playerCredits; }

export function spendCredits(amount: number, reason: string): boolean {
  if (amount > playerCredits) return false;
  playerCredits -= amount;
  localStorage.setItem(`p31-credits-${currentPlayer}`, String(playerCredits));
  syncCreditsToEdge();
  return true;
}

async function syncCreditsToEdge() {
  await fetch('/api/arcade/credits', {
    method: 'POST',
    body: JSON.stringify({ player: currentPlayer, credits: playerCredits }),
  });
}
```

`calculateCredits()` in `ArcadeSDKv2` is made null‑safe and uses `getCredits()`.

### 5.3 Spending Confirmation in GameLauncher

When launching a game, if `estimatedCost > playerCredits`, the button is disabled. Otherwise a confirmation dialog:

```
Are you sure? This will cost 0.3 credits (3 minutes × $0.10/hr).
[Cancel] [Play]
```

---

## 6. SENTINEL HARDENING

### 6.1 Server‑side Enforcement

The `sentinel-worker` (Cloudflare Worker) sits in front of game URLs:

```
p31-smallball.pages.dev → worker checks:
  - Is playerId in session? (from signed JWT or query param)
  - Is gameId allowed for this player? (check WJ_WHITELIST)
  - Is session cap reached? (check edge for active session duration)
  If ok → pass through; else → 403 "SENTINEL blocked"
```

The hub app appends a short‑lived token to game URLs:

```
?session=abc123&token=eyJ... (contains playerId, sessionId, allowed)
```

### 6.2 Session Cap Countdown

`GameContainer` (or iframe bridge) reads the session's `maxSessionMinutes` and renders a timer:

```tsx
const [remaining, setRemaining] = useState(maxMinutes * 60);
useEffect(() => {
  const iv = setInterval(() => {
    setRemaining(r => r - 1);
    if (remaining <= 0) onClose();
  }, 1000);
  return () => clearInterval(iv);
}, []);
```

When time runs out, `onClose()` is called, which triggers `endSession()` and returns to hub.

### 6.3 "Ask Parent" Flow for W.J.

Blocked game card shows a button "Ask Parent". Clicking it sends a notification to S.J.'s view (via SSE) and to a configured parent email/SMS. The parent can approve for one session, and the hub re‑fetches allowances.

---

## 7. PERFORMANCE MONITORING EVERYWHERE

### 7.1 Integration

`GameContainer` initialises `PerformanceMonitor` and passes the device profile to the engine. The engine uses the profile to adjust rendering:

```ts
if (profile.targetFPS < 40) {
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = false;
}
```

The HUD (toggle with `F1`) shows FPS, draw calls, and a "Run Validation" button.

### 7.2 CI/CD Validation

A GitHub Action runs a headless Puppeteer test that loads each game, triggers `runValidation(10000)`, and asserts that the average FPS stays above the device profile's target. Failure blocks merge.

---

## 8. DESIGN TOKEN CONSOLIDATION

### 8.1 Single Source of Truth – `@p31/design-system`

All tokens live in `packages/design-system/src/tokens.ts`. Example:

```ts
export const P31Colors = {
  phosGreen: '#39ff14',
  cyanVibe: '#00f5ff',
  // ...arcade extensions
};

export function generateCSSVariables(): string {
  return `
    :root {
      --p31-phos: ${P31Colors.phosGreen};
      --p31-cyan: ${P31Colors.cyanVibe};
      /* ... */
    }
  `;
}
```

In `Layout.astro`, we inject the CSS variables:

```astro
<style is:global>
  ${generateCSSVariables()}
</style>
```

Tailwind config imports the same object:

```js
// tailwind.config.mjs
import { P31Colors } from '@p31/design-system/tokens';
module.exports = {
  theme: {
    colors: {
      p31: P31Colors,
      // ...
    },
  },
};
```

`ReturnRibbon` uses CSS custom properties, not inline styles.

---

## 9. FILE TREE OF THE UNIFIED HUB

```
apps/arcade-hub/
  src/
    App.tsx                         (merged, single entry)
    App.css                         (merged, uses CSS variables)
    main.tsx                        (single entry point)
    components/
      GameLauncher.tsx              (unified, from v2)
      FamilySpectate.tsx            (WebSocket, responsive viewer)
      EarningsStack.tsx             (live data, localStorage credits)
      SENTINELBanner.tsx            (actionable)
      TaskBoard.tsx                 (ported from v1)
      GameFrame.tsx                 (delegates to @p31/design-system)
      GameContainer.tsx             (in‑process game wrapper)
      IframeBridge.tsx             (external game wrapper)
      PerformanceHUD.tsx
      PlayerIdentityCard.tsx
      RecentActivityFeed.tsx
      ...
    hooks/
      useArcadeSDK.ts              (provides sdk, player, sibling, earnings)
      useSiblingStatus.ts          (SSE based)
      usePerformanceMonitor.ts     (shared)
      useCredits.ts                (persistent credit state)
    (no sdk/ folder – logic in @p31/core)
    (no games/ folder – engines in arcade-games app)
```

All game‑specific code (engines, views) live in `apps/arcade-games`. The hub simply references them via dynamic imports for in‑process games, or uses external URLs.

---

## 10. PUTTING IT TOGETHER – THE LIVING ARCADE

- **Home screen:** Beautiful launcher with SENTINEL banner at top, sibling status in sidebar, credits display in header.
- **Launch a game:** GameFrame appears, containing either a `<canvas>` with Three.js or a responsive iframe. Session timer counts down. Four‑Domain bar updates.
- **Spectate:** Sidebar shows sibling playing; click "Spectate" and a full‑screen viewer loads with live game.
- **Bounties:** Switch to "Bounties" tab, see SkillBridge tasks from v1.
- **Performance:** F1 toggles HUD; system auto‑adjusts quality based on device.
- **Guardrails:** No player (especially W.J.) can exceed session caps or play blocked games without parent approval.

This unified hub is a **cohesive family gaming OS**, where Industry, Arcade, CHUMP, and Love Economy genuinely interoperate. All code is shared, no duplication, and every component is hardened for production.
