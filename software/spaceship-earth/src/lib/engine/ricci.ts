 *
 * Ollivier-Ricci Curvature (κ) calculation for mesh topology.
 * Section 1.2 of Master Doctrine.
 *
 *
   *
   * Uses a sigmoid‑inspired response: latency up to 500ms has minor impact,
   * beyond 2000ms rapidly degrades curvature. Noise scales non‑linearly.
   *

    // Noise penalty: noise^1.5 (more punishing at high noise)
    const noisePenalty = Math.pow(n, 1.5);

    // Combined friction: weighted sum (latency dominates)
    const friction = (latencyPenalty * 0.7) + (noisePenalty * 0.3);

    // Base curvature = 1.0, subtract friction, then clamp to [0.5, 1.5]
    let curvature = 1.0 - friction;
    curvature = clamp(curvature, 0.5, 1.5);

    if (debugEnabled()) {
      console.debug(`[Ricci] curvature: l=${l}ms n=${n.toFixed(2)} → κ=${curvature.toFixed(3)}`);
    }

   *

   *
   *

    const curvature = this.calculateCurvature(safeInput.latency, safeInput.noise);
    const resilience = this.getResilience(safeInput.activeNodes);
    const scale = this.getScaleFactor(curvature);


  const oscillation = Math.sin(t * 0.5) * 0.08;
  let result = k + oscillation;

  return clamp(result, 0.5, 1.5);
}

declare global {
  interface Window {
    __P31_RICCI_DEBUG?: {
      enable: () => void;
      disable: () => void;
      status: () => boolean;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__P31_RICCI_DEBUG = {
}
