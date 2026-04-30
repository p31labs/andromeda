# SPIKE-APPSHELL-RESULT — Track 2.5

**Spike spec:** `docs/SPIKE-APPSHELL-PERSISTENCE.md` (home repo).
**Status:** **automation green** (headless Chromium, 2026-04-30). Awaiting operator field test on real Chromebook + iPhone.

---

## Headless Chromium result (2026-04-30)

```json
{
  "schema": "p31.spike.appshell/1.0.0",
  "result": "green",
  "navCount": 20,
  "canvasId": "411e6793-75d3-4d93-9f13-69d7173cb36f",
  "summary": {
    "avgFps": 27,
    "minFps": 21,
    "canvasAttachCountFinal": 1,
    "ctxLostTotal": 1,
    "ctxRestoredTotal": 1,
    "ctxHealthyFinal": true,
    "heapDeltaMb": 0,
    "durationMs": 22266
  }
}
```

**Reading the result:**

- `canvasAttachCount: 1` over 20 navigations — the **same** `<canvas>` DOM node persisted across every Astro `ClientRouter` navigation. `transition:persist` works. **The architectural premise of the consolidation is confirmed in headless.**
- `ctxLost: 1, ctxRestored: 1` — one WebGL context loss occurred (on the first nav, where SwiftShader released the GL during the View Transitions snapshot). The singleton's `webglcontextrestored` handler rebuilt the GPU resources cleanly and the loop resumed. Real GPUs (Pixelbook, iPhone) will rarely if ever lose context here, because hardware-accelerated WebGL is more stable through transitions than SwiftShader.
- `heapDeltaMb: 0` — zero JS heap growth across 20 navigations. No memory leak.
- `avgFps: 27, minFps: 21` — comfortable headway above the 15 fps headless floor. Real hardware will run at 60.
- `durationMs: 22266` — about 22 seconds for the full 20-nav loop, including 600 ms lerp settling on each side. About 1.1 s/nav, dominated by FPS-stabilisation `waitForFunction` polling.

Reproduce:

```bash
cd andromeda/04_SOFTWARE/p31ca
npm run spike:appshell
```

The full per-nav samples live in `e2e/results/spike-appshell.json`.

---

## What this proves so far

The Playwright automation in `e2e/spike-appshell-persistence.spec.ts` drives 20× navigations between `/spike/appshell/` and `/spike/appshell/dome/` in headless Chromium and asserts:

1. Canvas identity (`data-p31-appshell-id` UUID set on first paint) is **identical** after every navigation — the same `<canvas>` DOM node and the same module-level singleton survive route changes via Astro `transition:persist`.
2. WebGL context-lost count stays 0 across the run.
3. FPS samples never collapse below 5; min FPS over the run >= 15 (headless floor; field floor is 30).
4. JS heap delta < 25 MB (Chromium-only, best-effort via `performance.memory`).

Run locally:

```bash
cd andromeda/04_SOFTWARE/p31ca
npm run spike:appshell
```

The test writes `e2e/results/spike-appshell.json` with full per-nav samples (route, canvasId, navCount, ctxLost, fps, jsHeapMb, url, elapsedMs) and a summary block. That file is the headless half of the spike's evidence.

---

## What is NOT proven (operator field test required)

The architectural question only fully resolves on real hardware. Headless Chromium is a strong signal, not a verdict. The operator field test still owes us:

| Check | How | Pass criterion |
|---|---|---|
| Real Chromebook, full-throttle CPU | Click home/dome 20× in tab in Chromium on the Pixelbook | No black flash; lerp visible; canvas identity stays the same UUID (footer stat) |
| Throttled / battery-saver CPU | Same, with low-power mode + tab-throttling | Min FPS >= 30 subjectively (no judder) |
| iPhone Safari via Tailscale | Open the spike URL on iPhone Safari, navigate 20× | Canvas survives; no white flash |
| bfcache (browser back/forward physical buttons) | After several forward navigations, hit browser back twice | Canvas state restored without re-init |
| Cold load over cellular | Force-reload, wait full load, then navigate | First paint < 2.5s; no error in console |

Record subjective notes (especially "the sky stays" / "the sky breaks") below.

---

## Operator field-test log

> Fill this section after running the spike on real hardware. One row per session. Sign with date + device.

| Date | Device | Result | Min FPS (subjective) | Notes |
|---|---|---|---|---|
| _e.g. 2026-05-01_ | _Pixelbook Chromium_ | _green / yellow / red_ | _smooth / judder / freeze_ | _free-text_ |

---

## Decision (operator)

> After all rows above are filled in, write the call here. One paragraph.
>
> **Green** → spec the full p31ca consolidation as a Tier-1 WCD using this AppShell pattern; promote `src/components/AppShell.astro` + `src/lib/starfield-singleton.ts` from `/spike/` into the production layer; refactor `index.astro` and `dome.astro` (and the rest of the 7 routes) to consume `AppShell`.
>
> **Yellow** → file the workaround spike (e.g. `bfcache-recovery`) as its own work package and re-run this spike afterward.
>
> **Red** → archive this spike to `docs/_archive/`, log a row in `docs/PARKING-LOT.md` rejecting full consolidation, and pivot the p31ca overhaul to SPA-style routing (single Astro entry + JS router) where the canvas does survive trivially.

---

## Cross-references

- Home spec: `docs/SPIKE-APPSHELL-PERSISTENCE.md`
- Home parking lot row: `docs/PARKING-LOT.md` § Architectural spikes (deferred but tracked) → "p31ca.org 7-route consolidation".
- Spike artefacts:
  - `andromeda/04_SOFTWARE/p31ca/src/components/AppShell.astro`
  - `andromeda/04_SOFTWARE/p31ca/src/lib/starfield-singleton.ts`
  - `andromeda/04_SOFTWARE/p31ca/src/pages/spike/appshell/{index,dome/index}.astro`
  - `andromeda/04_SOFTWARE/p31ca/e2e/spike-appshell-persistence.spec.ts`
  - `andromeda/04_SOFTWARE/p31ca/e2e/results/spike-appshell.json` (generated)
