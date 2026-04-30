/**
 * starfield-singleton.ts — module-level singleton for the AppShell spike.
 *
 * Owns:
 *   - one HTMLCanvasElement
 *   - one WebGL2RenderingContext (or WebGL1 fallback)
 *   - one rAF loop
 *   - one camera state with smooth lerp on route change
 *
 * Exposes diagnostics on `window.__p31AppShell` for the Playwright spike test:
 *   {
 *     canvasId: string         // UUID set on first paint, must persist
 *     navCount: number         // number of setStarfieldRoute() calls
 *     ctxLost: number          // count of webglcontextlost events
 *     fps: number              // rolling 60-frame average
 *     route: 'home' | 'dome' | null
 *     bytes: number            // approx GPU buffers (vbo size)
 *   }
 *
 * The visual is intentionally minimal — this spike is about WebGL **persistence**,
 * not aesthetics. A few hundred slowly drifting points, a slow camera dolly that
 * lerps over ~600ms when route changes. If the canvas survives navigation, the
 * camera dolly transitions smoothly between routes. If it does not, the point
 * cloud either flashes black or the camera teleports.
 */

const CANVAS_ID = (() => {
  /* generate once per module instance */
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `appshell-${Math.random().toString(36).slice(2, 10)}`;
})();

interface ShellStats {
  canvasId: string;
  navCount: number;
  /** Count of distinct HTMLCanvasElement instances ever seen by the
   * singleton. If transition:persist works correctly, this is 1 forever.
   * If Astro creates a new canvas on each nav, this grows. */
  canvasAttachCount: number;
  /** Count of webglcontextlost events on the underlying GL context. Real
   * devices also lose contexts (background tab, GPU driver, low memory) —
   * production code must implement webglcontextrestored, which this
   * singleton does. The pass condition is `ctxRestored >= ctxLost`, not
   * `ctxLost === 0`. */
  ctxLost: number;
  /** Count of webglcontextrestored events handled. */
  ctxRestored: number;
  /** True if the GL context is currently usable (not lost-and-not-yet-
   * restored). The render loop pauses when this is false. */
  ctxHealthy: boolean;
  fps: number;
  route: 'home' | 'dome' | null;
  bytes: number;
}

interface ShellState {
  canvas: HTMLCanvasElement | null;
  gl: WebGLRenderingContext | WebGL2RenderingContext | null;
  program: WebGLProgram | null;
  vbo: WebGLBuffer | null;
  vao: WebGLVertexArrayObject | null;
  uTime: WebGLUniformLocation | null;
  uCamZ: WebGLUniformLocation | null;
  uAspect: WebGLUniformLocation | null;
  uHue: WebGLUniformLocation | null;
  numPoints: number;
  rafId: number;
  startedAt: number;
  lastFrameAt: number;
  frameAccum: number[];
  navCount: number;
  canvasAttachCount: number;
  ctxLost: number;
  ctxRestored: number;
  ctxHealthy: boolean;
  route: 'home' | 'dome' | null;
  /** camera target Z + current Z (smooth lerp) */
  camTarget: number;
  camCurrent: number;
  hueTarget: number;
  hueCurrent: number;
  bytes: number;
  stopped: boolean;
}

const ROUTE_CAM: Record<'home' | 'dome', { z: number; hue: number }> = {
  home: { z: 0, hue: 0.55 }, // gentle teal
  dome: { z: -1.2, hue: 0.05 }, // pulled deeper, coral-warm
};

let state: ShellState | null = null;
/* WeakSet tracks every HTMLCanvasElement we've ever attached to. If
 * transition:persist works, every nav yields the SAME canvas, the WeakSet
 * already has it, and canvasAttachCount stays at 1. If Astro creates a new
 * canvas on each nav, the WeakSet misses, canvasAttachCount grows. */
const seenCanvases = new WeakSet<HTMLCanvasElement>();
let canvasAttachCount = 0;

function getOrInit(canvas: HTMLCanvasElement): ShellState {
  /* Same canvas, already initialised → return existing singleton. */
  if (state && state.canvas === canvas) return state;

  /* New canvas observed. Decide whether this is the *first* canvas ever
   * (canvasAttachCount goes 0 → 1, normal first paint) or a subsequent
   * fresh canvas (canvasAttachCount > 1, the architectural failure mode). */
  if (!seenCanvases.has(canvas)) {
    seenCanvases.add(canvas);
    canvasAttachCount += 1;
  }
  if (state && state.canvas !== canvas) {
    /* Canvas got re-created across navigation. Tear down old GL context
     * cleanly before rebuilding. Do NOT bump ctxLost — that counter is
     * reserved for actual webglcontextlost events. canvasAttachCount above
     * tells the test this happened. */
    cancelAnimationFrame(state.rafId);
    const old = state;
    if (old.gl) {
      try {
        if (old.program) old.gl.deleteProgram(old.program);
        if (old.vbo) old.gl.deleteBuffer(old.vbo);
        if (old.vao && 'deleteVertexArray' in old.gl) {
          (old.gl as WebGL2RenderingContext).deleteVertexArray(old.vao);
        }
      } catch {
        /* GL context may already be lost — ignore. */
      }
    }
  }

  /* Hint for context stability: high-performance discourages the browser
   * from migrating off the GPU; failIfMajorPerformanceCaveat=false lets
   * SwiftShader still serve a context in headless. */
  const ctxAttribs: WebGLContextAttributes = {
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
  };
  const gl =
    (canvas.getContext('webgl2', ctxAttribs) as WebGL2RenderingContext | null) ||
    (canvas.getContext('webgl', ctxAttribs) as WebGLRenderingContext | null);
  if (!gl) throw new Error('starfield-singleton: no WebGL context');

  resizeCanvasToDisplay(canvas);

  const VS = `
    #version 100
    attribute vec3 aPos;
    uniform float uTime;
    uniform float uCamZ;
    uniform float uAspect;
    varying float vDepth;
    void main() {
      float t = uTime * 0.05;
      float x = aPos.x + sin(aPos.z * 4.0 + t) * 0.08;
      float y = aPos.y + cos(aPos.z * 3.0 + t * 1.2) * 0.08;
      float z = aPos.z + uCamZ;
      vDepth = clamp(0.5 - z * 0.5, 0.05, 1.0);
      float scale = 1.0 / max(0.2, 1.0 + z);
      gl_Position = vec4(x * scale / uAspect, y * scale, z * 0.4, 1.0);
      gl_PointSize = mix(1.2, 3.0, vDepth);
    }
  `;
  const FS = `
    #version 100
    precision mediump float;
    uniform float uHue;
    varying float vDepth;
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float r = length(uv);
      if (r > 0.5) discard;
      float a = (1.0 - r * 2.0) * vDepth;
      vec3 rgb = hsv2rgb(vec3(uHue, 0.45, 0.95));
      gl_FragColor = vec4(rgb, a);
    }
  `;

  const program = compileProgram(gl, VS, FS);
  if (!program) throw new Error('starfield-singleton: program failed to link');

  const N = 600;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }
  const vbo = gl.createBuffer();
  if (!vbo) throw new Error('starfield-singleton: failed to create vbo');
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  let vao: WebGLVertexArrayObject | null = null;
  if ('createVertexArray' in gl) {
    vao = (gl as WebGL2RenderingContext).createVertexArray();
    (gl as WebGL2RenderingContext).bindVertexArray(vao);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  }

  const uTime = gl.getUniformLocation(program, 'uTime');
  const uCamZ = gl.getUniformLocation(program, 'uCamZ');
  const uAspect = gl.getUniformLocation(program, 'uAspect');
  const uHue = gl.getUniformLocation(program, 'uHue');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const next: ShellState = {
    canvas,
    gl,
    program,
    vbo,
    vao,
    uTime,
    uCamZ,
    uAspect,
    uHue,
    numPoints: N,
    rafId: 0,
    startedAt: performance.now(),
    lastFrameAt: performance.now(),
    frameAccum: [],
    navCount: state?.navCount ?? 0,
    canvasAttachCount,
    ctxLost: state?.ctxLost ?? 0,
    ctxRestored: state?.ctxRestored ?? 0,
    ctxHealthy: true,
    route: null,
    camTarget: ROUTE_CAM.home.z,
    camCurrent: ROUTE_CAM.home.z,
    hueTarget: ROUTE_CAM.home.hue,
    hueCurrent: ROUTE_CAM.home.hue,
    bytes: positions.byteLength,
    stopped: false,
  };

  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      /* Standard WebGL pattern: preventDefault on lost so the browser will
       * fire `webglcontextrestored` once the GPU is available again. */
      e.preventDefault();
      next.ctxLost += 1;
      next.ctxHealthy = false;
      cancelAnimationFrame(next.rafId);
    },
    { once: false }
  );

  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      /* On restore, all GPU resources (programs, buffers, textures) are
       * gone and must be rebuilt. Easiest path: re-run getOrInit which
       * detects the same canvas, sees state.gl is gone, and rebuilds. */
      next.ctxRestored += 1;
      rebuildGpuResources(next);
      next.ctxHealthy = true;
      if (!next.stopped) loop();
    },
    { once: false }
  );

  state = next;
  loop();
  exposeWindow();
  return next;
}

function compileProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string
): WebGLProgram | null {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.warn('starfield-singleton: vs error', gl.getShaderInfoLog(vs));
    return null;
  }
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.warn('starfield-singleton: fs error', gl.getShaderInfoLog(fs));
    return null;
  }
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('starfield-singleton: link error', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function resizeCanvasToDisplay(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w || canvas.clientWidth || 800;
    canvas.height = h || canvas.clientHeight || 600;
  }
}

function rebuildGpuResources(s: ShellState): void {
  /* Called after webglcontextrestored. The browser keeps the same GL
   * object reference but every resource (program/buffer/vao/textures) is
   * lost. We re-create them against the existing context. */
  if (!s.canvas) return;
  const ctxAttribs: WebGLContextAttributes = {
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
  };
  /* getContext on a restored canvas returns the *same* gl reference. */
  const gl =
    (s.canvas.getContext('webgl2', ctxAttribs) as WebGL2RenderingContext | null) ||
    (s.canvas.getContext('webgl', ctxAttribs) as WebGLRenderingContext | null);
  if (!gl) return;
  s.gl = gl;

  const VS = `
    #version 100
    attribute vec3 aPos;
    uniform float uTime;
    uniform float uCamZ;
    uniform float uAspect;
    varying float vDepth;
    void main() {
      float t = uTime * 0.05;
      float x = aPos.x + sin(aPos.z * 4.0 + t) * 0.08;
      float y = aPos.y + cos(aPos.z * 3.0 + t * 1.2) * 0.08;
      float z = aPos.z + uCamZ;
      vDepth = clamp(0.5 - z * 0.5, 0.05, 1.0);
      float scale = 1.0 / max(0.2, 1.0 + z);
      gl_Position = vec4(x * scale / uAspect, y * scale, z * 0.4, 1.0);
      gl_PointSize = mix(1.2, 3.0, vDepth);
    }
  `;
  const FS = `
    #version 100
    precision mediump float;
    uniform float uHue;
    varying float vDepth;
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float r = length(uv);
      if (r > 0.5) discard;
      float a = (1.0 - r * 2.0) * vDepth;
      vec3 rgb = hsv2rgb(vec3(uHue, 0.45, 0.95));
      gl_FragColor = vec4(rgb, a);
    }
  `;
  const program = compileProgram(gl, VS, FS);
  if (!program) return;
  s.program = program;

  const N = s.numPoints;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }
  const vbo = gl.createBuffer();
  if (!vbo) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  s.vbo = vbo;

  let vao: WebGLVertexArrayObject | null = null;
  if ('createVertexArray' in gl) {
    vao = (gl as WebGL2RenderingContext).createVertexArray();
    (gl as WebGL2RenderingContext).bindVertexArray(vao);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  }
  s.vao = vao;
  s.uTime = gl.getUniformLocation(program, 'uTime');
  s.uCamZ = gl.getUniformLocation(program, 'uCamZ');
  s.uAspect = gl.getUniformLocation(program, 'uAspect');
  s.uHue = gl.getUniformLocation(program, 'uHue');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function loop(): void {
  if (!state || state.stopped) return;
  if (!state.ctxHealthy) {
    /* Context lost; pause until restore handler kicks the loop back. */
    return;
  }
  const { canvas, gl, program, vao, uTime, uCamZ, uAspect, uHue, numPoints } = state;
  if (!canvas || !gl || !program) return;
  if (gl.isContextLost && gl.isContextLost()) {
    state.ctxHealthy = false;
    return;
  }

  resizeCanvasToDisplay(canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);

  const now = performance.now();
  const dt = Math.min(now - state.lastFrameAt, 100);
  state.lastFrameAt = now;
  state.frameAccum.push(dt);
  if (state.frameAccum.length > 60) state.frameAccum.shift();

  /* Camera lerp — ~600ms half-life. */
  const k = 1 - Math.pow(0.5, dt / 600);
  state.camCurrent += (state.camTarget - state.camCurrent) * k;
  state.hueCurrent += (state.hueTarget - state.hueCurrent) * k;

  gl.clearColor(0.058, 0.066, 0.082, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  if (vao && 'bindVertexArray' in gl) {
    (gl as WebGL2RenderingContext).bindVertexArray(vao);
  } else {
    gl.bindBuffer(gl.ARRAY_BUFFER, state.vbo);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  }
  if (uTime) gl.uniform1f(uTime, (now - state.startedAt) / 1000);
  if (uCamZ) gl.uniform1f(uCamZ, state.camCurrent);
  if (uAspect) gl.uniform1f(uAspect, canvas.width / canvas.height);
  if (uHue) gl.uniform1f(uHue, state.hueCurrent);
  gl.drawArrays(gl.POINTS, 0, numPoints);

  state.rafId = requestAnimationFrame(loop);
}

function exposeWindow(): void {
  if (typeof window === 'undefined' || !state) return;
  Object.defineProperty(window, '__p31AppShell', {
    configurable: true,
    enumerable: false,
    get(): ShellStats {
      const stats = snapshotStarfieldStats();
      return stats || ({} as ShellStats);
    },
  });
}

export function startStarfield(canvas: HTMLCanvasElement): void {
  /* Set canvasId as a data-attribute so the test can compare across navs. */
  if (!canvas.dataset.p31AppshellId) {
    canvas.dataset.p31AppshellId = CANVAS_ID;
  }
  getOrInit(canvas);
}

export function setStarfieldRoute(route: 'home' | 'dome'): void {
  if (!state) return;
  state.navCount += 1;
  state.route = route;
  state.camTarget = ROUTE_CAM[route].z;
  state.hueTarget = ROUTE_CAM[route].hue;
}

export function snapshotStarfieldStats(): ShellStats | null {
  if (!state) return null;
  const fpsAvg =
    state.frameAccum.length > 0
      ? Math.round(1000 / (state.frameAccum.reduce((a, b) => a + b, 0) / state.frameAccum.length))
      : 0;
  return {
    canvasId: state.canvas?.dataset.p31AppshellId ?? '',
    navCount: state.navCount,
    canvasAttachCount,
    ctxLost: state.ctxLost,
    ctxRestored: state.ctxRestored,
    ctxHealthy: state.ctxHealthy,
    fps: fpsAvg,
    route: state.route,
    bytes: state.bytes,
  };
}

/* For tests / teardown. Not used in normal navigation. */
export function disposeStarfield(): void {
  if (!state) return;
  state.stopped = true;
  cancelAnimationFrame(state.rafId);
  const { gl, program, vbo, vao } = state;
  if (gl) {
    if (program) gl.deleteProgram(program);
    if (vbo) gl.deleteBuffer(vbo);
    if (vao && 'deleteVertexArray' in gl) (gl as WebGL2RenderingContext).deleteVertexArray(vao);
  }
  state = null;
}
