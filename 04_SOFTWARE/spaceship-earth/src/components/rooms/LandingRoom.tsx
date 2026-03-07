// LandingRoom.tsx — QG-IDE: Quantum Geodesic IDE
// 6 workspace tabs: Code, View, Term, Copilot, PHX, Files.
// Copilot = Centaur Engine (LLM vibe-code). PHX = local coherence companion.
// All state persisted to localStorage under QGIDE_ prefix.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCentaur } from '../../hooks/useCentaur';
import type { CentaurMessage } from '../../hooks/useCentaur';
import { useSovereignStore } from '../../sovereign/useSovereignStore';
import { compileCentaurCode, moduleRegistry } from '../../services/jitterbugCompiler';

// ── Constants ──
const QG = {
  SQRT3: 1.7320508075688772,
  INV_SQRT3: 0.5773502691896257,
  SIC_OVERLAP: 1 / 3,
  MARK1: 0.35,
  GREEN_ENTROPY: 0.15,
  YELLOW_ENTROPY: 0.40,
};

const CSS = {
  bg: '#08080f', bg1: '#0c0c16', bg2: '#10101e', bg3: '#161628',
  border: '#1a1a30', borderHi: '#2a2a4a',
  teal: '#00e5ff', tealD: 'rgba(0,229,255,0.12)',
  green: '#00ff9d', greenD: 'rgba(0,255,157,0.12)',
  amber: '#ffb300', amberD: 'rgba(255,179,0,0.12)',
  red: '#ff4444', redD: 'rgba(255,68,68,0.10)',
  violet: '#a855f7', violetD: 'rgba(168,85,247,0.12)',
  txt: '#c8c8e0', txtD: '#5a5a78', txtDD: '#3a3a52',
  mono: "'Menlo','Consolas','Courier New',monospace",
};

// ── Default Files ──
const DEFAULT_FILES: Record<string, string> = {
  'src/main.ts': `// QG-IDE :: Quantum Geodesic Entry Point
import { QuantumTetrahedron } from './tetrahedron';
import { SICPOVMState } from './sicpovm';

const SQRT3 = ${QG.SQRT3};
const MARK1 = ${QG.MARK1};

// Initialize the primary tetrahedron
const tetra = new QuantumTetrahedron({
  scale: 1.0,
  coherence: MARK1,
});

// SIC-POVM measurement outcomes
const measurement = tetra.sicPovm.measure();
console.log('Outcome:', measurement.label);
console.log('Probability:', measurement.probability);
console.log('Purity:', tetra.sicPovm.purity);

// Coherence game loop
function update(trimtabInput: number, dt: number) {
  const drift = (trimtabInput - 0.5) * dt * 0.1;
  tetra.coherence = clamp(tetra.coherence + drift, 0, 1);
  const entropy = Math.abs(tetra.coherence - MARK1) / MARK1;
  if (entropy < 0.15) return 'GREEN_BOARD';
  if (entropy < 0.40) return 'YELLOW_BOARD';
  return 'RED_BOARD';
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

console.log('[QG] Kernel initialized');
console.log('[QG] Board state:', update(0.5, 0.016));
`,
  'src/tetrahedron.ts': `// Minimum structural system: 4 vertices, 6 edges, 4 faces
import { SICPOVMState } from './sicpovm';

interface TetraConfig { scale: number; coherence?: number; }
interface Vector3 { x: number; y: number; z: number; }

export class QuantumTetrahedron {
  vertices: [Vector3, Vector3, Vector3, Vector3];
  coherence: number;
  sicPovm: SICPOVMState;

  constructor(config: TetraConfig) {
    const s = config.scale;
    this.coherence = config.coherence ?? ${QG.MARK1};
    this.vertices = [
      { x: 0, y: s, z: 0 },
      { x: s*0.9428, y: -s/3, z: 0 },
      { x: -s*0.4714, y: -s/3, z: s*0.8165 },
      { x: -s*0.4714, y: -s/3, z: -s*0.8165 },
    ];
    this.sicPovm = new SICPOVMState(this.vertices);
  }

  get entropy(): number {
    return Math.abs(this.coherence - ${QG.MARK1}) / ${QG.MARK1};
  }

  get boardState(): 'GREEN' | 'YELLOW' | 'RED' {
    if (this.entropy < ${QG.GREEN_ENTROPY}) return 'GREEN';
    if (this.entropy < ${QG.YELLOW_ENTROPY}) return 'YELLOW';
    return 'RED';
  }
}
`,
  'src/sicpovm.ts': `// SIC-POVM: Symmetric Informationally Complete
// 4 outcomes at tetrahedral angles on Bloch sphere

interface Vector3 { x: number; y: number; z: number; }
interface Outcome { vector: Vector3; probability: number; label: string; }

export class SICPOVMState {
  outcomes: Outcome[];
  purity: number;

  constructor(vertices: Vector3[]) {
    const labels = ['ALPHA','BETA','GAMMA','DELTA'];
    this.outcomes = vertices.map((v, i) => ({
      vector: this.normalize(v),
      probability: 0.25,
      label: labels[i],
    }));
    this.purity = 1.0;
  }

  measure(): Outcome {
    let r = Math.random();
    for (const o of this.outcomes) {
      r -= o.probability;
      if (r <= 0) return o;
    }
    return this.outcomes[3];
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    return { x: v.x/len, y: v.y/len, z: v.z/len };
  }
}
`,
  'quantum/constants.ts': `// QG-IDE Reference Constants
export const QG_CONSTANTS = {
  SQRT3: ${QG.SQRT3},
  INV_SQRT3: ${QG.INV_SQRT3},
  SIC_OVERLAP: ${QG.SIC_OVERLAP},
  MARK1_ATTRACTOR: ${QG.MARK1},
  GREEN_ENTROPY: ${QG.GREEN_ENTROPY},
  YELLOW_ENTROPY: ${QG.YELLOW_ENTROPY},
  FIDELITY_THRESHOLD: ${QG.INV_SQRT3},
  SE050_I2C_ADDR: 0x48,
  LORA_FREQ_US: 915_000_000,
} as const;

// The geometry is not metaphor.
`,
  '.qg-ide.json': `{
  "name": "sovereign-stack",
  "version": "1.0.0",
  "kernel": "TETRAHEDRAL",
  "physics": "FISHER_ESCOLA",
  "verification": "SIC_POVM",
  "authority": "GEOMETRY",
  "status": "GREEN_BOARD"
}`,
};

// ── localStorage helpers ──
const lsKey = (k: string) => 'QGIDE_' + k;
function lsGet<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(lsKey(k)); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}
function lsSet(k: string, v: unknown) { localStorage.setItem(lsKey(k), JSON.stringify(v)); }

// ── Syntax highlighting ──
function highlight(code: string): string {
  let s = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/(\/\/.*?)$/gm, '<span style="color:#5c6370;font-style:italic">$1</span>');
  s = s.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#5c6370;font-style:italic">$1</span>');
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#98c379">$1</span>');
  s = s.replace(/('(?:[^'\\]|\\.)*')/g, '<span style="color:#98c379">$1</span>');
  s = s.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span style="color:#98c379">$1</span>');
  s = s.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span style="color:#d19a66">$1</span>');
  const kws = 'const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|class|extends|interface|export|import|from|async|await|try|catch|throw|typeof|instanceof|void|null|undefined|true|false|this|type|readonly|declare|as';
  s = s.replace(new RegExp('\\b(' + kws + ')\\b', 'g'), '<span style="color:#c678dd">$1</span>');
  const types = 'number|string|boolean|any|never|void|Promise|Vector3|Outcome';
  s = s.replace(new RegExp('\\b(' + types + ')\\b', 'g'), '<span style="color:#e5c07b">$1</span>');
  s = s.replace(/\b([A-Z_]{2,})\b/g, '<span style="color:#d4af37">$1</span>');
  return s;
}

// ── Console line type ──
interface ConsoleLine { text: string; cls: 'info' | 'warn' | 'err' | 'sys' | 'out'; ts: string }

const CLS_COLORS: Record<string, string> = {
  info: CSS.teal, warn: CSS.amber, err: CSS.red, sys: CSS.violet, out: CSS.txt,
};

// ── Phoenix responses ──
function phoenixRespond(msg: string, mode: string, H: number, entropy: number): string {
  const lower = msg.toLowerCase();
  if (lower.includes('coherence') || lower.includes('entropy') || lower.includes('status')) {
    const board = entropy < QG.GREEN_ENTROPY ? 'GREEN' : entropy < QG.YELLOW_ENTROPY ? 'YELLOW' : 'RED';
    return `H = ${H.toFixed(3)} | Entropy = ${(entropy * 100).toFixed(0)}% | Board: ${board}. ${entropy < QG.GREEN_ENTROPY ? 'Coherent. Full bandwidth available.' : 'Elevated entropy. Consider grounding.'}`;
  }
  if (lower.includes('tetra') || lower.includes('geometry'))
    return `The tetrahedron is the minimum structural system. 4 vertices \u2192 4 SIC-POVM outcomes. 6 edges \u2192 6 connections. \u221A3 = ${QG.SQRT3.toFixed(4)} governs the Wye-Delta transformation. The geometry is not metaphor.`;
  if (lower.includes('help') || lower.includes('what can'))
    return 'I monitor coherence and provide context-appropriate support. Ask about: coherence status, tetrahedral geometry, SIC-POVM measurement, hardware bridge.';
  if (lower.includes('hardware') || lower.includes('phenix') || lower.includes('esp32'))
    return 'Hardware bridge: OFFLINE. Target: ESP32-S3 + SE050 + SX1262. Trimtab sensitivity: 0.8. LoRa: 915MHz US band.';
  if (lower.includes('sic') || lower.includes('povm'))
    return 'SIC-POVM: 4 measurement outcomes at tetrahedral angles on Bloch sphere. Pairwise overlap |\u27E8\u03C0\u1D62|\u03C0\u2C7C\u27E9|\u00B2 = 1/3. The geometry protects the signal.';
  if (mode === 'witness') return `Heard. "${msg.substring(0, 60)}${msg.length > 60 ? '...' : ''}"`;
  if (mode === 'architect') return `Mapping topology of: "${msg.substring(0, 40)}..." \u2014 identifying nodes, edges, potential failure modes.`;
  return 'Processing. The signal is clear. What do you need to grow from here?';
}

// ══════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════
export function LandingRoom() {
  // ── Core state ──
  const [workspace, setWorkspace] = useState<'editor' | 'viewport' | 'console' | 'copilot' | 'phoenix' | 'files'>('viewport');
  const [files, setFiles] = useState<Record<string, string>>(() => lsGet('files', DEFAULT_FILES));
  const [openFile, setOpenFile] = useState(() => lsGet('openFile', 'src/main.ts'));
  const [openTabs, setOpenTabs] = useState<string[]>(() => lsGet('openTabs', ['src/main.ts', 'src/tetrahedron.ts', 'src/sicpovm.ts']));

  // Coherence sim
  const [H, setH] = useState(0.35);
  const entropy = Math.abs(H - QG.MARK1) / QG.MARK1;
  const boardColor = entropy < QG.GREEN_ENTROPY ? CSS.green : entropy < QG.YELLOW_ENTROPY ? CSS.amber : CSS.red;
  const boardLabel = entropy < QG.GREEN_ENTROPY ? 'GREEN' : entropy < QG.YELLOW_ENTROPY ? 'YELLOW' : 'RED';

  // Console
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [consoleInput, setConsoleInput] = useState('');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Phoenix
  const [phoenixMode, setPhoenixMode] = useState('witness');
  const [phoenixMsgs, setPhoenixMsgs] = useState<Array<{ type: string; text: string }>>([
    { type: 'system', text: 'QG-IDE v1.0 \u00B7 PHOENIX Companion Online' },
    { type: 'phoenix', text: 'GREEN BOARD. Coherent. Full cognitive bandwidth available. What are we building?' },
  ]);
  const [phoenixInput, setPhoenixInput] = useState('');
  const phoenixEndRef = useRef<HTMLDivElement>(null);

  // Copilot (Centaur Engine)
  const { executePrompt, clearHistory, messagesRef, status: centaurStatus } = useCentaur();
  const [copilotMsgs, setCopilotMsgs] = useState<CentaurMessage[]>([]);
  const [copilotInput, setCopilotInput] = useState('');
  const [compileResult, setCompileResult] = useState<string | null>(null);
  const [lastCompiled, setLastCompiled] = useState<React.ComponentType | null>(null);
  const copilotEndRef = useRef<HTMLDivElement>(null);
  const centaurStoreStatus = useSovereignStore((s) => s.centaurStatus);
  const mountToSlot = useSovereignStore((s) => s.mountToSlot);
  const dynamicSlots = useSovereignStore((s) => s.dynamicSlots);
  const hasApiKey = (() => { try { return !!localStorage.getItem('p31_llm_key'); } catch { return false; } })();

  // Viewport
  const vpCanvasRef = useRef<HTMLCanvasElement>(null);
  const vpGlRef = useRef<WebGLRenderingContext | null>(null);
  const vpAnimRef = useRef(0);
  const [fieldDensity, setFieldDensity] = useState(3);
  const [vpSpin, setVpSpin] = useState(true);
  const hRef = useRef(H);
  useEffect(() => { hRef.current = H; }, [H]);

  // SIC-POVM canvas
  const sicCanvasRef = useRef<HTMLCanvasElement>(null);
  const sicAnimRef = useRef(0);

  // Editor refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Persistence ──
  useEffect(() => { lsSet('files', files); }, [files]);
  useEffect(() => { lsSet('openFile', openFile); }, [openFile]);
  useEffect(() => { lsSet('openTabs', openTabs); }, [openTabs]);

  // ── Coherence drift ──
  useEffect(() => {
    const iv = setInterval(() => {
      setH(prev => {
        const next = prev + (Math.random() - 0.502) * 0.002;
        return Math.max(0.05, Math.min(0.95, next));
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  // ── Boot console ──
  useEffect(() => {
    const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
    const boot: ConsoleLine[] = [
      { text: '\u2500'.repeat(40), cls: 'sys', ts: ts() },
      { text: '\u2502  QUANTUM GEODESIC IDE v1.0           \u2502', cls: 'sys', ts: ts() },
      { text: '\u2502  Kernel: TETRAHEDRAL                 \u2502', cls: 'sys', ts: ts() },
      { text: '\u2502  Physics: FISHER-ESCOLA              \u2502', cls: 'sys', ts: ts() },
      { text: '\u2502  Verification: SIC-POVM              \u2502', cls: 'sys', ts: ts() },
      { text: '\u2500'.repeat(40), cls: 'sys', ts: ts() },
      { text: '\u2713 Quantum kernel initialized', cls: 'info', ts: ts() },
      { text: `\u2713 File system loaded (${Object.keys(DEFAULT_FILES).length} files)`, cls: 'info', ts: ts() },
      { text: '\u2713 SIC-POVM calibrated: 4 outcomes nominal', cls: 'info', ts: ts() },
      { text: '\u26A0 Hardware bridge: OFFLINE', cls: 'warn', ts: ts() },
      { text: 'Structure Determines Performance.', cls: 'sys', ts: ts() },
    ];
    setConsoleLines(boot);
  }, []);

  // ── Console scroll ──
  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [consoleLines]);
  useEffect(() => { phoenixEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [phoenixMsgs]);

  // ── Console log helper ──
  const clog = useCallback((text: string, cls: ConsoleLine['cls'] = 'out') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setConsoleLines(prev => [...prev, { text, cls, ts }]);
  }, []);

  // ── Run code ──
  const runCode = useCallback(() => {
    clog('\u23F8 Running ' + openFile + '...', 'sys');
    const code = files[openFile] ?? '';
    let js = code
      .replace(/:\s*(number|string|boolean|any|void|never|Vector3|Outcome|TetraConfig)\b/g, '')
      .replace(/\b(interface|type|export|import|readonly|declare|as\s+const)\b[^;\n]*/g, '// [stripped]')
      .replace(/<[A-Z]\w*>/g, '');
    try {
      const logs: string[] = [];
      const fakeConsole = { log: (...a: unknown[]) => logs.push(a.join(' ')), warn: (...a: unknown[]) => logs.push('[WARN] ' + a.join(' ')), error: (...a: unknown[]) => logs.push('[ERR] ' + a.join(' ')) };
      new Function('console', js)(fakeConsole);
      for (const l of logs) clog(l, 'out');
      clog('\u2713 Execution complete', 'info');
    } catch (e) {
      clog('\u2717 ' + (e instanceof Error ? e.message : String(e)), 'err');
    }
  }, [openFile, files, clog]);

  // ── Console eval ──
  const evalConsole = useCallback(() => {
    if (!consoleInput.trim()) return;
    clog('\u23F8 ' + consoleInput, 'info');
    try { clog(String(eval(consoleInput)), 'out'); } // eslint-disable-line no-eval
    catch (e) { clog((e instanceof Error ? e.message : String(e)), 'err'); }
    setConsoleInput('');
  }, [consoleInput, clog]);

  // ── File open ──
  const openFileTab = useCallback((path: string) => {
    if (!files[path]) return;
    setOpenFile(path);
    setOpenTabs(prev => prev.includes(path) ? prev : [...prev, path]);
  }, [files]);

  // ── Editor sync scroll ──
  const syncScroll = useCallback(() => {
    if (gutterRef.current && scrollRef.current) {
      gutterRef.current.scrollTop = scrollRef.current.scrollTop;
    }
  }, []);

  // ── Viewport WebGL — Quantum Field Spectacular ──
  useEffect(() => {
    if (workspace !== 'viewport') return;
    const canvas = vpCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false });
    if (!gl) return;
    vpGlRef.current = gl;

    // ── Shader helpers ──
    function mkShader(type: number, src: string) {
      const s = gl!.createShader(type)!; gl!.shaderSource(s, src); gl!.compileShader(s); return s;
    }
    function mkProg(vs: string, fs: string) {
      const p = gl!.createProgram()!;
      gl!.attachShader(p, mkShader(gl!.VERTEX_SHADER, vs));
      gl!.attachShader(p, mkShader(gl!.FRAGMENT_SHADER, fs));
      gl!.linkProgram(p); return p;
    }

    // Point shader — soft glow sprites
    const ptProg = mkProg(
      `attribute vec3 aPos;attribute float aSize;attribute vec4 aCol;uniform mat4 uMVP;varying vec4 vCol;
       void main(){gl_Position=uMVP*vec4(aPos,1.0);gl_PointSize=aSize*${dpr.toFixed(1)}/max(gl_Position.w,0.1);vCol=aCol;}`,
      `precision mediump float;varying vec4 vCol;
       void main(){float d=length(gl_PointCoord-0.5)*2.0;float g=exp(-d*d*3.0);gl_FragColor=vec4(vCol.rgb,vCol.a*g);}`
    );
    // Line shader
    const lnProg = mkProg(
      `attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uMVP;varying vec4 vCol;
       void main(){gl_Position=uMVP*vec4(aPos,1.0);vCol=aCol;}`,
      `precision mediump float;varying vec4 vCol;void main(){gl_FragColor=vCol;}`
    );

    const ptMVP = gl.getUniformLocation(ptProg, 'uMVP');
    const lnMVP = gl.getUniformLocation(lnProg, 'uMVP');
    const ptBuf = gl.createBuffer()!;
    const lnBuf = gl.createBuffer()!;

    // ── Tetrahedron geometry ──
    const TV: [number,number,number][] = [[0,1,0],[0.9428,-1/3,0],[-0.4714,-1/3,0.8165],[-0.4714,-1/3,-0.8165]];
    const TE: [number,number][] = [[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]];
    const TC = [[0,1,0.62],[0,0.9,1],[1,0.7,0],[0.66,0.33,0.97]]; // teal,cyan,amber,violet

    // ── Particles ──
    const N_STARS = 500, N_ORB = 1200, N_EDGE = 400, N_RING = 200;
    const N = N_STARS + N_ORB + N_EDGE + N_RING;
    // Flat arrays for speed: x,y,z, size, r,g,b,a per particle = 8
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    const pSz = new Float32Array(N);
    const pR = new Float32Array(N), pG = new Float32Array(N), pB = new Float32Array(N), pA = new Float32Array(N);
    const pLife = new Float32Array(N), pParam = new Float32Array(N), pType = new Uint8Array(N);

    let idx = 0;
    // Stars
    for (let i = 0; i < N_STARS; i++, idx++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), rd = 15 + Math.random() * 30;
      px[idx] = rd * Math.sin(ph) * Math.cos(th); py[idx] = rd * Math.sin(ph) * Math.sin(th); pz[idx] = rd * Math.cos(ph);
      pSz[idx] = 1 + Math.random() * 3; pR[idx] = 0.5 + Math.random() * 0.5; pG[idx] = 0.6 + Math.random() * 0.4; pB[idx] = 0.8 + Math.random() * 0.2;
      pA[idx] = 0.15 + Math.random() * 0.5; pParam[idx] = Math.random() * 6.28; pType[idx] = 0;
    }
    // Orbital — 4 SIC-POVM shells
    for (let i = 0; i < N_ORB; i++, idx++) {
      const shell = i % 4, rd = 2 + shell * 1.4 + Math.random() * 0.6;
      const th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1);
      px[idx] = rd * Math.sin(ph) * Math.cos(th); py[idx] = rd * Math.sin(ph) * Math.sin(th); pz[idx] = rd * Math.cos(ph);
      pSz[idx] = 2 + Math.random() * 8; const c = TC[shell];
      pR[idx] = c[0]; pG[idx] = c[1]; pB[idx] = c[2]; pA[idx] = 0.08 + Math.random() * 0.3;
      pLife[idx] = Math.random() * 100; pParam[idx] = th; pType[idx] = 1;
    }
    // Edge flow
    for (let i = 0; i < N_EDGE; i++, idx++) {
      const ei = i % 6, tt = Math.random();
      const [a, b] = TE[ei]; const va = TV[a], vb = TV[b];
      px[idx] = va[0] + (vb[0] - va[0]) * tt; py[idx] = va[1] + (vb[1] - va[1]) * tt; pz[idx] = va[2] + (vb[2] - va[2]) * tt;
      pSz[idx] = 2 + Math.random() * 6; pR[idx] = 0; pG[idx] = 0.95; pB[idx] = 1; pA[idx] = 0.6;
      pLife[idx] = tt; pParam[idx] = ei + Math.random(); pType[idx] = 2;
    }
    // Coherence rings
    for (let i = 0; i < N_RING; i++, idx++) {
      const ang = (i / N_RING) * 6.28;
      px[idx] = Math.cos(ang) * 2; py[idx] = 0; pz[idx] = Math.sin(ang) * 2;
      pSz[idx] = 2 + Math.random() * 3; pR[idx] = 0; pG[idx] = 1; pB[idx] = 0.55;
      pA[idx] = 0.25; pLife[idx] = Math.random(); pParam[idx] = ang; pType[idx] = 3;
    }

    // ── Matrix math ──
    const mat4P = (fov: number, asp: number, n: number, f: number) => { const v = 1 / Math.tan(fov / 2); return new Float32Array([v / asp, 0, 0, 0, 0, v, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); };
    const mat4RY = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]); };
    const mat4RX = (a: number) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]); };
    const mat4T = (x: number, y: number, z: number) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
    const mat4M = (a: Float32Array, b: Float32Array) => { const r = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[j * 4 + i] = a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] + a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3]; return r; };

    // ── Camera state ──
    let t = 0, camDist = 9, camRX = 0.35, camRY = 0, autoRot = vpSpin;
    let dragging = false, lastMX = 0, lastMY = 0;
    let touchSt: { x: number; y: number; rx: number; ry: number } | null = null;
    const density = fieldDensity;

    // ── Interaction ──
    const onMD = (e: MouseEvent) => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; autoRot = false; };
    const onMM = (e: MouseEvent) => { if (!dragging) return; camRY += (e.clientX - lastMX) * 0.005; camRX += (e.clientY - lastMY) * 0.005; camRX = Math.max(-1.3, Math.min(1.3, camRX)); lastMX = e.clientX; lastMY = e.clientY; };
    const onMU = () => { dragging = false; };
    const onWh = (e: WheelEvent) => { camDist = Math.max(3, Math.min(25, camDist + e.deltaY * 0.01)); e.preventDefault(); };
    const onTS = (e: TouchEvent) => { if (e.touches.length === 1) { touchSt = { x: e.touches[0].clientX, y: e.touches[0].clientY, rx: camRX, ry: camRY }; autoRot = false; } };
    const onTM = (e: TouchEvent) => { if (touchSt && e.touches.length === 1) { camRY = touchSt.ry + (e.touches[0].clientX - touchSt.x) * 0.005; camRX = touchSt.rx + (e.touches[0].clientY - touchSt.y) * 0.005; camRX = Math.max(-1.3, Math.min(1.3, camRX)); e.preventDefault(); } };
    const onTE = () => { touchSt = null; };
    canvas.addEventListener('mousedown', onMD); canvas.addEventListener('mousemove', onMM);
    canvas.addEventListener('mouseup', onMU); canvas.addEventListener('wheel', onWh, { passive: false });
    canvas.addEventListener('touchstart', onTS, { passive: true });
    canvas.addEventListener('touchmove', onTM, { passive: false });
    canvas.addEventListener('touchend', onTE);

    // ── GL setup ──
    gl.clearColor(0.01, 0.01, 0.025, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for glow
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);

    // Pre-allocate upload buffers
    const ptData = new Float32Array(N * 8);
    const sicData = new Float32Array(4 * 8);

    function frame() {
      if (!gl) return;
      t += 0.006;
      const w = canvas!.width, h = canvas!.height;
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const asp = w / h;
      const cH = hRef.current; // Live coherence

      if (autoRot) camRY += 0.002;
      const vp = mat4M(mat4P(Math.PI / 4, asp, 0.1, 100), mat4M(mat4T(0, 0, -camDist), mat4M(mat4RX(camRX), mat4RY(camRY))));

      // ── Update particles ──
      for (let i = 0; i < N; i++) {
        const ty = pType[i];
        if (ty === 0) { // Stars — gentle twinkle
          pA[i] = 0.15 + Math.sin(t * 0.5 + pParam[i]) * 0.15;
        } else if (ty === 1) { // Orbital — SIC-POVM shells
          pParam[i] += 0.004 + Math.sin(t + pLife[i]) * 0.002;
          const shell = (i - N_STARS) % 4;
          const rd = 2 + shell * 1.4 + Math.sin(t * 0.4 + pParam[i]) * 0.4 * density * 0.5;
          const th = pParam[i], ph = Math.sin(t * 0.25 + th * 2) * 0.6 + 1.5708;
          px[i] = rd * Math.sin(ph) * Math.cos(th);
          py[i] = rd * Math.cos(ph) + Math.sin(t * 0.6 + th) * 0.4;
          pz[i] = rd * Math.sin(ph) * Math.sin(th);
          // Coherence affects brightness
          pA[i] = (0.1 + Math.sin(t * 1.5 + pParam[i] * 3) * 0.08) * (0.5 + cH);
        } else if (ty === 2) { // Edge flow — stream along wireframe
          pLife[i] += 0.006 + cH * 0.004;
          if (pLife[i] > 1) pLife[i] -= 1;
          const ei = Math.floor(pParam[i]) % 6;
          const [a, b] = TE[ei]; const va = TV[a], vb = TV[b];
          const sc = 2.0 + Math.sin(t * 0.3) * 0.2;
          const tt = pLife[i];
          px[i] = (va[0] + (vb[0] - va[0]) * tt) * sc;
          py[i] = (va[1] + (vb[1] - va[1]) * tt) * sc;
          pz[i] = (va[2] + (vb[2] - va[2]) * tt) * sc;
          const pulse = Math.sin(tt * 3.14159);
          pA[i] = pulse * 0.7; pSz[i] = 2 + pulse * 6;
          // Color shifts with coherence
          pR[i] = 0.1 * (1 - cH); pG[i] = 0.6 + cH * 0.35; pB[i] = 0.8 + cH * 0.2;
        } else { // Ring — coherence pulse waves
          pLife[i] += 0.002 + cH * 0.003;
          if (pLife[i] > 1) pLife[i] -= 1;
          const ringR = 0.5 + pLife[i] * 8;
          const ang = pParam[i] + t * 0.08;
          px[i] = Math.cos(ang) * ringR;
          py[i] = Math.sin(t * 1.5 + ang * 3) * 0.15;
          pz[i] = Math.sin(ang) * ringR;
          pA[i] = (1 - pLife[i]) * 0.25 * cH * 2;
          pG[i] = 0.8 + pLife[i] * 0.2; pB[i] = 0.4 + pLife[i] * 0.6;
        }
      }

      // ── Upload & draw particles ──
      for (let i = 0; i < N; i++) {
        const o = i * 8;
        ptData[o] = px[i]; ptData[o + 1] = py[i]; ptData[o + 2] = pz[i]; ptData[o + 3] = pSz[i];
        ptData[o + 4] = pR[i]; ptData[o + 5] = pG[i]; ptData[o + 6] = pB[i]; ptData[o + 7] = pA[i];
      }
      gl.useProgram(ptProg);
      gl.uniformMatrix4fv(ptMVP, false, vp);
      gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, ptData, gl.DYNAMIC_DRAW);
      const pP = gl.getAttribLocation(ptProg, 'aPos'), pS = gl.getAttribLocation(ptProg, 'aSize'), pC = gl.getAttribLocation(ptProg, 'aCol');
      gl.enableVertexAttribArray(pP); gl.enableVertexAttribArray(pS); gl.enableVertexAttribArray(pC);
      gl.vertexAttribPointer(pP, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(pS, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(pC, 4, gl.FLOAT, false, 32, 16);
      gl.drawArrays(gl.POINTS, 0, N);

      // ── Wireframe — nested tetrahedra ──
      const lineV: number[] = [];
      for (let layer = 0; layer < density + 1; layer++) {
        const sc = 2.0 + layer * 1.2;
        const rot = t * (0.15 + layer * 0.08) * (layer % 2 === 0 ? 1 : -1);
        const c = TC[layer % 4]; const al = (0.35 - layer * 0.06) * (0.5 + cH);
        const cr = Math.cos(rot), sr = Math.sin(rot);
        for (const [ai, bi] of TE) {
          for (const v of [TV[ai], TV[bi]]) {
            const rx = v[0] * cr + v[2] * sr, rz = -v[0] * sr + v[2] * cr;
            lineV.push(rx * sc, v[1] * sc, rz * sc, c[0], c[1], c[2], al);
          }
        }
      }
      // Icosahedral cage — faint outer shell
      const icoR = 6 + Math.sin(t * 0.2) * 0.5;
      const phi = (1 + Math.sqrt(5)) / 2;
      const icoV: [number, number, number][] = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
      ];
      const icoNorm = Math.sqrt(1 + phi * phi);
      const icoE: [number, number][] = [
        [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
        [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
        [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],[7,8],[7,10],[8,9],[9,5],
      ];
      const icoRot = t * 0.04;
      const icr = Math.cos(icoRot), isr = Math.sin(icoRot);
      for (const [ai, bi] of icoE) {
        for (const v of [icoV[ai], icoV[bi]]) {
          const nx = v[0] / icoNorm, ny = v[1] / icoNorm, nz = v[2] / icoNorm;
          const rx = nx * icr + nz * isr, rz = -nx * isr + nz * icr;
          lineV.push(rx * icoR, ny * icoR, rz * icoR, 0.3, 0.5, 1, 0.04 + cH * 0.03);
        }
      }
      gl.useProgram(lnProg);
      gl.uniformMatrix4fv(lnMVP, false, vp);
      const ld = new Float32Array(lineV);
      gl.bindBuffer(gl.ARRAY_BUFFER, lnBuf);
      gl.bufferData(gl.ARRAY_BUFFER, ld, gl.DYNAMIC_DRAW);
      const lP = gl.getAttribLocation(lnProg, 'aPos'), lC = gl.getAttribLocation(lnProg, 'aCol');
      gl.enableVertexAttribArray(lP); gl.enableVertexAttribArray(lC);
      gl.vertexAttribPointer(lP, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(lC, 4, gl.FLOAT, false, 28, 12);
      gl.drawArrays(gl.LINES, 0, lineV.length / 7);

      // ── SIC-POVM vertex beacons — 4 bright pulsing nodes ──
      gl.useProgram(ptProg);
      const sc2 = 2.0;
      for (let i = 0; i < 4; i++) {
        const v = TV[i]; const c = TC[i]; const pulse = 1 + Math.sin(t * 4 + i * 1.5708) * 0.3;
        sicData[i * 8] = v[0] * sc2; sicData[i * 8 + 1] = v[1] * sc2; sicData[i * 8 + 2] = v[2] * sc2;
        sicData[i * 8 + 3] = 35 * pulse;
        sicData[i * 8 + 4] = c[0]; sicData[i * 8 + 5] = c[1]; sicData[i * 8 + 6] = c[2]; sicData[i * 8 + 7] = 0.7;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sicData, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(pP, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(pS, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(pC, 4, gl.FLOAT, false, 32, 16);
      gl.drawArrays(gl.POINTS, 0, 4);

      vpAnimRef.current = requestAnimationFrame(frame);
    }
    vpAnimRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(vpAnimRef.current);
      canvas.removeEventListener('mousedown', onMD); canvas.removeEventListener('mousemove', onMM);
      canvas.removeEventListener('mouseup', onMU); canvas.removeEventListener('wheel', onWh);
      canvas.removeEventListener('touchstart', onTS); canvas.removeEventListener('touchmove', onTM);
      canvas.removeEventListener('touchend', onTE);
    };
  }, [workspace, fieldDensity, vpSpin]);

  // ── SIC-POVM visualizer ──
  useEffect(() => {
    if (workspace !== 'phoenix') return;
    const canvas = sicCanvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d')!;
    canvas.width = canvas.clientWidth * 2;
    canvas.height = canvas.clientHeight * 2;
    c.scale(2, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const labels = ['\u03B1', '\u03B2', '\u03B3', '\u03B4'];
    const colors = ['#00ff9d', '#00e5ff', '#ffb300', '#a855f7'];
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35;

    function frame() {
      c.clearRect(0, 0, w, h);
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,0.05)'; c.stroke();
      c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.strokeStyle = 'rgba(255,255,255,0.03)'; c.stroke();

      const t = Date.now() * 0.001;
      const probs = [0.25 + Math.sin(t * 1.1) * 0.08, 0.25 + Math.sin(t * 1.3 + 1) * 0.08, 0.25 + Math.sin(t * 0.9 + 2) * 0.08, 0.25 + Math.sin(t * 1.5 + 3) * 0.08];
      const sum = probs.reduce((a, b) => a + b, 0);
      probs.forEach((_, i) => probs[i] /= sum);

      const pts = probs.map((p, i) => {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const pr = r * p * 3.2;
        return { x: cx + Math.cos(angle) * pr, y: cy + Math.sin(angle) * pr };
      });

      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) { c.beginPath(); c.moveTo(pts[i].x, pts[i].y); c.lineTo(pts[j].x, pts[j].y); c.strokeStyle = 'rgba(255,255,255,0.06)'; c.stroke(); }
        c.beginPath(); c.arc(pts[i].x, pts[i].y, 4, 0, Math.PI * 2); c.fillStyle = colors[i]; c.fill();
        c.beginPath(); c.arc(pts[i].x, pts[i].y, 8, 0, Math.PI * 2); c.strokeStyle = colors[i] + '40'; c.stroke();
        c.fillStyle = colors[i]; c.font = '10px monospace'; c.textAlign = 'center';
        c.fillText(labels[i].toUpperCase() + ' ' + probs[i].toFixed(2), pts[i].x, pts[i].y - 14);
      }
      c.beginPath(); c.arc(cx, cy, 2, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fill();
      sicAnimRef.current = requestAnimationFrame(frame);
    }
    sicAnimRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(sicAnimRef.current);
  }, [workspace]);

  // ── Phoenix send ──
  const sendPhoenix = useCallback(() => {
    if (!phoenixInput.trim()) return;
    setPhoenixMsgs(prev => [...prev, { type: 'user', text: phoenixInput }]);
    const msg = phoenixInput;
    setPhoenixInput('');
    setTimeout(() => {
      setPhoenixMsgs(prev => [...prev, { type: 'phoenix', text: phoenixRespond(msg, phoenixMode, H, entropy) }]);
    }, 300 + Math.random() * 400);
  }, [phoenixInput, phoenixMode, H, entropy]);

  // ── Copilot (Centaur) send ──
  const syncCopilotMsgs = useCallback(() => { setCopilotMsgs([...messagesRef.current]); }, [messagesRef]);
  useEffect(() => { copilotEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [copilotMsgs]);

  const sendCopilot = useCallback(async () => {
    const prompt = copilotInput.trim();
    if (!prompt) return;
    setCopilotInput('');
    syncCopilotMsgs();
    try { await executePrompt(prompt); syncCopilotMsgs(); }
    catch (err) { syncCopilotMsgs(); setCompileResult('Error: ' + (err as Error).message); }
  }, [copilotInput, executePrompt, syncCopilotMsgs]);

  const handleCompile = useCallback((code: string) => {
    try {
      useSovereignStore.getState().setCentaurStatus('COMPILING');
      const result = compileCentaurCode(code);
      const name = result.displayName ?? result.name ?? 'Component';
      setCompileResult(`Compiled: ${name}`);
      setLastCompiled(result);
      useSovereignStore.getState().setCentaurStatus('SUCCESS', 'Module compiled');
    } catch (err) {
      setCompileResult(`Error: ${(err as Error).message}`);
      setLastCompiled(null);
      useSovereignStore.getState().setCentaurStatus('ERROR', (err as Error).message.slice(0, 80));
    }
  }, []);

  const handleMount = useCallback((slot: number) => {
    if (!lastCompiled) return;
    const name = lastCompiled.displayName ?? lastCompiled.name ?? `Slot${slot}`;
    moduleRegistry.set(`SLOT_${slot}`, lastCompiled);
    mountToSlot(slot, name);
    setCompileResult(`Mounted to Slot ${slot}: ${name}`);
    setLastCompiled(null);
  }, [lastCompiled, mountToSlot]);

  // ── Current file content ──
  const code = files[openFile] ?? '';
  const lineCount = Math.max(code.split('\n').length, 30);

  // ── Lang dot color ──
  const langDot = (f: string) => {
    if (f.endsWith('.ts') || f.endsWith('.js')) return '#3178c6';
    if (f.endsWith('.json')) return CSS.amber;
    return CSS.txtD;
  };

  // ══════════ RENDER ══════════
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    background: 'none', border: 'none', color: active ? CSS.teal : CSS.txtDD,
    fontFamily: CSS.mono, fontSize: 7, letterSpacing: '.15em', textTransform: 'uppercase',
    cursor: 'pointer', position: 'relative', padding: '8px 0',
  });

  const panelBase: React.CSSProperties = {
    position: 'absolute', top: 32, left: 0, right: 0, bottom: 48,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: CSS.bg, color: CSS.txt, fontFamily: CSS.mono, fontSize: 13, overflow: 'hidden' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, height: 32,
        display: 'flex', alignItems: 'center', padding: '0 8px', gap: 8,
        background: CSS.bg, borderBottom: `1px solid ${CSS.border}`, fontSize: 9, letterSpacing: '.12em',
      }}>
        <span style={{ color: CSS.teal, fontWeight: 'bold', fontSize: 10, letterSpacing: '.05em' }}>QG<sup style={{ fontSize: 7, color: CSS.violet }}>IDE</sup></span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: boardColor, boxShadow: `0 0 6px ${boardColor}`, flexShrink: 0 }} />
        <span style={{ fontSize: 8, color: boardColor }}>{boardLabel}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: CSS.amber, fontSize: 10, fontWeight: 'bold' }}>H:{H.toFixed(3)}</span>
        <span style={{ color: CSS.txtDD, fontSize: 8 }}>{'\u26A1'} HW:OFF</span>
        <span style={{
          padding: '2px 6px', borderRadius: 2, fontSize: 7, letterSpacing: '.15em', textTransform: 'uppercase',
          background: phoenixMode === 'witness' ? CSS.tealD : phoenixMode === 'architect' ? CSS.violetD : CSS.greenD,
          color: phoenixMode === 'witness' ? CSS.teal : phoenixMode === 'architect' ? CSS.violet : CSS.green,
        }}>{phoenixMode === 'witness' ? '\uD83D\uDC41\uFE0F' : phoenixMode === 'architect' ? '\uD83D\uDD2C' : '\uD83C\uDF31'} {phoenixMode.toUpperCase()}</span>
      </div>

      {/* ══════════ WS: EDITOR ══════════ */}
      <div style={{ ...panelBase, display: workspace === 'editor' ? 'flex' : 'none' }}>
        {/* File tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', background: CSS.bg1, borderBottom: `1px solid ${CSS.border}`, flexShrink: 0 }}>
          {openTabs.map(f => (
            <button key={f} onClick={() => openFileTab(f)} style={{
              padding: '8px 14px', fontFamily: CSS.mono, fontSize: 10,
              color: f === openFile ? CSS.txt : CSS.txtDD, background: f === openFile ? CSS.bg2 : 'none',
              border: 'none', borderRight: `1px solid ${CSS.border}`, cursor: 'pointer', whiteSpace: 'nowrap',
              position: 'relative',
            }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: langDot(f), marginRight: 6 }} />
              {f.split('/').pop()}
              {f === openFile && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: CSS.teal }} />}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Gutter */}
          <div ref={gutterRef} style={{
            width: 40, flexShrink: 0, background: CSS.bg1, borderRight: `1px solid ${CSS.border}`,
            overflow: 'hidden', userSelect: 'none', paddingTop: 8,
          }}>
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} style={{ height: 20, lineHeight: '20px', textAlign: 'right', paddingRight: 8, fontSize: 10, color: CSS.txtDD }}>{i + 1}</div>
            ))}
          </div>
          {/* Code scroll */}
          <div ref={scrollRef} onScroll={syncScroll} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            <div style={{ position: 'relative', minHeight: '100%', padding: '8px 0' }}>
              <div dangerouslySetInnerHTML={{ __html: highlight(code) }} style={{
                position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 12px',
                fontFamily: CSS.mono, fontSize: 13, lineHeight: '20px', whiteSpace: 'pre', color: CSS.txt,
                pointerEvents: 'none', tabSize: 2,
              }} />
              <textarea
                ref={inputRef}
                value={code}
                onChange={e => setFiles(prev => ({ ...prev, [openFile]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); } }}
                spellCheck={false}
                autoComplete="off"
                title="Code editor"
                style={{
                  position: 'relative', width: '100%', minHeight: '100%', padding: '8px 12px',
                  fontFamily: CSS.mono, fontSize: 13, lineHeight: '20px', whiteSpace: 'pre',
                  color: 'transparent', caretColor: CSS.teal, background: 'transparent',
                  border: 'none', outline: 'none', resize: 'none', tabSize: 2,
                  WebkitTextFillColor: 'transparent',
                }}
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: CSS.bg1, borderTop: `1px solid ${CSS.border}`, flexShrink: 0, overflowX: 'auto' }}>
          {['TAB:  ', '():()','{}:{}','[]:[]','=>:=>','::: ',';:;','"":"\\"\\"','``:``'].map(pair => {
            const [label, ins] = pair.split(':');
            return <button key={label} onClick={() => { inputRef.current?.focus(); document.execCommand('insertText', false, ins); }} style={{ padding: '10px 12px', background: 'none', border: 'none', color: CSS.txtDD, fontFamily: CSS.mono, fontSize: 10, cursor: 'pointer' }}>{label}</button>;
          })}
          <div style={{ width: 1, height: 20, background: CSS.border, flexShrink: 0 }} />
          <button onClick={runCode} style={{ padding: '10px 12px', background: 'none', border: 'none', color: CSS.teal, fontFamily: CSS.mono, fontSize: 10, cursor: 'pointer' }}>{'\u25B6'} RUN</button>
        </div>
      </div>

      {/* ══════════ WS: VIEWPORT — Quantum Field ══════════ */}
      <div style={{ ...panelBase, display: workspace === 'viewport' ? 'flex' : 'none', position: 'relative' }}>
        <canvas ref={vpCanvasRef} style={{ width: '100%', flex: 1, background: '#020208', touchAction: 'none' }} />

        {/* Top-left telemetry */}
        <div style={{
          position: 'absolute', top: 8, left: 12, pointerEvents: 'none',
          fontSize: 9, lineHeight: 2, color: CSS.txtD, letterSpacing: '.12em',
        }}>
          <div style={{ fontSize: 7, color: CSS.txtDD, letterSpacing: '.2em', marginBottom: 2 }}>QUANTUM GEODESIC FIELD</div>
          <div>H <span style={{ color: boardColor, fontWeight: 'bold', fontSize: 14 }}>{H.toFixed(3)}</span></div>
          <div>ENTROPY <span style={{ color: CSS.teal }}>{(entropy * 100).toFixed(0)}%</span></div>
          <div>PURITY <span style={{ color: CSS.teal }}>{(1 - entropy * 0.5).toFixed(2)}</span></div>
          <div>LAYERS <span style={{ color: CSS.violet }}>{fieldDensity + 1}</span></div>
        </div>

        {/* Top-right SIC-POVM readout */}
        <div style={{
          position: 'absolute', top: 8, right: 12, pointerEvents: 'none',
          fontSize: 9, lineHeight: 2, color: CSS.txtD, letterSpacing: '.12em', textAlign: 'right',
        }}>
          <div style={{ fontSize: 7, color: CSS.txtDD, letterSpacing: '.2em', marginBottom: 2 }}>SIC-POVM MEASUREMENT</div>
          {[
            { l: '\u03B1', c: CSS.green }, { l: '\u03B2', c: CSS.teal },
            { l: '\u03B3', c: CSS.amber }, { l: '\u03B4', c: CSS.violet },
          ].map((s, i) => (
            <div key={i}><span style={{ color: s.c }}>{s.l}</span> {(0.25 + Math.sin(Date.now() * 0.001 * (1 + i * 0.2) + i) * 0.06).toFixed(3)}</div>
          ))}
        </div>

        {/* Bottom gradient + controls */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(0deg,rgba(2,2,8,.85) 0%,rgba(2,2,8,.4) 60%,transparent 100%)',
          padding: '24px 12px 10px', pointerEvents: 'none',
        }}>
          {/* Coherence bar */}
          <div style={{ height: 2, background: CSS.border, borderRadius: 1, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.max(5, H * 100)}%`,
              background: `linear-gradient(90deg, ${boardColor}, ${CSS.teal})`,
              boxShadow: `0 0 8px ${boardColor}`, transition: 'width 0.5s',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
            <div style={{ fontSize: 7, color: CSS.txtDD, letterSpacing: '.2em' }}>
              BOARD: <span style={{ color: boardColor }}>{boardLabel}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setFieldDensity(d => Math.min(d + 1, 6))} style={{ padding: '6px 12px', background: 'rgba(0,0,0,.6)', border: `1px solid ${CSS.border}`, color: CSS.txtD, fontFamily: CSS.mono, fontSize: 8, cursor: 'pointer', borderRadius: 3, letterSpacing: '.1em' }}>+ LAYER</button>
              <button type="button" onClick={() => setFieldDensity(d => Math.max(d - 1, 0))} style={{ padding: '6px 12px', background: 'rgba(0,0,0,.6)', border: `1px solid ${CSS.border}`, color: CSS.txtD, fontFamily: CSS.mono, fontSize: 8, cursor: 'pointer', borderRadius: 3, letterSpacing: '.1em' }}>- LAYER</button>
              <button type="button" onClick={() => setVpSpin(s => !s)} style={{ padding: '6px 12px', background: 'rgba(0,0,0,.6)', border: `1px solid ${vpSpin ? CSS.teal : CSS.border}`, color: vpSpin ? CSS.teal : CSS.txtD, fontFamily: CSS.mono, fontSize: 8, cursor: 'pointer', borderRadius: 3, letterSpacing: '.1em' }}>ROTATE</button>
              <button type="button" onClick={() => { setFieldDensity(3); setVpSpin(true); }} style={{ padding: '6px 12px', background: 'rgba(0,0,0,.6)', border: `1px solid ${CSS.border}`, color: CSS.txtD, fontFamily: CSS.mono, fontSize: 8, cursor: 'pointer', borderRadius: 3, letterSpacing: '.1em' }}>RESET</button>
            </div>
          </div>
        </div>

        {/* Center crosshair */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 24, height: 24, pointerEvents: 'none', opacity: 0.15,
        }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: CSS.teal }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: CSS.teal }} />
        </div>
      </div>

      {/* ══════════ WS: CONSOLE ══════════ */}
      <div style={{ ...panelBase, display: workspace === 'console' ? 'flex' : 'none' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontSize: 11, lineHeight: 1.7 }}>
          {consoleLines.map((l, i) => (
            <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span style={{ color: CSS.txtDD, fontSize: 9, marginRight: 6 }}>{l.ts}</span>
              <span style={{ color: CLS_COLORS[l.cls] }}>{l.text}</span>
            </div>
          ))}
          <div ref={consoleEndRef} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', borderTop: `1px solid ${CSS.border}`, background: CSS.bg1, flexShrink: 0 }}>
          <span style={{ padding: '0 8px', color: CSS.green, fontSize: 12, flexShrink: 0 }}>{'\u23F8'}</span>
          <input
            value={consoleInput}
            onChange={e => setConsoleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') evalConsole(); }}
            placeholder="evaluate expression..."
            autoComplete="off" spellCheck={false}
            style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', outline: 'none', color: CSS.txt, fontFamily: CSS.mono, fontSize: 12 }}
          />
        </div>
      </div>

      {/* ══════════ WS: COPILOT (Centaur Engine) ══════════ */}
      <div style={{ ...panelBase, display: workspace === 'copilot' ? 'flex' : 'none' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${CSS.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: CSS.teal, letterSpacing: '.08em' }}>CENTAUR ENGINE</span>
            <span style={{ fontSize: 8, padding: '2px 6px', border: `1px solid ${CSS.border}`, borderRadius: 3, color: centaurStoreStatus === 'GENERATING' ? CSS.amber : centaurStoreStatus === 'ERROR' ? CSS.red : CSS.green }}>{centaurStoreStatus}</span>
          </div>
          <button type="button" onClick={() => { clearHistory(); setCopilotMsgs([]); setCompileResult(null); setLastCompiled(null); }} style={{ padding: '3px 8px', background: 'none', border: `1px solid ${CSS.border}`, color: CSS.txtDD, fontFamily: CSS.mono, fontSize: 8, cursor: 'pointer', borderRadius: 3 }}>CLEAR</button>
        </div>

        {!hasApiKey && (
          <div style={{ padding: '8px 12px', fontSize: 9, color: CSS.red, background: CSS.redD, borderBottom: `1px solid ${CSS.border}` }}>
            No API key. Switch to 2D Dev Menu to set your key.
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {copilotMsgs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, opacity: 0.3 }}>
              <span style={{ fontSize: 20 }}>&#x2699;</span>
              <span style={{ fontSize: 9, letterSpacing: '.1em' }}>vibe code &gt; compile &gt; mount</span>
              <span style={{ fontSize: 8, maxWidth: 260, textAlign: 'center', lineHeight: 1.5 }}>Describe a React component. Centaur generates it, you compile and mount to an open slot.</span>
            </div>
          )}
          {copilotMsgs.map((msg, i) => (
            <div key={`${msg.ts}-${i}`} style={{ marginBottom: 10, maxWidth: '90%', ...(msg.role === 'user' ? { marginLeft: 'auto' } : {}) }}>
              <div style={{ fontSize: 7, letterSpacing: '.1em', color: msg.role === 'user' ? CSS.txtDD : CSS.teal, marginBottom: 3 }}>{msg.role === 'user' ? 'YOU' : 'CENTAUR'}</div>
              <div style={{
                padding: '8px 10px', fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: msg.role === 'user' ? CSS.bg3 : CSS.tealD,
                border: `1px solid ${msg.role === 'user' ? CSS.borderHi : 'rgba(0,229,255,.15)'}`,
                borderRadius: msg.role === 'user' ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
              }}>
                {msg.content}
                {msg.role === 'assistant' && (
                  <button type="button" onClick={() => handleCompile(msg.content)} style={{
                    display: 'block', marginTop: 6, padding: '4px 10px', background: 'none',
                    border: `1px solid rgba(0,229,255,.2)`, color: CSS.teal, fontFamily: CSS.mono,
                    fontSize: 8, cursor: 'pointer', borderRadius: 3, letterSpacing: '.1em',
                  }}>COMPILE &amp; MOUNT</button>
                )}
              </div>
            </div>
          ))}
          {compileResult && (
            <div style={{ fontSize: 9, padding: '6px 8px', borderRadius: 3, marginBottom: 8, color: compileResult.startsWith('Error') ? CSS.red : CSS.green, background: compileResult.startsWith('Error') ? CSS.redD : CSS.greenD }}>{compileResult}</div>
          )}
          {lastCompiled && (
            <div style={{ padding: '8px 10px', background: CSS.bg2, border: `1px solid ${CSS.border}`, borderRadius: 4, marginBottom: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 'bold', color: CSS.teal, letterSpacing: '.1em', marginBottom: 6 }}>MOUNT TARGET</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {([2, 3, 6, 8, 9] as const).map(slot => {
                  const occupied = !!dynamicSlots[slot];
                  return (
                    <button key={slot} type="button" onClick={() => handleMount(slot)} style={{
                      padding: '4px 10px', background: 'none', border: `1px solid ${occupied ? CSS.border : 'rgba(0,229,255,.2)'}`,
                      color: occupied ? CSS.txtDD : CSS.teal, fontFamily: CSS.mono, fontSize: 8, cursor: 'pointer', borderRadius: 3,
                      opacity: occupied ? 0.4 : 1,
                    }}>SLOT {slot}{occupied ? ' *' : ''}</button>
                  );
                })}
              </div>
            </div>
          )}
          <div ref={copilotEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: `1px solid ${CSS.border}`, background: CSS.bg1, flexShrink: 0 }}>
          <input
            value={copilotInput}
            onChange={e => setCopilotInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendCopilot(); }}
            placeholder="Describe a component..."
            autoComplete="off" spellCheck={false}
            disabled={centaurStatus === 'GENERATING' || !hasApiKey}
            style={{ flex: 1, padding: '10px 12px', background: CSS.bg2, border: `1px solid ${CSS.border}`, color: CSS.txt, fontFamily: CSS.mono, fontSize: 11, borderRadius: 6, outline: 'none' }}
          />
          <button type="button" onClick={() => sendCopilot()} disabled={centaurStatus === 'GENERATING' || !copilotInput.trim() || !hasApiKey} style={{
            padding: '10px 14px', background: CSS.tealD, border: '1px solid rgba(0,229,255,.2)',
            color: CSS.teal, fontFamily: CSS.mono, fontSize: 10, cursor: 'pointer', borderRadius: 6,
            opacity: (centaurStatus === 'GENERATING' || !copilotInput.trim() || !hasApiKey) ? 0.3 : 1,
          }}>SEND</button>
        </div>
      </div>

      {/* ══════════ WS: PHOENIX ══════════ */}
      <div style={{ ...panelBase, display: workspace === 'phoenix' ? 'flex' : 'none' }}>
        {/* Coherence cards */}
        <div style={{ padding: 12, display: 'flex', gap: 8, flexShrink: 0, borderBottom: `1px solid ${CSS.border}`, flexWrap: 'wrap' }}>
          {[
            { label: 'Coherence', value: H.toFixed(3), color: boardColor },
            { label: 'Entropy', value: `${(entropy * 100).toFixed(0)}%`, color: CSS.teal },
            { label: 'QBER', value: '0.02', color: CSS.txtD },
            { label: 'Mesh', value: '1/1', color: CSS.violet },
          ].map(c => (
            <div key={c.label} style={{ flex: 1, minWidth: 80, background: CSS.bg2, border: `1px solid ${CSS.border}`, borderRadius: 6, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 7, letterSpacing: '.15em', color: CSS.txtDD, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* SIC-POVM viz */}
        <div style={{ height: 140, flexShrink: 0, borderBottom: `1px solid ${CSS.border}`, position: 'relative' }}>
          <canvas ref={sicCanvasRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', padding: 8, gap: 4, flexShrink: 0, borderBottom: `1px solid ${CSS.border}` }}>
          {(['witness', 'architect', 'gardener'] as const).map(m => {
            const active = phoenixMode === m;
            const col = m === 'witness' ? CSS.teal : m === 'architect' ? CSS.violet : CSS.green;
            const colD = m === 'witness' ? CSS.tealD : m === 'architect' ? CSS.violetD : CSS.greenD;
            const icons = { witness: '\uD83D\uDC41\uFE0F', architect: '\uD83D\uDD2C', gardener: '\uD83C\uDF31' };
            return (
              <button key={m} onClick={() => setPhoenixMode(m)} style={{
                flex: 1, padding: 8, textAlign: 'center', background: active ? colD : 'none',
                border: `1px solid ${active ? col : CSS.border}`, color: active ? col : CSS.txtDD,
                fontFamily: CSS.mono, fontSize: 9, letterSpacing: '.1em', cursor: 'pointer', borderRadius: 4,
              }}>{icons[m]} {m.charAt(0).toUpperCase() + m.slice(1)}</button>
            );
          })}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {phoenixMsgs.map((m, i) => (
            <div key={i} style={{
              marginBottom: 12, maxWidth: '88%', padding: '10px 14px', lineHeight: 1.6,
              ...(m.type === 'system' ? { background: CSS.bg2, border: `1px solid ${CSS.border}`, borderRadius: 8, color: CSS.txtD, fontSize: 11 } :
                m.type === 'phoenix' ? { background: CSS.tealD, border: '1px solid rgba(0,229,255,.15)', borderRadius: '2px 12px 12px 12px', color: CSS.txt, fontSize: 12 } :
                { marginLeft: 'auto', background: CSS.bg3, border: `1px solid ${CSS.borderHi}`, borderRadius: '12px 2px 12px 12px', fontSize: 12 }),
            }}>{m.text}</div>
          ))}
          <div ref={phoenixEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: `1px solid ${CSS.border}`, background: CSS.bg1, flexShrink: 0 }}>
          <input
            value={phoenixInput}
            onChange={e => setPhoenixInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendPhoenix(); }}
            placeholder="Signal PHOENIX..."
            autoComplete="off"
            style={{ flex: 1, padding: '10px 12px', background: CSS.bg2, border: `1px solid ${CSS.border}`, color: CSS.txt, fontFamily: CSS.mono, fontSize: 12, borderRadius: 6, outline: 'none' }}
          />
          <button onClick={sendPhoenix} style={{ padding: '10px 16px', background: CSS.tealD, border: '1px solid rgba(0,229,255,.2)', color: CSS.teal, fontFamily: CSS.mono, fontSize: 11, cursor: 'pointer', borderRadius: 6 }}>{'\u2191'}</button>
        </div>
      </div>

      {/* ══════════ WS: FILES ══════════ */}
      <div style={{ ...panelBase, display: workspace === 'files' ? 'flex' : 'none' }}>
        <div style={{ display: 'flex', gap: 4, padding: 8, flexShrink: 0, borderBottom: `1px solid ${CSS.border}` }}>
          <button onClick={() => {
            const name = prompt('Filename (e.g. src/new.ts):');
            if (!name) return;
            setFiles(prev => ({ ...prev, [name]: `// ${name}\n// Created ${new Date().toISOString()}\n\n` }));
            openFileTab(name);
          }} style={{ flex: 1, padding: 10, textAlign: 'center', background: CSS.bg2, border: `1px solid ${CSS.border}`, color: CSS.txtD, fontFamily: CSS.mono, fontSize: 9, letterSpacing: '.1em', cursor: 'pointer', borderRadius: 4 }}>+ NEW</button>
          <button onClick={() => { lsSet('files', files); clog('Files saved', 'info'); }} style={{ flex: 1, padding: 10, textAlign: 'center', background: CSS.bg2, border: `1px solid ${CSS.border}`, color: CSS.txtD, fontFamily: CSS.mono, fontSize: 9, cursor: 'pointer', borderRadius: 4 }}>{'\uD83D\uDCBE'} SAVE</button>
          <button onClick={() => {
            const blob = new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qg-ide-project.json'; a.click();
          }} style={{ flex: 1, padding: 10, textAlign: 'center', background: CSS.bg2, border: `1px solid ${CSS.border}`, color: CSS.txtD, fontFamily: CSS.mono, fontSize: 9, cursor: 'pointer', borderRadius: 4 }}>{'\uD83D\uDCE6'} EXPORT</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {(() => {
            const paths = Object.keys(files).sort();
            const folders: Record<string, string[]> = {};
            paths.forEach(p => { const parts = p.split('/'); const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'; (folders[folder] ??= []).push(p); });
            return Object.entries(folders).map(([folder, items]) => (
              <div key={folder}>
                <div style={{ padding: '12px 12px 6px', fontSize: 8, letterSpacing: '.2em', color: CSS.txtDD, textTransform: 'uppercase' }}>{folder === '.' ? 'root' : folder}/</div>
                {items.map(path => (
                  <div key={path} onClick={() => { setWorkspace('editor'); openFileTab(path); }} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 4, cursor: 'pointer',
                    background: path === openFile ? CSS.tealD : 'transparent', color: path === openFile ? CSS.teal : CSS.txt, fontSize: 12,
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0, width: 18, textAlign: 'center' }}>{path.endsWith('.json') ? '\uD83D\uDCCB' : '\uD83D\uDCC4'}</span>
                    <span style={{ flex: 1 }}>{path.split('/').pop()}</span>
                    <span style={{ fontSize: 9, color: CSS.txtDD }}>{files[path].length}b</span>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── BOTTOM TABS ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200, height: 48,
        display: 'flex', background: CSS.bg, borderTop: `1px solid ${CSS.border}`,
      }}>
        {([
          { id: 'editor', icon: '\u2328\uFE0F', label: 'Code' },
          { id: 'viewport', icon: '\uD83D\uDD3A', label: 'View' },
          { id: 'console', icon: '\u23F8', label: 'Term' },
          { id: 'copilot', icon: '\u2699\uFE0F', label: 'AI' },
          { id: 'phoenix', icon: '\uD83D\uDD2E', label: 'PHX' },
          { id: 'files', icon: '\uD83D\uDCC1', label: 'Files' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setWorkspace(t.id)} style={tabStyle(workspace === t.id)}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
            {workspace === t.id && <span style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: CSS.teal, boxShadow: `0 0 8px ${CSS.tealD}` }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
