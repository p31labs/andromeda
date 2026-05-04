/**
 * P31 Star Plate — fixed stars with individual data streams.
 * Each star periodically emits a falling column of hex/mesh glyphs in its own color.
 */

// P31 color palette
const STAR_COLORS = [
  [77,  184, 168],  // teal (dominant)
  [77,  184, 168],
  [77,  184, 168],
  [204, 98,  71],   // coral
  [59,  163, 114],  // phosphor
  [205, 168, 82],   // butter
  [245, 240, 232],  // warm white
  [255, 255, 255],  // pure white (rare)
];

// Data stream character pools
const HEX   = '0123456789ABCDEF';
const MESH  = ['K','4','P','O','C','a','3','1','F','E','R','S','Ψ','Δ','λ','∞'];
const GLYPHS = HEX + HEX + MESH.join('');  // hex-heavy, occasional mesh token

const STREAM_LEN_MIN = 5;
const STREAM_LEN_MAX = 14;
const CHAR_SPACING   = 9;   // px between characters (canvas px, pre-dpr)
const CHAR_SIZE      = 7;   // font size in canvas px
const STREAM_SPEED   = 38;  // ms per character reveal
const MAX_SIMULTANEOUS = 12; // max active streams across all stars

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readCssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

const PRESET_PREFIX = {
  soup: 'soup', hub: 'hub', commandCenter: 'command-center', operatorDesk: 'operator-desk',
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ preset?: string; seed?: number; dotCount?: number }} [opts]
 */
export function initStaticStarPlate(canvas, opts = {}) {
  const preset   = opts.preset || 'commandCenter';
  const slug     = PRESET_PREFIX[preset] || preset.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const cssDotCount = readCssVar(`--p31-sf-preset-${slug}-dot-count`, NaN);

  let dotCount = opts.dotCount != null
    ? opts.dotCount
    : Number.isFinite(cssDotCount) ? cssDotCount
    : preset === 'operatorDesk' ? 120 : 140;

  const reduced =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || (typeof localStorage !== 'undefined' && localStorage.getItem('p31.starfield.off') === '1')) {
    canvas.style.opacity = '0';
    return { destroy() {} };
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };

  const rng0 = mulberry32(opts.seed ?? 0x5031);
  let dots   = [];
  let w = 1, h = 1, dpr = 1;
  let raf = 0;
  let running = true;

  // ── Layout ──────────────────────────────────────────────────────────────────
  function layout() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, Math.floor(rect.width  * dpr));
    h = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width  = w;
    canvas.height = h;

    const rng = mulberry32(opts.seed ?? 0x5031);  // deterministic re-seed on resize
    dots = [];
    for (let i = 0; i < dotCount; i++) {
      const ci    = Math.floor(rng() * STAR_COLORS.length);
      const [r, g, b] = STAR_COLORS[ci];
      const alpha = 0.22 + rng() * 0.60;           // 0.22 – 0.82
      const size  = alpha > 0.6 ? rng() * 1.2 + 0.6 : rng() * 0.7 + 0.2;
      // Stream timing: each star gets its own random interval (4 – 20 s)
      const intervalMs = 4000 + rng() * 16000;
      const phaseMs    = rng() * intervalMs;       // stagger initial fires
      dots.push({
        x: rng() * w, y: rng() * h,
        r: size * dpr,
        rgb: [r, g, b],
        alpha,
        color: `rgba(${r},${g},${b},${alpha.toFixed(3)})`,
        // stream state
        stream:       null,   // { chars[], startMs, len }
        intervalMs,
        nextStreamAt: performance.now() + phaseMs,
      });
    }
  }

  // ── Stream trigger ───────────────────────────────────────────────────────────
  function maybeSpawnStream(dot, now) {
    if (dot.stream) return;                          // already active
    if (now < dot.nextStreamAt) return;
    // Respect max simultaneous cap
    const active = dots.filter(d => d.stream).length;
    if (active >= MAX_SIMULTANEOUS) { dot.nextStreamAt = now + 1000; return; }

    const len  = STREAM_LEN_MIN + Math.floor(Math.random() * (STREAM_LEN_MAX - STREAM_LEN_MIN + 1));
    const chars = Array.from({ length: len }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    dot.stream = { chars, startMs: now, len };
    dot.nextStreamAt = now + dot.intervalMs + (Math.random() * 4000 - 2000);
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${CHAR_SIZE * dpr}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';

    for (const dot of dots) {
      // Star core
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();

      // Data stream
      maybeSpawnStream(dot, now);
      if (!dot.stream) continue;

      const { chars, startMs, len } = dot.stream;
      const elapsed = now - startMs;
      const totalDur = len * STREAM_SPEED + 600;    // reveal + linger + fade tail
      if (elapsed > totalDur) { dot.stream = null; continue; }

      const revealed = Math.min(len, Math.floor(elapsed / STREAM_SPEED) + 1);
      const [r, g, b] = dot.rgb;

      for (let i = 0; i < revealed; i++) {
        const cy = dot.y + (i + 1) * CHAR_SPACING * dpr;
        if (cy > h + 20) break;

        // Head char: bright; trail: fades toward tail
        const trailFrac  = 1 - i / len;            // 1.0 at head, 0 at tail
        const fadeOut    = Math.max(0, 1 - (elapsed - len * STREAM_SPEED) / 600);
        const charAlpha  = trailFrac * trailFrac * fadeOut * 0.95;

        ctx.fillStyle = `rgba(${r},${g},${b},${charAlpha.toFixed(3)})`;
        ctx.fillText(chars[i], dot.x, cy);
      }
    }
  }

  // ── Loop ────────────────────────────────────────────────────────────────────
  function loop(now) {
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function onVis() {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else {
      running = true;
      raf = requestAnimationFrame(loop);
    }
  }

  const ro = new ResizeObserver(() => { layout(); });
  ro.observe(canvas);
  layout();

  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(loop);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      try { ro.disconnect(); } catch { /* ignore */ }
    },
  };
}
