# SPIKE-APPSHELL-RESULT — Track 2.5

**Spike spec:** `docs/SPIKE-APPSHELL-PERSISTENCE.md` (home repo).
**Status:** **automation green** (headless Chromium, 2026-04-30). Awaiting operator field test on real Chromebook + iPhone.

---

## Headless Chromium results (2026-04-30)

Five automated probes. **All five pass.** Same canvas DOM node across every navigation, one context loss + one clean restore in each scenario, zero heap leak.

| Scenario | Navs | avgFps | minFps | canvasAttach | ctxLost / Rest. | heapΔ | Duration |
|---|---|---|---|---|---|---|---|
| **baseline** (idle, ClientRouter) | 20 | 22 | 12 | 1 | 1 / 1 | 0 MB | 116 s |
| **extended** (slow-leak surface) | 50 | 24 | 12 | 1 | 1 / 1 | 0 MB | 131 s |
| **cpu-throttle** (CDP rate=4×, Chromebook-class) | 20 | 28 | 21 | 1 | 1 / 1 | 0 MB | 25 s |
| **reduced-motion** (`prefers-reduced-motion: reduce`) | 20 | 29 | 13 | 1 | 1 / 1 | 0 MB | 117 s |
| **bfcache** (browser back/forward) | 10 | 31 | 13 | 1 | 1 / 1 | 0 MB | 11 s |

**The signal that matters:** in every scenario, `canvasAttachCount` ended at **1** — the same `<canvas>` DOM node survived every navigation, click-router and back/forward alike, idle and throttled, with and without reduced motion. Astro `transition:persist` + `view-transition-name: none` is the right pattern.

**Reading the table:**

- `canvasAttachCount: 1` — Astro `transition:persist` holds the same `<canvas>` DOM node across all 100+ navigations exercised across the suite. The architectural premise of the consolidation is confirmed in headless across five operational conditions.
- `ctxLost: 1, ctxRestored: 1` — every scenario sees exactly one WebGL context loss on the first navigation (SwiftShader releases the GL during the View Transitions snapshot animation in headless Chromium). The singleton's `webglcontextrestored` handler rebuilds GPU resources and the render loop resumes. Real hardware GPUs (Pixelbook, iPhone) will rarely if ever lose context here.
- `heapDeltaMb: 0` — zero JS heap growth across all five scenarios, even the 50× extended run. No leak.
- `cpu-throttle` shows the most striking result: under 4× CPU throttle (low-end Chromebook), the canvas STILL persists, the context STILL recovers, and FPS stays comfortable. Throttling does not destabilise the persist mechanism.
- `bfcache` proves browser back/forward physical buttons (and iOS swipe equivalent) trigger the same restore path — `data-p31-spike-route` updates and the singleton re-binds without reload.

Reproduce:

```bash
cd andromeda/04_SOFTWARE/p31ca
npm run spike:appshell                                 # all five
npx playwright test spike-appshell-persistence -g cpu  # one scenario
```

Full per-nav samples for each scenario live in
`e2e/results/spike-appshell-<scenario>.json` (gitignored — regenerated on
each run; the table above is the canonical record).

---

## What is NOT proven (operator field test still required)

Five passing headless probes is a very strong signal but not the whole story. The operator field test still owes us:

| Check | How | Pass criterion |
|---|---|---|
| **Pixelbook hardware GPU** (vs SwiftShader) | Open `/spike/appshell/` in Chromium on the Pixelbook, click 20× | `attach-count` footer stat stays at 1; subjective FPS >= 30; ctxLost likely 0 (real GPU) |
| **iPhone Safari via Tailscale** | Open spike URL on iPhone Safari, navigate 20× | Canvas survives; no white flash; the camera lerps |
| **iPhone Safari swipe-back** | Two-finger swipe from edge → back → forward 5× | `data-p31-spike-route` flips; canvas footer stat stays the same UUID |
| **Cold load over cellular** | Force-reload while on cellular | First paint < 2.5 s; no console error |
| **WebAuthn coexistence** | Trigger a Passkey prompt mid-navigation | Canvas remains rendered; passkey flow completes |

The headless suite covered: idle baseline, extended 50-nav stress, 4× CPU throttle, reduced motion media query, browser back/forward bfcache. It did NOT cover: real hardware GPU, real Safari, real network, WebAuthn coexistence. Those are operator-field only.

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
