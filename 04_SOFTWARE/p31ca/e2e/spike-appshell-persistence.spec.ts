/**
 * spike-appshell-persistence.spec.ts — automation half of Track 2.5 spike.
 *
 * Drives 20× navigations between /spike/appshell/ and /spike/appshell/dome/
 * in headless Chromium and writes a JSON report to e2e/results/spike-appshell.json
 * for the operator's field-test follow-up.
 *
 * Pass criteria (matches docs/SPIKE-APPSHELL-PERSISTENCE.md "green path"):
 *   1. canvasId is non-empty after first paint
 *   2. canvasAttachCount stays at 1 over 20 navigations
 *      (the strong claim — same HTMLCanvasElement DOM node persists across
 *      every Astro ClientRouter navigation via transition:persist)
 *   3. ctxLost === ctxRestored (every WebGL context-loss is recovered;
 *      headless SwiftShader loses contexts during view-transition snapshots
 *      on real hardware GPUs this rarely happens, but the code path must
 *      handle it gracefully)
 *   4. ctxHealthy is true at the end of the run (final state is renderable)
 *   5. min FPS sample stays >= 5 in headless (>= 30 expected on real
 *      Chromebook — that's the operator's field test)
 *   6. memory delta over the run < 25 MB JS heap (best-effort; only Chromium
 *      via CDP; skipped if perf.memory unavailable)
 *
 * Stop conditions (red path):
 *   - canvasAttachCount > 1 mid-run -> fail (Astro is not persisting the
 *     canvas; the architectural premise is wrong)
 *   - ctxLost > ctxRestored at end -> fail (context was lost and not
 *     recovered)
 *   - canvas data-id changes mid-run -> fail
 *   - final ctxHealthy === false -> fail (last frame is unrenderable)
 *
 * Out of scope (operator field test only):
 *   - bfcache (browser back/forward physical buttons)
 *   - real-device touch swipes
 *   - throttled CPU on actual Chromebook
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const NAV_COUNT = 20;
const FPS_FLOOR_HEADLESS = 15;
const FPS_FLOOR_FIELD = 30; // documented; not enforced in headless
const MEMORY_DELTA_BUDGET_MB = 25;

interface ShellStats {
  canvasId: string;
  navCount: number;
  canvasAttachCount: number;
  ctxLost: number;
  ctxRestored: number;
  ctxHealthy: boolean;
  fps: number;
  route: 'home' | 'dome' | null;
  bytes: number;
}

interface NavSample {
  index: number;
  route: 'home' | 'dome';
  canvasId: string;
  navCount: number;
  canvasAttachCount: number;
  ctxLost: number;
  ctxRestored: number;
  ctxHealthy: boolean;
  fps: number;
  jsHeapMb: number | null;
  url: string;
  elapsedMs: number;
}

declare global {
  interface Window {
    __p31AppShell: ShellStats;
  }
}

async function readStats(page: import('@playwright/test').Page): Promise<ShellStats> {
  return await page.evaluate(() => window.__p31AppShell);
}

async function readJsHeapMb(page: import('@playwright/test').Page): Promise<number | null> {
  /* perf.memory is non-standard, Chromium-only, gated by allow-list; treat as
   * best-effort. If unavailable, return null and skip the budget check. */
  return await page.evaluate(() => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    return perf.memory ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024)) : null;
  });
}

test.describe('spike — AppShell persistence (Track 2.5)', () => {
  test('canvas survives 20× navigations between / and /dome', async ({ page }) => {
    const samples: NavSample[] = [];
    const startedAt = Date.now();

    /* Land on home; wait for the singleton to mount. */
    await page.goto('/spike/appshell/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Boolean(window.__p31AppShell && window.__p31AppShell.canvasId),
      null,
      { timeout: 10_000 }
    );
    /* Let two rAF frames pass so fps has at least one dt sample. */
    await page.waitForTimeout(250);

    const initial = await readStats(page);
    expect(initial.canvasId, 'canvasId set after first paint').toBeTruthy();
    const baseCanvasId = initial.canvasId;
    const baseHeap = await readJsHeapMb(page);

    samples.push({
      index: 0,
      route: 'home',
      canvasId: initial.canvasId,
      navCount: initial.navCount,
      canvasAttachCount: initial.canvasAttachCount,
      ctxLost: initial.ctxLost,
      ctxRestored: initial.ctxRestored,
      ctxHealthy: initial.ctxHealthy,
      fps: initial.fps,
      jsHeapMb: baseHeap,
      url: page.url(),
      elapsedMs: Date.now() - startedAt,
    });

    for (let i = 1; i <= NAV_COUNT; i++) {
      const target = i % 2 === 1 ? '/spike/appshell/dome/' : '/spike/appshell/';
      const expectedRoute: 'home' | 'dome' = i % 2 === 1 ? 'dome' : 'home';

      /* Click the in-page <a> so we exercise Astro ClientRouter, not full
       * browser navigation. */
      const linkText = expectedRoute;
      await page.getByRole('link', { name: linkText, exact: true }).click();

      /* Wait until the singleton sees the new route AND has either a fresh
       * fps sample OR a recovered context (lost-then-restored is fine,
       * but the loop must be running again). */
      await page.waitForFunction(
        (route) => {
          const s = window.__p31AppShell;
          if (!s) return false;
          if (s.route !== route) return false;
          /* Healthy + producing frames, OR was lost but restored and ready */
          return s.ctxHealthy && (s.fps > 0 || s.ctxRestored >= s.ctxLost);
        },
        expectedRoute,
        { timeout: 10_000 }
      );
      await page.waitForTimeout(200);

      const stats = await readStats(page);
      const heap = await readJsHeapMb(page);
      samples.push({
        index: i,
        route: expectedRoute,
        canvasId: stats.canvasId,
        navCount: stats.navCount,
        canvasAttachCount: stats.canvasAttachCount,
        ctxLost: stats.ctxLost,
        ctxRestored: stats.ctxRestored,
        ctxHealthy: stats.ctxHealthy,
        fps: stats.fps,
        jsHeapMb: heap,
        url: page.url(),
        elapsedMs: Date.now() - startedAt,
      });

      expect(
        stats.canvasAttachCount,
        `canvas DOM node must persist across nav ${i} (${expectedRoute}) — Astro transition:persist holds the <canvas> across ClientRouter navigations`
      ).toBe(1);
      expect(
        stats.canvasId,
        `canvas data-id must remain ${baseCanvasId} after nav ${i}`
      ).toBe(baseCanvasId);
      expect(
        stats.ctxRestored,
        `every webglcontextlost must be recovered by webglcontextrestored (nav ${i}: lost ${stats.ctxLost}, restored ${stats.ctxRestored})`
      ).toBeGreaterThanOrEqual(stats.ctxLost);
      expect(
        stats.ctxHealthy,
        `GL context must be healthy at end of nav ${i}`
      ).toBe(true);
    }

    /* Aggregate report. */
    const fpsSamples = samples.map((s) => s.fps).filter((f) => f > 0);
    const minFps = fpsSamples.length ? Math.min(...fpsSamples) : 0;
    const avgFps = fpsSamples.length
      ? Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length)
      : 0;
    const heapSamples = samples
      .map((s) => s.jsHeapMb)
      .filter((h): h is number => typeof h === 'number');
    const heapDelta =
      heapSamples.length > 1
        ? Math.max(...heapSamples) - Math.min(...heapSamples)
        : null;

    expect(
      minFps,
      `min FPS over ${NAV_COUNT} navs (headless floor ${FPS_FLOOR_HEADLESS}, field ${FPS_FLOOR_FIELD})`
    ).toBeGreaterThanOrEqual(FPS_FLOOR_HEADLESS);

    if (heapDelta !== null) {
      expect(
        heapDelta,
        `JS heap delta < ${MEMORY_DELTA_BUDGET_MB} MB`
      ).toBeLessThan(MEMORY_DELTA_BUDGET_MB);
    }

    /* Persist the report regardless of pass/fail (Playwright will skip writes
     * after a failed assertion above; that's fine — failing the test is the
     * red signal). */
    const outDir = path.join(process.cwd(), 'e2e', 'results');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'spike-appshell.json');
    const report = {
      schema: 'p31.spike.appshell/1.0.0',
      ranAt: new Date().toISOString(),
      navCount: NAV_COUNT,
      canvasId: baseCanvasId,
      result: 'green',
      thresholds: {
        fpsFloorHeadless: FPS_FLOOR_HEADLESS,
        fpsFloorField: FPS_FLOOR_FIELD,
        memoryDeltaBudgetMb: MEMORY_DELTA_BUDGET_MB,
      },
      summary: {
        avgFps,
        minFps,
        canvasAttachCountFinal: samples[samples.length - 1]?.canvasAttachCount ?? 0,
        ctxLostTotal: samples[samples.length - 1]?.ctxLost ?? 0,
        ctxRestoredTotal: samples[samples.length - 1]?.ctxRestored ?? 0,
        ctxHealthyFinal: samples[samples.length - 1]?.ctxHealthy ?? false,
        heapDeltaMb: heapDelta,
        durationMs: samples[samples.length - 1]?.elapsedMs ?? 0,
      },
      samples,
      operatorFieldTest: {
        required: true,
        instructions:
          'Open /spike/appshell/ on a real Chromebook + iPhone. Navigate back-and-forth 20× including bfcache (browser back button). Confirm: no black flash, the camera lerps smoothly between routes, the page footer "canvas identity" stays the same UUID. Record subjective fps + battery delta.',
        recordTo: 'andromeda/04_SOFTWARE/p31ca/docs/SPIKE-APPSHELL-RESULT.md',
      },
    };
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`spike-appshell: wrote ${out}`);
  });
});
