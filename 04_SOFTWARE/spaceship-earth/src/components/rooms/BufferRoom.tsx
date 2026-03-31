// spaceship-earth/src/components/rooms/BufferRoom.tsx
// The Buffer v2 — Quantum/Classical Bridge
// Samson V2 PID (Shannon entropy) + voltage scoring + fawn guard + chaos ingestion
// + BLUF + PA detection + breathing + calibration + telemetry
// + IndexedDB persistence + unified fawn patterns + backend POST
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNode } from '../../contexts/NodeContext';
import { useSovereignStore } from '../../sovereign/useSovereignStore';
import { loadCalibration, saveCalibration, loadHeldMessages, saveHeldMessages } from '../../utils/bufferStorage';
import { analyzeFawn as analyzeFawnShared } from '../../utils/fawnPatterns';

// ── Design Tokens ────────────────────────────────────────────
const FONT = "var(--font-display)";
const MONO = "var(--font-data)";

const C = {
  bg: { deep: 'var(--s1)', base: 'var(--s1)', raised: 'var(--s2)', border: 'var(--neon-ghost)' },
  text: { primary: 'var(--text)', secondary: 'var(--dim)', dim: 'var(--dim2)' },
  amber: 'var(--amber)', coral: 'var(--coral)', orange: 'var(--orange)', mint: 'var(--mint)',
  lavender: 'var(--lavender)', cyan: 'var(--cyan)', red: 'var(--coral)',
  axis: { A: 'var(--coral)', B: 'var(--cyan)', C: 'var(--amber)', D: 'var(--lavender)' } as Record<string, string>,
  state: { green: 'var(--mint)', yellow: 'var(--amber)', orange: 'var(--orange)', red: 'var(--coral)' },
} as const;

const DIM = 'var(--dim)';

// ── Samson Constants ─────────────────────────────────────────
const TARGET_H = Math.PI / 9; // 0.34906 — The Attractor
const HISTORY_SIZE = 60;      // 60 samples at 1Hz = 1-minute window
const Kp = 1.0, Ki = 0.1, Kd = 0.3;

// ── Breathing Constants ──────────────────────────────────────
const BREATHE_IN = 4;
const BREATHE_HOLD = 2;
const BREATHE_OUT = 6;
const BREATHE_TOTAL = BREATHE_IN + BREATHE_HOLD + BREATHE_OUT;
const MAX_CYCLES = 3;

// ── Voltage Patterns ─────────────────────────────────────────

const U_HIGH = [/\basap\b/i, /\burgent/i, /\bimmediately\b/i, /\bdeadline/i, /\bnow\b/i, /\bcritical/i, /\bemergency/i, /\bfinal notice/i, /\blast chance/i, /\btoday\b/i];
const U_MED = [/\bsoon\b/i, /\bthis week/i, /\breminder/i, /\bfollow.?up/i, /\bpriority/i, /\bimportant/i];
const U_LOW = [/\bfyi\b/i, /\bno rush/i, /\bwhen(ever)? you can/i, /\bjust wanted/i];

const E_HIGH = [/\bdisappointed/i, /\bfrustrat/i, /\bangry/i, /per my last/i, /\bas I (already|previously)/i, /\bunaccept/i, /!{2,}/, /\bconcern(ed|ing)/i, /\bnot sure (why|how)/i];
const E_MED = [/\bconfus/i, /\bworried/i, /\bupset/i, /\bneed to talk/i, /\bhonestly\b/i, /\bfrankly\b/i];
const E_LOW = [/\bthanks?\b/i, /\bgreat\b/i, /\bappreciate/i, /\bno worries/i];

const C_HIGH = [/\d+\s*(item|point|thing|step|question)/i, /\battach/i, /\bspreadsheet/i, /\breview (the|this)/i, /\bcomplex/i, /\blegal/i, /\bcontract/i];
const C_MED = [/\bdecision/i, /\bchoose/i, /\boption/i, /\bschedul/i, /\bavailab/i];
const C_LOW = [/\byes\b/i, /\bno\b/i, /\bok\b/i, /\bsounds good/i, /\bconfirm/i];

// ── PA Detection ─────────────────────────────────────────────

const PA_PATTERNS: { p: RegExp; t: string }[] = [
  { p: /per my last (email|message)/i, t: 'Referencing a previous message you may have missed' },
  { p: /as (previously|already) (stated|mentioned|discussed)/i, t: 'They believe this was covered before' },
  { p: /going forward/i, t: 'They want to change the approach' },
  { p: /just to clarify/i, t: 'They feel there\'s a misunderstanding' },
  { p: /I('m| am) not sure (why|how|what)/i, t: 'Confused or disagrees' },
  { p: /with all due respect/i, t: 'They disagree with you' },
  { p: /please (advise|confirm|clarify)/i, t: 'They need a response' },
  { p: /friendly reminder/i, t: 'They\'ve asked before and want action' },
  { p: /I('ll| will) (just )?go ahead and/i, t: 'Planning to act without your input' },
  { p: /correct me if I('m| am) wrong/i, t: 'They believe they are right' },
  { p: /thanks in advance/i, t: 'They expect you to do this' },
  { p: /not sure if you (saw|got|received)/i, t: 'They think you ignored them' },
  { p: /as per (the |my )?(policy|handbook|agreement)/i, t: 'Citing rules to support their position' },
];

// ── Voltage Scoring ──────────────────────────────────────────

interface VoltageScore {
  u: number; e: number; c: number; v: number;
  gate: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
  pa: { p: RegExp; t: string }[];
}

const GATES = {
  GREEN: { label: 'CLEAR', color: C.mint, bg: 'rgba(0, 255, 136, 0.05)' },
  YELLOW: { label: 'CAUTION', color: C.amber, bg: 'rgba(255, 215, 0, 0.05)' },
  RED: { label: 'HIGH VOLTAGE', color: C.coral, bg: 'rgba(255, 107, 107, 0.05)' },
  CRITICAL: { label: 'CRITICAL', color: C.red, bg: 'rgba(255, 107, 107, 0.1)' },
};

function scoreAxis(text: string, high: RegExp[], med: RegExp[], low: RegExp[], extra?: (text: string, s: number) => number): number {
  let s = 5;
  let h = 0, m = 0, l = 0;
  high.forEach(r => { if (r.test(text)) h++; });
  med.forEach(r => { if (r.test(text)) m++; });
  low.forEach(r => { if (r.test(text)) l++; });
  if (h > 0) s = Math.min(10, 7 + h);
  else if (m > 0) s = Math.min(7, 4 + m);
  else if (l > 0) s = Math.max(1, 3 - l);
  if (extra) s = extra(text, s);
  return Math.max(1, Math.min(10, s));
}

function scoreVoltage(text: string): VoltageScore {
  const u = scoreAxis(text, U_HIGH, U_MED, U_LOW);
  const e = scoreAxis(text, E_HIGH, E_MED, E_LOW, (t, s) => {
    const caps = (t.match(/\b[A-Z]{4,}\b/g) || []).length;
    return caps > 2 ? s + 2 : s;
  });
  const c = scoreAxis(text, C_HIGH, C_MED, C_LOW, (t, s) => {
    const w = t.split(/\s+/).length;
    if (w > 300) s += 2; else if (w > 150) s += 1;
    const q = (t.match(/\?/g) || []).length;
    if (q > 3) s += 2; else if (q > 1) s += 1;
    return s;
  });
  const v = +(u * 0.4 + e * 0.3 + c * 0.3).toFixed(1);
  let gate: VoltageScore['gate'] = 'GREEN';
  if (v >= 8) gate = 'CRITICAL';
  else if (v >= 7) gate = 'RED';
  else if (v >= 5) gate = 'YELLOW';
  const pa = PA_PATTERNS.filter(x => x.p.test(text));
  return { u, e, c, v, gate, pa };
}

// ── BLUF Extraction ──────────────────────────────────────────

interface BlufResult { summary: string; actions: string[]; questions: number; }

function extractBluf(text: string): BlufResult {
  const sents = text.match(/[^.!?]+[.!?]+/g) || [text];
  const acts = sents.filter(s => /\b(need|please|can you|could you|should|must|send|submit|review|update|confirm|decide|approve|call|schedule|respond)\b/i.test(s));
  const qs = sents.filter(s => /\?/.test(s));
  const summary = (acts.length > 0 ? acts : qs.length > 0 ? qs : sents).slice(0, 2).map(s => s.trim()).join(' ');
  return { summary, actions: acts.map(s => s.trim()), questions: qs.length };
}

// ── Fawn Guard (unified via shared module) ──────────────────
import type { FawnFlag, FawnResult } from '../../utils/fawnPatterns';
// analyzeFawn is imported as analyzeFawnShared from '../../utils/fawnPatterns'
const analyzeFawn = analyzeFawnShared;

const CATEGORY_COLOR: Record<string, string> = {
  apologizing: C.coral, minimizing: C.amber, 'over-agreeing': C.mint,
  'seeking-validation': C.amber, 'self-erasing': C.coral,
};

// ── Chaos Ingestion ──────────────────────────────────────────

interface ExtractedItem { type: 'action' | 'date' | 'emotion' | 'question'; text: string; }

function extractFromChaos(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();
  const push = (type: ExtractedItem['type'], text: string) => {
    const key = `${type}:${text}`;
    if (!seen.has(key)) { seen.add(key); items.push({ type, text }); }
  };
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const clean = line.replace(/^[-*\u2022]\s*/, '');
    if (/\b(need to|have to|should|must|todo|to-do|follow up|remember to|don't forget)\b/i.test(line)) push('action', clean);
    if (/\b(\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|this week)\b/i.test(line)) push('date', clean);
    if (/\?$/.test(line)) push('question', clean);
    if (/\b(feel|felt|feeling|scared|angry|happy|sad|anxious|overwhelmed|frustrated|exhausted|grateful|hopeful)\b/i.test(line)) push('emotion', clean);
  }
  return items;
}

const ITEM_COLOR: Record<string, string> = { action: C.mint, date: C.amber, emotion: C.orange, question: C.cyan };
const ITEM_ICON: Record<string, string> = { action: '>', date: '@', emotion: '*', question: '?' };

// ── Samson V2 PID Controller (Shannon Entropy) ───────────────

interface SamsonState {
  H: number;         // normalized Shannon entropy 0-1
  error: number;     // H - target
  pTerm: 'nominal' | 'overloaded' | 'underloaded';
  drift: 'nominal' | 'looping' | 'stagnant';
  burnout: 'ok' | 'warning' | 'critical';
  tension: number;   // composite 0-1
  aiTemp: number;    // suggested AI temperature
  zScore: number;    // standard deviations from mean
}

function shannon(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const probs = values.map(v => v / sum).filter(p => p > 0);
  return -probs.reduce((h, p) => h + p * Math.log2(p), 0);
}

function useSamsonV2(spoonsVal: number, maxSpoons: number) {
  const [state, setState] = useState<SamsonState>({
    H: TARGET_H, error: 0, pTerm: 'nominal', drift: 'nominal',
    burnout: 'ok', tension: 0, aiTemp: 0.7, zScore: 0,
  });

  const historyRef = useRef<number[]>([]);
  const integralRef = useRef(0);
  const prevErrorRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const history = historyRef.current;
      const ratio = maxSpoons > 0 ? spoonsVal / maxSpoons : 1;

      history.push(ratio);
      if (history.length > HISTORY_SIZE) history.shift();

      // Bin into 5 energy levels for entropy calculation
      const bins = [0, 0, 0, 0, 0];
      for (const v of history) {
        const idx = Math.min(4, Math.floor(v * 5));
        bins[idx]++;
      }

      const H = Math.min(1, shannon(bins) / Math.log2(5));
      const error = H - TARGET_H;

      // P — proportional
      const pTerm: SamsonState['pTerm'] =
        error > 0.15 ? 'overloaded' :
        error < -0.15 ? 'underloaded' :
        'nominal';

      // I — integral (drift detection)
      integralRef.current = integralRef.current * 0.95 + error * Ki;
      const iVal = integralRef.current;
      const drift: SamsonState['drift'] =
        Math.abs(iVal) > 0.3 ? (iVal > 0 ? 'looping' : 'stagnant') :
        'nominal';

      // D — derivative (burnout detection)
      const dVal = (error - prevErrorRef.current) * Kd;
      prevErrorRef.current = error;
      const burnout: SamsonState['burnout'] =
        dVal > 0.15 ? 'critical' :
        dVal > 0.05 ? 'warning' :
        'ok';

      // Composite tension: 0-1
      const rawTension = Math.abs(error * Kp) + Math.abs(iVal) + Math.abs(dVal);
      const tension = Math.min(1, Math.max(0, rawTension));

      // AI temperature: calm = creative (0.9), stressed = precise (0.3)
      const aiTemp = +(0.3 + (1 - tension) * 0.6).toFixed(2);

      // Z-score
      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
      const std = Math.sqrt(variance) || 0.001;
      const zScore = +((ratio - mean) / std).toFixed(2);

      setState({ H, error, pTerm, drift, burnout, tension, aiTemp, zScore });
    }, 1000);

    return () => clearInterval(id);
  }, [spoonsVal, maxSpoons]);

  return state;
}

// ── Calibration Schema ───────────────────────────────────────

interface CalibrationData {
  displayName: string;
  role: string;
  diagnoses: string[];
  initialSpoons: number;
  sensoryPrefs: string[];
  sleepQuality: number;
  activeStressors: string[];
  supportLevel: string;
  commStyle: string;
  breathingEnabled: boolean;
  deepLockEnabled: boolean;
}

const DEFAULT_CAL: CalibrationData = {
  displayName: '', role: '', diagnoses: [], initialSpoons: 8,
  sensoryPrefs: [], sleepQuality: 5, activeStressors: [],
  supportLevel: 'Some support', commStyle: 'DIRECT',
  breathingEnabled: true, deepLockEnabled: true,
};

const ROLE_OPTIONS = ['Parent', 'Caregiver', 'Student', 'Professional', 'Advocate', 'Other'];
const DIAGNOSIS_OPTIONS = ['ADHD', 'Autism', 'AuDHD', 'PTSD', 'C-PTSD', 'Anxiety', 'Depression', 'Bipolar', 'OCD', 'Other'];
const SENSORY_OPTIONS = ['Light sensitivity', 'Sound sensitivity', 'Motion sensitivity', 'Reduce animations', 'High contrast needed', 'None / Low'];
const STRESSOR_OPTIONS = ['Legal proceedings', 'Financial pressure', 'Housing instability', 'Caregiving demands', 'Employment issues', 'Relationship conflict', 'Health crisis', 'None currently'];
const SUPPORT_OPTIONS = ['Strong support network', 'Some support', 'Limited support', 'Isolated'];
const COMM_OPTIONS = ['PLAIN', 'TECHNICAL', 'GENTLE', 'DIRECT'];

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface HeldMessage {
  id: string; text: string; voltage: number; gate: string;
  ingestedAt: number; released: boolean;
}

// ── Shared Styles ────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: C.bg.deep, color: C.text.primary,
  border: `1px solid ${C.bg.border}`, borderRadius: 10, padding: '10px 12px',
  fontFamily: FONT, fontSize: 13, outline: 'none', resize: 'vertical',
  letterSpacing: 0.3, boxSizing: 'border-box',
};

const btnBase = (active: boolean, color: string): React.CSSProperties => ({
  background: active ? `${color}11` : 'transparent', fontFamily: FONT,
  border: `1px solid ${active ? `${color}66` : C.bg.border}`,
  color: active ? color : DIM, cursor: active ? 'pointer' : 'default',
  borderRadius: 10, fontSize: 13, letterSpacing: '0.04em', fontWeight: 600,
  boxShadow: active ? `0 0 12px ${color}22` : 'none',
  transition: 'all 0.2s ease',
  minHeight: 48,
  textShadow: active ? `0 0 6px ${color}44` : 'none',
});

const pillBtn = (active: boolean, color: string): React.CSSProperties => ({
  ...btnBase(active, color),
  padding: '8px 14px', fontSize: 12, borderRadius: 20,
  minHeight: 44, minWidth: 44,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  textShadow: active ? `0 0 6px ${color}44` : 'none',
});

// ── Sub-Components ───────────────────────────────────────────

function BufferCard({ title, accent, children }: {
  title: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="glass-card" style={{
      border: `1px solid ${accent}33`, borderRadius: 'var(--radius-lg)',
      display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0,
      transition: 'all var(--trans-base)',
    }}>
      <div style={{
        padding: '10px 16px', borderBottom: `1px solid ${accent}18`,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: accent,
          boxShadow: `0 0 8px ${accent}, 0 0 16px ${accent}66`,
          animation: 'lockPulse 3s ease-in-out infinite',
        }} />
        <span style={{
          color: accent, fontSize: 13, fontWeight: 600, fontFamily: FONT,
          letterSpacing: '0.06em', textShadow: `0 0 12px ${accent}66`,
          textTransform: 'uppercase',
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '14px 16px', flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function SpoonGauge({ spoons, max }: { spoons: number; max: number }) {
  const pct = max > 0 ? (spoons / max) * 100 : 0;
  const color = pct >= 80 ? C.mint : pct >= 50 ? C.state.yellow : pct >= 25 ? C.state.orange : C.state.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 80, height: 6, background: 'var(--neon-faint)',
        borderRadius: 3, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 3, transition: 'width var(--trans-slow), background var(--trans-base)',
          boxShadow: `0 0 6px ${color}66, 0 0 12px ${color}33`,
        }} />
      </div>
      <span style={{ fontSize: 11, color, fontFamily: MONO, fontWeight: 700, textShadow: `0 0 6px ${color}44` }}>
        {spoons.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function SomaticWaveform({ waveform, hr, hrv, status }: {
  waveform: number[]; hr: number; hrv: number; status: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveform.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'var(--neon-faint)';
    ctx.lineWidth = 1;
    for (let y = h * 0.25; y < h; y += h * 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Determine range from data
    const min = Math.min(...waveform) - 5;
    const max = Math.max(...waveform) + 5;
    const range = max - min || 1;

    // Waveform line
    const lineColor = status === 'stress' ? 'var(--coral)'
      : status === 'calibrating' ? 'var(--amber)'
      : 'var(--cyan)';

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
      const x = (i / (waveform.length - 1)) * w;
      const y = h - ((waveform[i] - min) / range) * (h * 0.8) - h * 0.1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [waveform, status]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        style={{ width: 200, height: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--neon-ghost)' }}
      />
      <div style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.4 }}>
        <div style={{ color: status === 'stress' ? 'var(--coral)' : 'var(--cyan)', fontWeight: 700, textShadow: '0 0 8px var(--neon-dim)' }}>
          HR {hr > 0 ? Math.round(hr) : '--'}
        </div>
        <div style={{ color: 'var(--dim)' }}>
          HRV {hrv > 0 ? Math.round(hrv) : '--'}
        </div>
      </div>
    </div>
  );
}

function MultiSelect({ options, selected, onChange, accent }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; accent: string;
}) {
  const toggle = (opt: string) => onChange(
    selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button type="button" key={opt} onClick={() => toggle(opt)} className="glass-btn" style={{
            fontSize: 11, padding: '4px 10px', minHeight: 'auto', minWidth: 'auto',
            background: active ? `${accent}22` : 'transparent',
            color: active ? accent : 'var(--dim)',
            borderColor: active ? `${accent}66` : 'transparent',
            borderRadius: 'var(--radius-xl)',
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function BufferRoom() {
  const { spoons, tier, updateState } = useNode();
  const maxSpoons = 12;

  // M18: Somatic Tether — live biometric data from store
  const somaticStatus = useSovereignStore((s) => s.somaticTetherStatus);
  const somaticHr = useSovereignStore((s) => s.somaticHr);
  const somaticHrv = useSovereignStore((s) => s.somaticHrv);
  const somaticWaveform = useSovereignStore((s) => s.somaticWaveform);
  const fawnGuardActive = useSovereignStore((s) => s.fawnGuardActive);
  const tetherConnected = somaticStatus !== 'disconnected';

  // ── Panels ──
  const [showSamson, setShowSamson] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);

  // ── Calibration (IndexedDB) ──
  const [cal, setCal] = useState<CalibrationData>(DEFAULT_CAL);
  useEffect(() => {
    loadCalibration<CalibrationData>(DEFAULT_CAL).then(loaded => setCal(loaded));
  }, []);
  useEffect(() => {
    saveCalibration(cal);
  }, [cal]);
  const updateCal = useCallback(<K extends keyof CalibrationData>(key: K, value: CalibrationData[K]) => {
    setCal(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Ingest state ──
  const [ingestText, setIngestText] = useState('');
  const [held, setHeld] = useState<HeldMessage[]>([]);
  useEffect(() => {
    loadHeldMessages<HeldMessage>().then(loaded => setHeld(loaded));
  }, []);
  const [processedCount, setProcessedCount] = useState(0);
  const [deferredCount, setDeferredCount] = useState(0);
  const [scoredResult, setScoredResult] = useState<VoltageScore | null>(null);
  const [bluf, setBluf] = useState<BlufResult | null>(null);

  // ── Fawn state ──
  const [draftText, setDraftText] = useState('');
  const [fawn, setFawn] = useState<FawnResult | null>(null);

  // ── Chaos state ──
  const [chaosText, setChaosText] = useState('');
  const [extracted, setExtracted] = useState<ExtractedItem[]>([]);

  // ── Breathing state ──
  const [breathing, setBreathing] = useState(false);
  const [breathSec, setBreathSec] = useState(0);
  const [breathCycles, setBreathCycles] = useState(0);

  // ── Samson V2 PID ──
  const samson = useSamsonV2(spoons, maxSpoons);

  // ── Voltage history for telemetry ──
  const [voltageHistory, setVoltageHistory] = useState<number[]>([]);

  // ── Tick for time-ago ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  // Persist held queue (IndexedDB)
  useEffect(() => {
    saveHeldMessages(held);
  }, [held]);

  // Live scoring
  const liveScore = useMemo(
    () => ingestText.trim().length > 10 ? scoreVoltage(ingestText) : null,
    [ingestText],
  );

  // Live fawn
  useEffect(() => {
    setFawn(draftText.trim().length > 5 ? analyzeFawn(draftText) : null);
  }, [draftText]);

  // Breathing cycle
  useEffect(() => {
    if (!breathing) return;
    const id = setInterval(() => {
      setBreathSec(p => {
        const next = p + 1;
        if (next >= BREATHE_TOTAL) {
          setBreathCycles(cc => cc + 1);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [breathing]);

  // Auto-stop after MAX_CYCLES, restore spoons on each cycle
  useEffect(() => {
    if (breathCycles > 0) {
      // Each cycle restores some energy via state update
      updateState('valence' as Parameters<typeof updateState>[0], 0.5).catch(() => {});
    }
    if (breathCycles >= MAX_CYCLES && breathing) {
      setBreathing(false);
      setBreathCycles(0);
      setBreathSec(0);
    }
  }, [breathCycles, breathing, updateState]);

  const breathLabel = breathSec < BREATHE_IN ? 'BREATHE IN'
    : breathSec < BREATHE_IN + BREATHE_HOLD ? 'HOLD' : 'BREATHE OUT';
  const breathProgress = breathSec < BREATHE_IN
    ? breathSec / BREATHE_IN
    : breathSec < BREATHE_IN + BREATHE_HOLD ? 1
    : 1 - ((breathSec - BREATHE_IN - BREATHE_HOLD) / BREATHE_OUT);

  const threshold = tier === 'REFLEX' ? 0.3 : tier === 'PATTERN' ? 0.5 : 0.7;

  const handleScore = useCallback(() => {
    if (!ingestText.trim()) return;
    const sc = scoreVoltage(ingestText);
    const bl = extractBluf(ingestText);
    setScoredResult(sc);
    setBluf(bl);
    setVoltageHistory(prev => [...prev.slice(-29), sc.v]);
  }, [ingestText]);

  const handleIngest = useCallback(() => {
    if (!scoredResult) return;
    const normalizedV = scoredResult.v / 10;
    if (normalizedV > threshold) {
      setHeld(prev => [{
        id: Date.now().toString(36),
        text: ingestText.trim().slice(0, 500),
        voltage: scoredResult.v,
        gate: scoredResult.gate,
        ingestedAt: Date.now(),
        released: false,
      }, ...prev]);
      setDeferredCount(cc => cc + 1);
    } else {
      setProcessedCount(cc => cc + 1);
    }
    setIngestText('');
    setScoredResult(null);
    setBluf(null);
  }, [ingestText, scoredResult, threshold]);

  const handleRelease = useCallback((id: string) => {
    setHeld(prev => prev.map(m => m.id === id ? { ...m, released: true } : m));
    setProcessedCount(cc => cc + 1);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setHeld(prev => prev.map(m => m.id === id ? { ...m, released: true } : m)); // Logical dismissal
    setHeld(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleExtract = useCallback(() => {
    if (chaosText.trim()) {
      const items = extractFromChaos(chaosText);
      setExtracted(items);

      // POST extracted items to backend for persistence
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      for (const item of items) {
        fetch(`${backendUrl}/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: item.text,
            type: item.type,
            source: 'chaos-ingestion',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => { /* backend may be offline */ });
      }
    }
  }, [chaosText]);

  const heldActive = held.filter(m => !m.released);
  const tierColor = tier === 'REFLEX' ? C.coral : tier === 'PATTERN' ? C.amber : C.mint;
  const gc = scoredResult ? GATES[scoredResult.gate] : null;

  const fawnSummary = useMemo(() => {
    if (!fawn || fawn.flags.length === 0) return null;
    const cats = new Map<string, number>();
    for (const f of fawn.flags) cats.set(f.category, (cats.get(f.category) ?? 0) + 1);
    return [...cats.entries()];
  }, [fawn]);

  const locked = cal.deepLockEnabled && spoons / maxSpoons < 0.25;
  const tensionColor = samson.tension > 0.6 ? C.state.red : samson.tension > 0.3 ? C.state.yellow : C.state.green;

  // Keyboard shortcut: backtick toggles telemetry
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '`') setShowTelemetry(p => !p);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div
      className={fawnGuardActive ? 'thermal-throttle-pulse' : undefined}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', color: C.text.primary, fontFamily: FONT,
        gap: 0, overflow: 'hidden',
        background: C.bg.deep,
        position: 'relative',
      }}
    >
      {/* ══════════════ BREATHING OVERLAY — Minimal ══════════════ */}
      {breathing && (() => {
        const phaseColor = breathLabel === 'BREATHE IN' ? C.cyan
          : breathLabel === 'HOLD' ? C.lavender : C.amber;
        const scale = 0.7 + breathProgress * 0.6;
        const countdown = breathSec < BREATHE_IN ? Math.ceil(BREATHE_IN - breathSec)
          : breathSec < BREATHE_IN + BREATHE_HOLD ? Math.ceil(BREATHE_IN + BREATHE_HOLD - breathSec)
          : Math.ceil(BREATHE_TOTAL - breathSec);
        return (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--void)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          {/* Single breathing circle */}
          <div style={{
            width: 200, height: 200,
            borderRadius: '50%',
            border: `2px solid ${phaseColor}`,
            transform: `scale(${scale})`,
            transition: 'transform 1s ease, border-color 0.8s ease',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <span style={{
              fontSize: 16, color: phaseColor, letterSpacing: 6, fontWeight: 200, fontFamily: FONT,
              transition: 'color 0.8s ease',
            }}>
              {breathLabel}
            </span>
            <span style={{
              fontSize: 24, color: phaseColor, fontFamily: MONO, fontWeight: 300,
              transition: 'color 0.8s ease',
            }}>
              {countdown}
            </span>
          </div>

          {/* Cycle + progress */}
          <div style={{
            marginTop: 40, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 12, color: C.text.secondary, fontFamily: MONO, letterSpacing: 3 }}>
              CYCLE {breathCycles + 1} OF {MAX_CYCLES}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: MAX_CYCLES }, (_, i) => (
                <div key={i} style={{
                  width: 40, height: 3, borderRadius: 2,
                  background: i <= breathCycles ? phaseColor : 'var(--neon-ghost)',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: C.text.dim, fontFamily: MONO }}>
              +0.5 spoons per cycle
            </span>
          </div>

          <button type="button" onClick={() => { setBreathing(false); setBreathCycles(0); setBreathSec(0); }} 
            className="glass-btn" style={{
            color: C.text.secondary, borderRadius: 'var(--radius-md)', padding: '12px 24px',
            fontSize: 12, letterSpacing: 2, marginTop: 24,
          }}>
            SKIP
          </button>
        </div>
        );
      })()}

      {/* ══════════════ STATUS BAR ══════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        borderBottom: `1px solid ${C.amber}22`,
        fontSize: 12, flexShrink: 0,
        background: `linear-gradient(90deg, ${C.amber}06 0%, transparent 40%, transparent 60%, ${C.lavender}04 100%)`,
        flexWrap: 'wrap',
        position: 'relative',
      }}>
        <span style={{
          color: C.amber, fontWeight: 700, letterSpacing: '0.12em', fontSize: 14,
          textShadow: `0 0 16px ${C.amber}88, 0 0 30px ${C.amber}33`,
          fontFamily: FONT,
        }}>
          THE BUFFER
        </span>
        {tetherConnected ? (
          <SomaticWaveform waveform={somaticWaveform} hr={somaticHr} hrv={somaticHrv} status={somaticStatus} />
        ) : (
          <SpoonGauge spoons={spoons} max={maxSpoons} />
        )}
        <span style={{
          color: tierColor, fontWeight: 600, fontSize: 12,
          padding: '6px 12px', borderRadius: 'var(--radius-sm)',
          border: `1px solid ${tierColor}44`, background: `${tierColor}11`,
          textShadow: `0 0 6px ${tierColor}44`,
        }}>{tier}</span>
        <span style={{ flex: 1 }} />

        {/* Samson badge */}
          <button type="button" onClick={() => setShowSamson(!showSamson)} className="glass-btn" style={{
            borderColor: Math.abs(samson.error) > 0.1 ? 'var(--amber)' : 'var(--mint)',
            color: Math.abs(samson.error) > 0.1 ? 'var(--amber)' : 'var(--mint)',
            fontFamily: MONO, fontWeight: 700,
            minHeight: '40px', minWidth: '80px', padding: '0 8px'
          }}>
          H:{samson.H.toFixed(2)} T:{samson.tension.toFixed(1)}
        </button>

        {/* Calibration */}
        <button type="button" onClick={() => setShowCalibration(!showCalibration)} className="glass-btn" 
          style={{ color: 'var(--lavender)', borderColor: 'var(--lavender)44', minHeight: '40px', minWidth: '40px', padding: 0 }}>
          CAL
        </button>

        {/* Telemetry */}
        <button type="button" onClick={() => setShowTelemetry(!showTelemetry)} className="glass-btn"
          style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)44', minHeight: '40px', minWidth: '40px', padding: 0 }}>
          DBG
        </button>

        {/* Breathing */}
        {cal.breathingEnabled && (
          <button type="button" onClick={() => setBreathing(true)} className="glass-btn"
            style={{ color: 'var(--mint)', borderColor: 'var(--mint)44', minHeight: '40px', padding: '0 12px' }}>4-2-6</button>
        )}
      </div>

      {/* ══════════════ SAMSON V2 PANEL ══════════════ */}
      {showSamson && (
        <div style={{
          padding: '12px 16px', background: `var(--neon-ghost)`,
          borderBottom: `1px solid var(--neon-ghost)`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.text.dim, marginBottom: 8, fontWeight: 600, fontFamily: MONO, textShadow: '0 0 4px var(--neon-dim)' }}>
            SAMSON V2 PID CONTROLLER — Shannon Entropy Regulator
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
            <div>
              <span style={{ color: C.text.dim }}>H: </span>
              <span style={{ color: Math.abs(samson.error) < 0.05 ? C.mint : C.amber, fontWeight: 600 }}>{samson.H.toFixed(4)}</span>
              <span style={{ color: C.text.dim, marginLeft: 4, fontSize: 11 }}>target {TARGET_H.toFixed(4)}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>Error: </span>
              <span style={{ color: Math.abs(samson.error) < 0.05 ? C.mint : C.amber }}>{samson.error > 0 ? '+' : ''}{samson.error.toFixed(4)}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>P: </span>
              <span style={{ color: samson.pTerm === 'nominal' ? C.mint : C.amber }}>{samson.pTerm}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>I: </span>
              <span style={{ color: samson.drift === 'nominal' ? C.mint : samson.drift === 'looping' ? C.amber : C.coral }}>{samson.drift}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>D: </span>
              <span style={{ color: samson.burnout === 'ok' ? C.mint : samson.burnout === 'warning' ? C.amber : C.coral }}>{samson.burnout}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>Tension: </span>
              <span style={{ color: tensionColor, fontWeight: 600 }}>{samson.tension.toFixed(3)}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>AI temp: </span>
              <span style={{ color: C.lavender, fontWeight: 600 }}>{samson.aiTemp}</span>
            </div>
            <div>
              <span style={{ color: C.text.dim }}>Z: </span>
              <span style={{ color: Math.abs(samson.zScore) > 2 ? C.coral : C.text.secondary }}>{samson.zScore}</span>
            </div>
          </div>

          {/* Tension bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, background: 'var(--neon-faint)', borderRadius: 2 }}>
              <div style={{
                height: '100%', width: `${samson.tension * 100}%`,
                background: tensionColor, borderRadius: 2, transition: 'width 1s ease',
              }} />
            </div>
          </div>

          {samson.drift === 'looping' && (
            <div className="glass-card" style={{ marginTop: 8, fontSize: 12, color: C.amber, padding: '8px 12px', border: `1px solid ${C.amber}22`, background: 'var(--s2)' }}>
              Loop detected. Consider shifting to a different task or taking a break.
            </div>
          )}
          {samson.drift === 'stagnant' && (
            <div className="glass-card" style={{ marginTop: 8, fontSize: 12, color: C.cyan, padding: '8px 12px', border: `1px solid ${C.cyan}22`, background: 'var(--s2)' }}>
              Stagnation detected. System underloaded. Consider engaging a held message.
            </div>
          )}
          {samson.burnout === 'critical' && (
            <div className="glass-card" style={{ marginTop: 8, fontSize: 12, color: C.coral, padding: '8px 12px', border: `1px solid ${C.coral}22`, background: 'var(--s2)' }}>
              Burnout velocity critical. Defer non-essential messages. Breathe.
            </div>
          )}
        </div>
      )}

      {/* ══════════════ CALIBRATION PANEL ══════════════ */}
      {showCalibration && (
        <div style={{
          padding: '12px 16px', background: `var(--neon-ghost)`,
          borderBottom: `1px solid var(--neon-ghost)`, flexShrink: 0,
          maxHeight: 320, overflow: 'auto',
        }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.text.dim, marginBottom: 10, fontWeight: 600, fontFamily: MONO, textShadow: '0 0 4px var(--neon-dim)' }}>
            CALIBRATION — Answer what feels right. Skip what doesn't.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 11 }}>
            {/* Identity */}
            <div>
              <div style={{ color: C.axis.A, fontWeight: 600, fontSize: 11, letterSpacing: 1, marginBottom: 4, fontFamily: MONO, textShadow: `0 0 6px ${C.axis.A}44` }}>IDENTITY</div>
              <input type="text" value={cal.displayName} onChange={e => updateCal('displayName', e.target.value)}
                placeholder="Name or handle" className="glass-input" style={{ padding: '8px 10px', marginBottom: 4, minHeight: 'auto' }} />
              <select value={cal.role} onChange={e => updateCal('role', e.target.value)}
                title="Primary role" className="glass-input" style={{ padding: '8px 10px', marginBottom: 4, minHeight: 'auto', background: 'var(--s1)' }}>
                <option value="">Role...</option>
                {ROLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <div style={{ fontSize: 11, color: C.text.dim, marginBottom: 2 }}>Neurotype</div>
              <MultiSelect options={DIAGNOSIS_OPTIONS} selected={cal.diagnoses} onChange={v => updateCal('diagnoses', v)} accent={C.axis.A} />
            </div>

            {/* Energy & Health */}
            <div>
              <div style={{ color: C.axis.B, fontWeight: 600, fontSize: 11, letterSpacing: 1, marginBottom: 4, fontFamily: MONO, textShadow: `0 0 6px ${C.axis.B}44` }}>ENERGY</div>
              <label style={{ fontSize: 11, color: C.text.dim, marginBottom: 2, display: 'block' }}>Starting spoons: {cal.initialSpoons}
              <input type="range" min={1} max={12} value={cal.initialSpoons}
                onChange={e => updateCal('initialSpoons', Number(e.target.value))}
                style={{ width: '100%', accentColor: C.axis.B, marginBottom: 4 }} />
              </label>
              <label style={{ fontSize: 11, color: C.text.dim, marginBottom: 2, display: 'block' }}>Sleep quality: {cal.sleepQuality}/10
              <input type="range" min={1} max={10} value={cal.sleepQuality}
                onChange={e => updateCal('sleepQuality', Number(e.target.value))}
                style={{ width: '100%', accentColor: C.axis.B, marginBottom: 4 }} />
              </label>
              <div style={{ fontSize: 11, color: C.text.dim, marginBottom: 2 }}>Sensory</div>
              <MultiSelect options={SENSORY_OPTIONS} selected={cal.sensoryPrefs} onChange={v => updateCal('sensoryPrefs', v)} accent={C.axis.B} />
            </div>

            {/* Obligations */}
            <div>
              <div style={{ color: C.axis.C, fontWeight: 600, fontSize: 11, letterSpacing: 1, marginBottom: 4, fontFamily: MONO, textShadow: `0 0 6px ${C.axis.C}44` }}>OBLIGATIONS</div>
              <div style={{ fontSize: 11, color: C.text.dim, marginBottom: 2 }}>Active stressors</div>
              <MultiSelect options={STRESSOR_OPTIONS} selected={cal.activeStressors} onChange={v => updateCal('activeStressors', v)} accent={C.axis.C} />
              <select value={cal.supportLevel} onChange={e => updateCal('supportLevel', e.target.value)}
                title="Support level" className="glass-input" style={{ padding: '8px 10px', marginTop: 4, minHeight: 'auto', background: 'var(--s1)' }}>
                {SUPPORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Preferences */}
            <div>
              <div style={{ color: C.axis.D, fontWeight: 600, fontSize: 11, letterSpacing: 1, marginBottom: 4, fontFamily: MONO, textShadow: `0 0 6px ${C.axis.D}44` }}>PREFERENCES</div>
              <div style={{ fontSize: 11, color: C.text.dim, marginBottom: 2 }}>Comm style</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {COMM_OPTIONS.map(o => (
                  <button type="button" key={o} onClick={() => updateCal('commStyle', o)} className="glass-btn" style={{
                    minHeight: 'auto', minWidth: 'auto', padding: '4px 8px', fontSize: 10,
                    borderColor: cal.commStyle === o ? C.axis.D : 'transparent',
                    color: cal.commStyle === o ? C.axis.D : 'var(--dim)',
                    background: cal.commStyle === o ? `${C.axis.D}22` : 'transparent',
                  }}>{o}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ fontSize: 12, color: C.text.secondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={cal.breathingEnabled}
                    onChange={e => updateCal('breathingEnabled', e.target.checked)} />
                  Breathing
                </label>
                <label style={{ fontSize: 12, color: C.text.secondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={cal.deepLockEnabled}
                    onChange={e => updateCal('deepLockEnabled', e.target.checked)} />
                  Deep Lock
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TELEMETRY DEBUG PANEL ══════════════ */}
      {showTelemetry && (
        <div style={{
          padding: '10px 16px', background: 'var(--neon-ghost)',
          borderBottom: `1px solid var(--neon-ghost)`, flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.cyan, marginBottom: 6, fontWeight: 600, fontFamily: MONO, textShadow: `0 0 6px ${C.cyan}33` }}>
            IVM TELEMETRY (`)
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, fontFamily: MONO }}>
            <TRow label="Spoons" value={`${spoons.toFixed(1)} / ${maxSpoons}`} color={spoons / maxSpoons > 0.5 ? C.state.green : C.state.orange} />
            <TRow label="Tier" value={tier} color={tierColor} />
            <TRow label="Deep Lock" value={locked ? 'ACTIVE' : 'off'} color={locked ? C.state.red : C.text.dim} />
            <TRow label="H" value={samson.H.toFixed(4)} color={Math.abs(samson.error) < 0.05 ? C.state.green : C.state.yellow} />
            <TRow label="Tension" value={samson.tension.toFixed(3)} color={tensionColor} />
            <TRow label="P" value={samson.pTerm} color={samson.pTerm === 'nominal' ? C.state.green : C.state.yellow} />
            <TRow label="I" value={samson.drift} color={samson.drift === 'nominal' ? C.state.green : C.state.yellow} />
            <TRow label="D" value={samson.burnout} color={samson.burnout === 'ok' ? C.state.green : C.state.red} />
            <TRow label="AI Temp" value={String(samson.aiTemp)} color={C.lavender} />
            <TRow label="Z-Score" value={String(samson.zScore)} color={Math.abs(samson.zScore) > 2 ? C.state.red : C.text.secondary} />
            <TRow label="Processed" value={String(processedCount)} color={C.mint} />
            <TRow label="Deferred" value={String(deferredCount)} color={C.coral} />
            <TRow label="Held" value={String(heldActive.length)} color={heldActive.length > 0 ? C.coral : C.mint} />
            <TRow label="Threshold" value={`${(threshold * 10).toFixed(0)}/10`} color={C.text.secondary} />
            <TRow label="Cal" value={cal.displayName || '(uncalibrated)'} color={cal.displayName ? C.lavender : C.text.dim} />
            <TRow label="Comm" value={cal.commStyle} color={C.axis.D} />
          </div>

          {/* Voltage history sparkline */}
          {voltageHistory.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: C.text.dim, marginBottom: 2 }}>VOLTAGE HISTORY</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 20 }}>
                {voltageHistory.map((v, i) => {
                  const h = (v / 10) * 20;
                  const barColor = v >= 8 ? C.state.red : v >= 7 ? C.state.orange : v >= 5 ? C.state.yellow : C.state.green;
                  return <div key={i} style={{ width: 4, height: h, background: barColor, borderRadius: 1 }} />;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ DEEP PROCESSING LOCK ══════════════ */}
      {locked && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          background: `rgba(255,107,107,0.02)`, padding: 24,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            border: `2px solid var(--coral)44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 32 }}>&#x1F6E1;</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--coral)', fontWeight: 600, letterSpacing: 3, fontFamily: MONO }}>
            DEEP PROCESSING LOCK
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
            Energy below 25%. New inputs blocked to protect your capacity.
          </div>
          <div style={{ fontSize: 24, color: 'var(--coral)', fontFamily: MONO, fontWeight: 700 }}>
            {spoons.toFixed(1)} / {maxSpoons}
          </div>

          {/* Recovery actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {cal.breathingEnabled && (
              <button type="button" onClick={() => setBreathing(true)} className="glass-btn" style={{
                color: 'var(--mint)', borderColor: 'var(--mint)44', padding: '10px 20px', minHeight: 'auto'
              }}>
                BREATHE (4-2-6)
              </button>
            )}
            <button type="button" onClick={() => {
              updateState('valence' as Parameters<typeof updateState>[0], 2).catch(() => {});
            }} className="glass-btn" style={{
              color: 'var(--dim)', padding: '10px 20px', minHeight: 'auto'
            }}>
              NAP (+2)
            </button>
            <button type="button" onClick={() => {
              updateState('valence' as Parameters<typeof updateState>[0], 1).catch(() => {});
            }} className="glass-btn" style={{
              color: 'var(--dim)', padding: '10px 20px', minHeight: 'auto'
            }}>
              HEAVY WORK (+1)
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ MAIN 3-COLUMN GRID ══════════════ */}
      {!locked && (
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 12, minHeight: 0, padding: '12px 16px', overflow: 'auto',
        }}>
          {/* ═══ INGEST ═══ */}
          <BufferCard title="Incoming Messages" accent={C.amber}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: C.amber }}>Paste and scan</div>
              <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                held <span style={{ color: heldActive.length > 0 ? C.coral : C.mint, fontWeight: 600 }}>{heldActive.length}</span>
              </div>
            </div>

            <textarea
              value={ingestText}
              onChange={e => { setIngestText(e.target.value); setScoredResult(null); setBluf(null); }}
              placeholder="Paste a message, email, or text to scan..."
              rows={4}
              className="glass-input"
              style={{
                borderColor: liveScore ? `${GATES[liveScore.gate].color}44` : 'var(--neon-ghost)',
                background: 'var(--s2)'
              }}
            />

            {/* Pre-score hint */}
            {liveScore && !scoredResult && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--dim)' }}>
                <span>~{liveScore.v}/10</span>
                <span style={{ color: GATES[liveScore.gate].color }}>{liveScore.gate}</span>
              </div>
            )}

            <button type="button" onClick={handleScore} disabled={!ingestText.trim()}
              className="glass-btn" style={{ width: '100%', marginTop: 8, padding: '8px', color: 'var(--amber)', borderColor: 'var(--amber)44' }}>
              SCORE
            </button>

            {/* Scored result */}
            {scoredResult && gc && (
              <div style={{ marginTop: 10, borderTop: `1px solid var(--neon-ghost)`, paddingTop: 10 }}>
                {/* Voltage header */}
                <div className="glass-card" style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: gc.bg, border: `1px solid ${gc.color}33`,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: gc.color }}>{scoredResult.v}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: gc.color, letterSpacing: 2, textShadow: `0 0 6px ${gc.color}44` }}>{scoredResult.gate} {gc.label}</div>
                    <div style={{ fontSize: 11, color: C.text.dim, fontFamily: MONO }}>U:{scoredResult.u} E:{scoredResult.e} C:{scoredResult.c}</div>
                  </div>
                </div>

                {/* Score bars */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {([['URG', scoredResult.u, C.cyan], ['EMO', scoredResult.e, C.lavender], ['COG', scoredResult.c, C.amber]] as const).map(([l, v, barColor]) => (
                    <div key={l} style={{ flex: 1 }}>
                      <div style={{ height: 4, background: 'var(--neon-faint)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${v * 10}%`, background: barColor, borderRadius: 4, transition: 'width 0.3s', boxShadow: `0 0 6px ${barColor}` }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, fontFamily: MONO }}>{l} {v}</div>
                    </div>
                  ))}
                </div>

                {/* PA patterns */}
                {scoredResult.pa.length > 0 && (
                  <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', marginBottom: 8, background: `var(--neon-ghost)`, border: `1px solid ${C.lavender}12` }}>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.lavender, marginBottom: 4, fontWeight: 600, fontFamily: MONO, textShadow: `0 0 6px ${C.lavender}33` }}>SUBTEXT DETECTED</div>
                    {scoredResult.pa.map((p, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.text.secondary, marginBottom: 1, lineHeight: 1.5 }}>{p.t}</div>
                    ))}
                  </div>
                )}

                {/* BLUF */}
                {bluf && (
                  <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', marginBottom: 8, background: 'var(--neon-ghost)', border: `1px solid var(--neon-ghost)` }}>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--dim)', marginBottom: 4, fontWeight: 600, fontFamily: MONO }}>BLUF</div>
                    <div style={{ fontSize: 11, color: C.text.secondary, lineHeight: 1.6 }}>{bluf.summary}</div>
                    {bluf.actions.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {bluf.actions.slice(0, 3).map((a, i) => (
                          <div key={i} style={{ fontSize: 12, color: C.text.secondary, paddingLeft: 8, borderLeft: `2px solid ${gc.color}33`, marginBottom: 2 }}>
                            {a.substring(0, 100)}
                          </div>
                        ))}
                      </div>
                    )}
                    {bluf.questions > 0 && (
                      <div style={{ fontSize: 11, color: C.cyan, marginTop: 4, textShadow: `0 0 4px ${C.cyan}33` }}>{bluf.questions} question{bluf.questions > 1 ? 's' : ''} detected</div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={handleIngest} disabled={fawnGuardActive} 
                    className="glass-btn"
                    style={{
                    color: fawnGuardActive ? 'var(--dim)' : scoredResult.v / 10 > threshold ? 'var(--coral)' : 'var(--mint)',
                    borderColor: fawnGuardActive ? 'var(--neon-ghost)' : scoredResult.v / 10 > threshold ? 'var(--coral)44' : 'var(--mint)44',
                    flex: 1, padding: '8px', minHeight: 'auto'
                  }}>
                    {fawnGuardActive ? 'LOCKED' : scoredResult.v / 10 > threshold ? 'HOLD' : 'PROCESS'}
                  </button>
                  <button type="button" onClick={() => { setScoredResult(null); setBluf(null); setIngestText(''); }} 
                    className="glass-btn" style={{ padding: '8px', width: 50, minHeight: 'auto', color: 'var(--dim)' }}>CLR</button>
                </div>
              </div>
            )}

            {/* Held messages */}
            {heldActive.length > 0 && (
              <div style={{ marginTop: 10, borderTop: `1px solid var(--neon-ghost)`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: C.coral, marginBottom: 6, fontWeight: 600 }}>
                  Holding ({heldActive.length})
                </div>
                {heldActive.slice(0, 5).map(msg => (
                  <div key={msg.id} style={{
                    padding: '6px 0', borderBottom: `1px solid var(--neon-ghost)`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
                        {msg.text.slice(0, 40)}
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--dim)' }}>
                        <span style={{ color: GATES[msg.gate as keyof typeof GATES]?.color ?? C.coral, fontWeight: 600 }}>{msg.gate} {msg.voltage}</span>
                        <span>{timeAgo(msg.ingestedAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={() => handleRelease(msg.id)} className="glass-btn" style={{ minHeight: 'auto', minWidth: 'auto', padding: '2px 8px', color: 'var(--mint)' }}>ok</button>
                      <button type="button" onClick={() => handleDismiss(msg.id)} className="glass-btn" style={{ minHeight: 'auto', minWidth: 'auto', padding: '2px 8px', color: 'var(--coral)' }}>x</button>
                    </div>
                  </div>
                ))}
                {heldActive.length > 5 && (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>+{heldActive.length - 5} more held</div>
                )}
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8, fontFamily: MONO }}>
              {processedCount}P {deferredCount}D {held.filter(m => m.released).length}R
            </div>
          </BufferCard>

          {/* ═══ FAWN GUARD ═══ */}
          <BufferCard title="Fawn Guard" accent={C.coral}>
            <div style={{ fontSize: 12, color: C.coral, marginBottom: 10 }}>Check before you send</div>

            <textarea
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              placeholder="Paste your reply before sending..."
              rows={5}
              className="glass-input"
              style={{
                borderColor: fawn && fawn.score > 0.3 ? `${C.coral}44` : 'var(--neon-ghost)',
                background: 'var(--s2)'
              }}
            />

            {/* Fawn score bar */}
            {fawn && fawn.matchCount > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 3, background: 'var(--neon-faint)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', width: `${fawn.score * 100}%`,
                    background: fawn.score > 0.5 ? C.coral : C.amber,
                    borderRadius: 2, transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, fontFamily: MONO }}>
                  fawn score: {(fawn.score * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {/* Category summary */}
            {fawnSummary && fawnSummary.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {fawnSummary.map(([cat, count]) => (
                  <div key={cat} className="glass-card" style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 'var(--radius-md)',
                    background: `${CATEGORY_COLOR[cat] ?? 'var(--dim)'}11`,
                    border: `1px solid ${(CATEGORY_COLOR[cat] ?? 'var(--dim)')}33`,
                  }}>
                    <span style={{ fontSize: 11, color: CATEGORY_COLOR[cat], fontWeight: 600 }}>{cat} ({count})</span>
                  </div>
                ))}
              </div>
            )}

            {fawn && fawn.flags.length > 0 && (
              <div style={{ marginTop: 10, borderTop: `1px solid var(--neon-ghost)`, paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: fawn.score > 0.4 ? C.coral : C.amber, fontWeight: 600 }}>Patterns Detected</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: fawn.score > 0.4 ? C.coral : C.amber }}>{fawn.matchCount}</span>
                </div>
                {fawn.flags.map((flag, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: `1px solid var(--neon-ghost)` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: CATEGORY_COLOR[flag.category] ?? C.amber, fontWeight: 500 }}>"{flag.pattern}"</span>
                      <span className="glass-card" style={{
                        fontSize: 11, color: CATEGORY_COLOR[flag.category] ?? 'var(--dim)',
                        border: `1px solid ${(CATEGORY_COLOR[flag.category] ?? 'var(--dim)')}33`,
                        borderRadius: 6, padding: '4px 8px', fontWeight: 600,
                        background: 'var(--s1)'
                      }}>{flag.category}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3, fontStyle: 'italic', lineHeight: 1.5 }}>{flag.guidance}</div>
                  </div>
                ))}
                <button type="button" onClick={() => setDraftText('')} className="glass-btn" style={{ width: '100%', marginTop: 10, padding: '8px', color: 'var(--mint)', borderColor: 'var(--mint)44', minHeight: 'auto' }}>
                  I see it — send with awareness
                </button>
              </div>
            )}

            {fawn && fawn.flags.length === 0 && draftText.trim().length > 10 && (
              <div className="glass-card" style={{
                marginTop: 10, padding: '10px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${C.mint}33`, background: 'var(--s2)',
              }}>
                <div style={{ fontSize: 13, color: C.mint, fontWeight: 500 }}>
                  No fawn patterns detected. Your voice is clear.
                </div>
              </div>
            )}
          </BufferCard>

          {/* ═══ CHAOS INGESTION ═══ */}
          <BufferCard title="Chaos Ingestion" accent={C.orange}>
            <div style={{ fontSize: 12, color: C.orange, marginBottom: 10 }}>Dump raw text, extract structure</div>

            <textarea
              value={chaosText}
              onChange={e => setChaosText(e.target.value)}
              placeholder="Journal, notes, brain dump, voice-to-text..."
              rows={6}
              className="glass-input"
              style={{ background: 'var(--s2)' }}
            />
            <button type="button" onClick={handleExtract} disabled={!chaosText.trim()}
              className="glass-btn" style={{ width: '100%', marginTop: 8, padding: '8px', color: 'var(--orange)', borderColor: 'var(--orange)44', minHeight: 'auto' }}>
              Extract Structure
            </button>

            {extracted.length > 0 && (
              <div style={{ marginTop: 10, borderTop: `1px solid var(--neon-ghost)`, paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Extracted</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['action', 'date', 'emotion', 'question'] as const).map(type => {
                      const count = extracted.filter(e => e.type === type).length;
                      if (!count) return null;
                      return (
                        <span key={type} className="glass-card" style={{
                          fontSize: 11, padding: '4px 8px', borderRadius: 6,
                          background: 'var(--s1)', color: ITEM_COLOR[type], fontWeight: 600,
                          border: `1px solid ${ITEM_COLOR[type]}33`
                        }}>
                          {ITEM_ICON[type]}{count}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {extracted.map((item, i) => (
                  <div key={i} style={{
                    padding: '5px 0', borderBottom: `1px solid var(--neon-ghost)`,
                    display: 'flex', gap: 6, alignItems: 'flex-start',
                  }}>
                    <span style={{
                      fontSize: 11, color: ITEM_COLOR[item.type], fontWeight: 600, flexShrink: 0, width: 14, textAlign: 'center',
                    }}>{ITEM_ICON[item.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, opacity: 0.8 }}>
                        {item.text.slice(0, 100)}{item.text.length > 100 ? '...' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: ITEM_COLOR[item.type], fontWeight: 600 }}>{item.type.toUpperCase()}</div>
                    </div>
                  </div>
                ))}

                {/* Copy structured output */}
                <button type="button" onClick={() => {
                  const output = extracted.map(e => `[${e.type.toUpperCase()}] ${e.text}`).join('\n');
                  navigator.clipboard.writeText(output).catch(() => {});
                }} className="glass-btn" style={{ width: '100%', marginTop: 8, padding: '8px', color: 'var(--orange)', borderColor: 'var(--orange)44', minHeight: 'auto' }}>
                  Copy to Clipboard
                </button>
              </div>
            )}
          </BufferCard>
        </div>
      )}

      {/* ══════════════ TELEMETRY FOOTER ══════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderTop: `1px solid var(--neon-ghost)`,
        background: `linear-gradient(90deg, ${C.amber}04 0%, transparent 50%, ${C.cyan}04 100%)`,
        flexShrink: 0, fontSize: 11, fontFamily: MONO,
        color: 'var(--dim)', gap: 8,
      }}>
        <span style={{ color: 'var(--amber)', fontWeight: 600, textShadow: `0 0 6px var(--neon-dim)` }}>{cal.displayName || 'uncalibrated'}</span>
        <span style={{ color: 'var(--dim)' }}>
          {processedCount}P {deferredCount}D {heldActive.length}H
        </span>
        <span style={{ color: tensionColor, fontWeight: 600, textShadow: `0 0 6px var(--neon-dim)` }}>
          T:{samson.tension.toFixed(2)}
        </span>
        <span style={{ color: 'var(--lavender)', textShadow: `0 0 6px var(--neon-dim)` }}>
          AI:{samson.aiTemp}
        </span>
        <span style={{ color: 'var(--dim)' }}>
          {cal.commStyle}
        </span>
        <span style={{ color: samson.drift !== 'nominal' ? 'var(--amber)' : 'var(--dim)', fontWeight: samson.drift !== 'nominal' ? 700 : 400 }}>
          {samson.drift !== 'nominal' ? samson.drift.toUpperCase() : 'NOMINAL'}
        </span>
      </div>
    </div>
  );
}

// ── Telemetry Row Helper ─────────────────────────────────────

function TRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, minWidth: 100 }}>
      <span style={{ color: 'var(--dim)' }}>{label}:</span>
      <span style={{ color, fontWeight: 600, textShadow: `0 0 6px var(--neon-dim)` }}>{value}</span>
    </div>
  );
}

