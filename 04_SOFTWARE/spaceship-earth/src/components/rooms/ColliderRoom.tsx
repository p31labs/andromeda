// ColliderRoom — Particle Collider + Organic Forge
// Atoms drift with physics. Bonding is automatic on proximity (valence rules).
// Cyclotron mode: accelerate atoms in a ring, launch them to collide and fuse.
// P31 brand: #00FF88 green, #00D4FF cyan, #FF00CC magenta, #7A27FF violet, #FFB800 amber.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { playMissingNodePulse } from '../../services/audioManager';

const FONT = "var(--font-display)";
const FONT_DATA = "var(--font-data)";

// P31 Neon Phosphor palette — theme-reactive via CSS variables
const VIOLET = 'var(--violet)';
const MAGENTA = 'var(--magenta)';
const CYAN = 'var(--cyan)';
const GREEN = 'var(--cyan)';
const AMBER = 'var(--amber)';
const CORAL = 'var(--coral)';
const TEXT = 'var(--text)';
const DIM = 'var(--neon-faint)';

// ── Element Data ──

interface ElementDef {
  sym: string;
  name: string;
  valence: number;
  color: string;
  radius: number;
  mass: number;
}

const ELEMENTS: Record<string, ElementDef> = {
  H:  { sym: 'H',  name: 'Hydrogen',    valence: 1, color: '#AAE0FF', radius: 18, mass: 1 },
  C:  { sym: 'C',  name: 'Carbon',      valence: 4, color: '#22CC55', radius: 26, mass: 12 },
  N:  { sym: 'N',  name: 'Nitrogen',     valence: 3, color: '#2288FF', radius: 24, mass: 14 },
  O:  { sym: 'O',  name: 'Oxygen',       valence: 2, color: '#FF2244', radius: 24, mass: 16 },
  Na: { sym: 'Na', name: 'Sodium',       valence: 1, color: '#FFBB22', radius: 28, mass: 23 },
  P:  { sym: 'P',  name: 'Phosphorus',   valence: 3, color: '#AA44FF', radius: 26, mass: 31 },
  Ca: { sym: 'Ca', name: 'Calcium',      valence: 2, color: '#BBDDFF', radius: 30, mass: 40 },
  Cl: { sym: 'Cl', name: 'Chlorine',     valence: 1, color: '#22FF44', radius: 24, mass: 35 },
  S:  { sym: 'S',  name: 'Sulfur',       valence: 2, color: '#FFEE22', radius: 26, mass: 32 },
  Fe: { sym: 'Fe', name: 'Iron',         valence: 3, color: '#FF5533', radius: 28, mass: 56 },
};

// ── Molecule Recipes ──

interface MoleculeRecipe {
  formula: string;
  display: string;
  name: string;
  atoms: Record<string, number>;
  reward: number;
}

const RECIPES: MoleculeRecipe[] = [
  { formula: 'H\u2082', display: 'H\u2082', name: 'Hydrogen Gas', atoms: { H: 2 }, reward: 5 },
  { formula: 'O\u2082', display: 'O\u2082', name: 'Oxygen Gas', atoms: { O: 2 }, reward: 5 },
  { formula: 'H\u2082O', display: 'H\u2082O', name: 'Water', atoms: { H: 2, O: 1 }, reward: 10 },
  { formula: 'CO\u2082', display: 'CO\u2082', name: 'Carbon Dioxide', atoms: { C: 1, O: 2 }, reward: 15 },
  { formula: 'CH\u2084', display: 'CH\u2084', name: 'Methane', atoms: { C: 1, H: 4 }, reward: 20 },
  { formula: 'H\u2083N', display: 'NH\u2083', name: 'Ammonia', atoms: { N: 1, H: 3 }, reward: 15 },
  { formula: 'ClNa', display: 'NaCl', name: 'Table Salt', atoms: { Na: 1, Cl: 1 }, reward: 10 },
  { formula: 'H\u2082O\u2082', display: 'H\u2082O\u2082', name: 'Hydrogen Peroxide', atoms: { H: 2, O: 2 }, reward: 20 },
  { formula: 'C\u2082H\u2086', display: 'C\u2082H\u2086', name: 'Ethane', atoms: { C: 2, H: 6 }, reward: 30 },
  { formula: 'ClH', display: 'HCl', name: 'Hydrochloric Acid', atoms: { H: 1, Cl: 1 }, reward: 10 },
  { formula: 'H\u2082S', display: 'H\u2082S', name: 'Hydrogen Sulfide', atoms: { H: 2, S: 1 }, reward: 15 },
  { formula: 'CaO', display: 'CaO', name: 'Quicklime', atoms: { Ca: 1, O: 1 }, reward: 15 },
  { formula: 'FeS', display: 'FeS', name: 'Iron Sulfide', atoms: { Fe: 1, S: 1 }, reward: 20 },
  { formula: 'N\u2082', display: 'N\u2082', name: 'Nitrogen Gas', atoms: { N: 2 }, reward: 10 },
  { formula: 'O\u2085P\u2082', display: 'P\u2082O\u2085', name: 'Phosphorus Pentoxide', atoms: { P: 2, O: 5 }, reward: 40 },
  { formula: 'C\u2086H\u2081\u2082O\u2086', display: 'C\u2086H\u2081\u2082O\u2086', name: 'Glucose', atoms: { C: 6, H: 12, O: 6 }, reward: 100 },
];

// ── Quest Chains ──

interface Quest {
  id: string;
  name: string;
  description: string;
  color: string;
  steps: string[];
  reward: number;
}

const QUESTS: Quest[] = [
  { id: 'genesis', name: 'Genesis', description: 'The first molecules', color: CYAN, steps: ['H\u2082', 'O\u2082', 'H\u2082O', 'H\u2082O\u2082'], reward: 50 },
  { id: 'kitchen', name: 'Kitchen Chemistry', description: 'Everyday molecules', color: GREEN, steps: ['H\u2082O', 'CO\u2082', 'CH\u2084', 'H\u2083N', 'C\u2082H\u2086'], reward: 75 },
  { id: 'forge', name: 'The Forge', description: 'Metal and fire', color: AMBER, steps: ['FeS', 'CaO', 'H\u2082S'], reward: 100 },
  { id: 'lab', name: 'The Lab', description: 'Acids and salts', color: VIOLET, steps: ['ClH', 'ClNa', 'H\u2082S', 'H\u2083N'], reward: 125 },
];

// ── Physics atom ──

interface PhysAtom {
  id: number;
  sym: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bondsUsed: number;
  inRing: boolean; // in cyclotron ring
  ringAngle: number;
  ringSpeed: number;
}

interface BondLine {
  from: number;
  to: number;
  age: number; // for glow animation
}

// ── Flash particle ──

interface FlashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// ── Formula builder ──

function buildFormula(atoms: PhysAtom[], bonds: BondLine[]): string | null {
  if (atoms.length < 2 || bonds.length === 0) return null;
  const adj = new Map<number, Set<number>>();
  for (const a of atoms) adj.set(a.id, new Set());
  for (const b of bonds) {
    adj.get(b.from)?.add(b.to);
    adj.get(b.to)?.add(b.from);
  }
  const visited = new Set<number>();
  const queue = [atoms[0].id];
  visited.add(atoms[0].id);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const n of adj.get(curr) ?? []) {
      if (!visited.has(n)) { visited.add(n); queue.push(n); }
    }
  }
  if (visited.size !== atoms.length) return null;

  const counts: Record<string, number> = {};
  for (const a of atoms) counts[a.sym] = (counts[a.sym] ?? 0) + 1;
  const sub = (n: number) => n <= 1 ? '' : String(n).split('').map(d => '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089'[+d]).join('');
  let formula = '';
  const ordered: string[] = [];
  if (counts['C']) ordered.push('C');
  if (counts['H']) ordered.push('H');
  for (const sym of Object.keys(counts).sort()) {
    if (sym !== 'C' && sym !== 'H') ordered.push(sym);
  }
  for (const sym of ordered) formula += sym + sub(counts[sym]);
  return formula;
}

function getStability(atoms: PhysAtom[]): { filled: number; total: number; pct: number; complete: boolean } {
  let total = 0, filled = 0;
  for (const a of atoms) {
    const el = ELEMENTS[a.sym];
    if (el) { total += el.valence; filled += a.bondsUsed; }
  }
  const pct = total > 0 ? filled / total : 0;
  return { filled, total, pct, complete: total > 0 && filled === total };
}

// ── Cyclotron ring geometry ──

const RING_CX_RATIO = 0.5;
const RING_CY_RATIO = 0.48;
const RING_R_RATIO = 0.28;

// ── Main Component ──

let nextId = 1;

export function ColliderRoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  // State
  const [atoms, setAtoms] = useState<PhysAtom[]>([]);
  const [bonds, setBonds] = useState<BondLine[]>([]);
  const [score, setScore] = useState(0);
  const [discoveries, setDiscoveries] = useState<string[]>([]);
  const [questProgress, setQuestProgress] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const q of QUESTS) m[q.id] = new Set();
    return m;
  });
  const [selectedElement, setSelectedElement] = useState<string>('H');
  const [cyclotronMode, setCyclotronMode] = useState(false);
  const [cyclotronEnergy, setCyclotronEnergy] = useState(0);
  const [toast, setToast] = useState('');
  const [collisionFlashes, setCollisionFlashes] = useState<FlashParticle[]>([]);
  const [missingNodeRevealed, setMissingNodeRevealed] = useState(false);

  // Refs for physics loop
  const atomsRef = useRef(atoms);
  const bondsRef = useRef(bonds);
  atomsRef.current = atoms;
  bondsRef.current = bonds;
  const flashesRef = useRef(collisionFlashes);
  flashesRef.current = collisionFlashes;

  const formula = useMemo(() => buildFormula(atoms, bonds), [atoms, bonds]);
  const stability = useMemo(() => getStability(atoms), [atoms]);
  const matchedRecipe = useMemo(() => formula ? RECIPES.find(r => r.formula === formula) : null, [formula]);

  // Discovery + quest advancement
  useEffect(() => {
    if (!matchedRecipe || !stability.complete) return;
    if (discoveries.includes(matchedRecipe.formula)) return;
    setDiscoveries(prev => [...prev, matchedRecipe.formula]);
    setScore(s => s + matchedRecipe.reward);
    showToast(`${matchedRecipe.name} discovered! +${matchedRecipe.reward}`);
    setQuestProgress(prev => {
      const next = { ...prev };
      for (const q of QUESTS) {
        if (q.steps.includes(matchedRecipe.formula)) {
          const updated = new Set(prev[q.id]);
          updated.add(matchedRecipe.formula);
          next[q.id] = updated;
          if (updated.size === q.steps.length) {
            setScore(s => s + q.reward);
            showToast(`Quest "${q.name}" complete! +${q.reward}`);
          }
        }
      }
      return next;
    });
  }, [matchedRecipe, stability.complete, discoveries]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  // ── Background particle field + cyclotron ring (canvas) ──

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    type BgStar = { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number };
    const stars: BgStar[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: Math.random() * 1.2 + 0.2,
      color: [MAGENTA, AMBER, CYAN, VIOLET, TEXT][Math.floor(Math.random() * 5)],
      alpha: Math.random() * 0.35 + 0.05,
    }));

    let ringPulse = 0;

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
      }

      // Constellation lines
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = VIOLET;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < Math.min(i + 20, stars.length); j++) {
          const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y;
          if (dx * dx + dy * dy < 5000) {
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      // Cyclotron ring
      const cx = w * RING_CX_RATIO;
      const cy = h * RING_CY_RATIO;
      const rr = Math.min(w, h) * RING_R_RATIO;
      ringPulse += 0.02;

      // Outer ring glow
      const ringAlpha = 0.08 + Math.sin(ringPulse) * 0.03;
      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();

      // Inner guide ring
      ctx.globalAlpha = ringAlpha * 0.5;
      ctx.strokeStyle = VIOLET;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rr * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      // Magnetic field lines (decorative arcs)
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = MAGENTA;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + ringPulse * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, rr + 12 + Math.sin(a * 3 + ringPulse) * 8, a, a + Math.PI / 3);
        ctx.stroke();
      }

      // Energy arcs when cyclotron active
      const ringAtoms = atomsRef.current.filter(a => a.inRing);
      if (ringAtoms.length > 0) {
        ctx.globalAlpha = 0.15 + Math.sin(ringPulse * 3) * 0.05;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Collision flash particles
      const flashes = flashesRef.current;
      for (const p of flashes) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * window.devicePixelRatio, p.y * window.devicePixelRatio, 2 + p.life * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, []);

  // ── Physics tick: drift, auto-bond, cyclotron orbit ──

  useEffect(() => {
    const BOND_DIST = 65;
    const REPEL_DIST = 40;
    const DAMPING = 0.985;
    const JITTER = 0.08;

    const tick = () => {
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const cx = w * RING_CX_RATIO;
      const cy = h * RING_CY_RATIO;
      const rr = Math.min(w, h) * RING_R_RATIO;

      setAtoms(prev => {
        const next = prev.map(a => ({ ...a }));
        const newBonds: BondLine[] = [];

        for (const a of next) {
          if (a.inRing) {
            // Cyclotron orbit
            a.ringAngle += a.ringSpeed;
            a.x = cx + Math.cos(a.ringAngle) * rr;
            a.y = cy + Math.sin(a.ringAngle) * rr;
            continue;
          }

          // Jitter
          a.vx += (Math.random() - 0.5) * JITTER;
          a.vy += (Math.random() - 0.5) * JITTER;

          // Damping
          a.vx *= DAMPING;
          a.vy *= DAMPING;

          // Move
          a.x += a.vx;
          a.y += a.vy;

          // Bounds
          const pad = 40;
          if (a.x < pad) { a.x = pad; a.vx = Math.abs(a.vx) * 0.5; }
          if (a.x > w - pad) { a.x = w - pad; a.vx = -Math.abs(a.vx) * 0.5; }
          if (a.y < pad) { a.y = pad; a.vy = Math.abs(a.vy) * 0.5; }
          if (a.y > h - pad) { a.y = h - pad; a.vy = -Math.abs(a.vy) * 0.5; }
        }

        // Auto-bond: pair nearby atoms with free valence
        const currentBonds = bondsRef.current;
        const bondSet = new Set(currentBonds.map(b => `${Math.min(b.from, b.to)}-${Math.max(b.from, b.to)}`));

        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i], b = next[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Repulsion when too close
            if (dist < REPEL_DIST && dist > 0) {
              const force = (REPEL_DIST - dist) * 0.05;
              const nx = dx / dist, ny = dy / dist;
              a.vx += nx * force; a.vy += ny * force;
              b.vx -= nx * force; b.vy -= ny * force;
            }

            // Auto-bond when in range and both have free valence
            if (dist < BOND_DIST && dist > 0) {
              const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
              if (!bondSet.has(key)) {
                const elA = ELEMENTS[a.sym], elB = ELEMENTS[b.sym];
                if (elA && elB && a.bondsUsed < elA.valence && b.bondsUsed < elB.valence) {
                  bondSet.add(key);
                  newBonds.push({ from: a.id, to: b.id, age: 0 });
                  a.bondsUsed++;
                  b.bondsUsed++;
                  // Gentle attraction snap
                  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                  a.vx += (mx - a.x) * 0.02;
                  a.vy += (my - a.y) * 0.02;
                  b.vx += (mx - b.x) * 0.02;
                  b.vy += (my - b.y) * 0.02;
                }
              }
            }
          }
        }

        // Bonded atom spring forces
        for (const bond of [...currentBonds, ...newBonds]) {
          const a = next.find(x => x.id === bond.from);
          const b = next.find(x => x.id === bond.to);
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const target = 50;
          if (dist > 0) {
            const force = (dist - target) * 0.008;
            const nx = dx / dist, ny = dy / dist;
            if (!a.inRing) { a.vx += nx * force; a.vy += ny * force; }
            if (!b.inRing) { b.vx -= nx * force; b.vy -= ny * force; }
          }
        }

        if (newBonds.length > 0) {
          setBonds(prev => [...prev.map(b => ({ ...b, age: b.age + 1 })), ...newBonds]);
        } else {
          setBonds(prev => prev.map(b => ({ ...b, age: b.age + 1 })));
        }

        return next;
      });

      // Decay flash particles
      setCollisionFlashes(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.3, life: p.life - 0.02 }))
          .filter(p => p.life > 0);
        return next.length === prev.length && prev.every((p, i) => p.life === next[i]?.life) ? prev : next;
      });
    };

    const iv = setInterval(tick, 1000 / 30); // 30fps physics
    return () => clearInterval(iv);
  }, []);

  // ── Cyclotron: charge energy ──

  useEffect(() => {
    if (!cyclotronMode) return;
    const iv = setInterval(() => {
      setCyclotronEnergy(e => Math.min(1, e + 0.008));
    }, 50);
    return () => clearInterval(iv);
  }, [cyclotronMode]);

  // ── Actions ──

  const spawnAtom = useCallback((sym: string, x: number, y: number) => {
    const id = nextId++;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.5;
    setAtoms(prev => [...prev, {
      id, sym, x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bondsUsed: 0,
      inRing: false,
      ringAngle: 0,
      ringSpeed: 0,
    }]);
  }, []);

  const loadIntoRing = useCallback((sym: string) => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    const cx = w * RING_CX_RATIO;
    const cy = h * RING_CY_RATIO;
    const rr = Math.min(w, h) * RING_R_RATIO;
    const ringCount = atomsRef.current.filter(a => a.inRing).length;
    const angle = ringCount * Math.PI * 0.67; // golden-ish spacing
    const id = nextId++;
    setAtoms(prev => [...prev, {
      id, sym,
      x: cx + Math.cos(angle) * rr,
      y: cy + Math.sin(angle) * rr,
      vx: 0, vy: 0,
      bondsUsed: 0,
      inRing: true,
      ringAngle: angle,
      ringSpeed: 0.015 + ringCount * 0.005,
    }]);
    setCyclotronEnergy(0);
  }, []);

  const fireCollider = useCallback(() => {
    // Release all ring atoms toward center with high velocity
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    const cx = w * RING_CX_RATIO;
    const cy = h * RING_CY_RATIO;

    setAtoms(prev => prev.map(a => {
      if (!a.inRing) return a;
      const dx = cx - a.x, dy = cy - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return { ...a, inRing: false };
      const speed = 6 + cyclotronEnergy * 8;
      return {
        ...a,
        inRing: false,
        vx: (dx / dist) * speed + (Math.random() - 0.5) * 2,
        vy: (dy / dist) * speed + (Math.random() - 0.5) * 2,
      };
    }));

    // Spawn collision flash at center
    const flashes: FlashParticle[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      flashes.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0.6 + Math.random() * 0.4,
        color: [CYAN, MAGENTA, GREEN, AMBER][Math.floor(Math.random() * 4)],
      });
    }
    setCollisionFlashes(prev => [...prev, ...flashes]);
    setCyclotronEnergy(0);
  }, [cyclotronEnergy]);

  const handleFieldClick = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (cyclotronMode) {
      loadIntoRing(selectedElement);
    } else {
      spawnAtom(selectedElement, x, y);
    }
  }, [cyclotronMode, selectedElement, spawnAtom, loadIntoRing]);

  const clearField = useCallback(() => {
    setAtoms([]);
    setBonds([]);
    setCyclotronEnergy(0);
  }, []);

  const ringAtomCount = atoms.filter(a => a.inRing).length;

  const paletteElements = ['H', 'C', 'N', 'O', 'Na', 'P', 'Ca', 'Cl', 'S', 'Fe'];

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: 'var(--void)', fontFamily: FONT,
    }}>
      {/* Background canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />

      {/* Play area */}
      <div
        onPointerDown={handleFieldClick}
        style={{ position: 'absolute', inset: 0, zIndex: 2, touchAction: 'none' }}
      >
        {/* Bond lines */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          {bonds.map((b, i) => {
            const a1 = atoms.find(a => a.id === b.from);
            const a2 = atoms.find(a => a.id === b.to);
            if (!a1 || !a2) return null;
            const glow = Math.min(1, b.age / 10);
            return (
              <line key={i} x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y}
                stroke={CYAN} strokeWidth={2.5} strokeLinecap="round"
                opacity={0.5 + glow * 0.4}
                style={{ filter: `drop-shadow(0 0 ${4 + glow * 4}px ${CYAN}88)` }} />
            );
          })}
        </svg>

        {/* Atoms */}
        {atoms.map(atom => {
          const el = ELEMENTS[atom.sym];
          if (!el) return null;
          const freeBonds = el.valence - atom.bondsUsed;
          const saturated = freeBonds === 0;

          return (
            <div key={atom.id} style={{
              position: 'absolute',
              left: atom.x - el.radius,
              top: atom.y - el.radius,
              width: el.radius * 2,
              height: el.radius * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${el.color}cc 0%, ${el.color}44 60%, transparent 100%)`,
              boxShadow: `0 0 ${saturated ? 12 : 20}px ${el.color}${saturated ? '44' : '66'}${atom.inRing ? `, 0 0 30px ${CYAN}44` : ''}`,
              border: `2px solid ${atom.inRing ? CYAN : el.color + '88'}`,
              display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
              color: TEXT, fontFamily: FONT_DATA, touchAction: 'none',
              textShadow: `0 0 8px ${el.color}`,
              pointerEvents: 'none',
              zIndex: 3,
              transition: 'box-shadow 0.2s',
            }}>
              <span style={{ fontSize: el.radius * 0.7, fontWeight: 700 }}>{atom.sym}</span>
              {freeBonds > 0 && (
                <span style={{ fontSize: 8, opacity: 0.5, marginTop: -2 }}>{freeBonds}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ HUD: Top Left — Title + Mode ═══ */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{
          color: CYAN, fontSize: 18, fontWeight: 700,
          letterSpacing: '0.08em', textShadow: `0 0 16px ${CYAN}66`,
        }}>
          PARTICLE COLLIDER
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setCyclotronMode(false)} style={modeBtn(!cyclotronMode, GREEN)}>
            Free Drift
          </button>
          <button type="button" onClick={() => setCyclotronMode(true)} style={modeBtn(cyclotronMode, MAGENTA)}>
            Cyclotron
          </button>
          <button type="button" onClick={clearField} style={modeBtn(false, CORAL)}>
            Purge
          </button>
        </div>
        <div style={{ fontSize: 11, color: DIM, fontFamily: FONT_DATA, maxWidth: 280 }}>
          {cyclotronMode
            ? 'Click to inject atoms into the ring. FIRE to collide them.'
            : 'Click to spawn atoms. They bond automatically when close.'}
        </div>
      </div>

      {/* ═══ HUD: Cyclotron Controls (center-bottom of ring) ═══ */}
      {cyclotronMode && (
        <div style={{
          position: 'absolute', zIndex: 100,
          left: '50%', top: '55%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          {/* Energy bar */}
          <div style={{
            width: 200, height: 6, borderRadius: 3,
            background: 'rgba(0,255,255,0.06)',
            border: `1px solid ${CYAN}22`,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${cyclotronEnergy * 100}%`,
              background: `linear-gradient(90deg, ${VIOLET}, ${CYAN}, ${MAGENTA})`,
              boxShadow: `0 0 8px ${CYAN}66`,
              transition: 'width 0.05s linear',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, color: CYAN, fontFamily: FONT_DATA,
              letterSpacing: 1,
            }}>
              {(cyclotronEnergy * 100).toFixed(0)}% GeV
            </span>
            <span style={{ fontSize: 10, color: DIM, fontFamily: FONT_DATA }}>
              {ringAtomCount} in ring
            </span>
          </div>
          <button
            type="button"
            onClick={fireCollider}
            disabled={ringAtomCount < 2}
            style={{
              ...modeBtn(ringAtomCount >= 2, MAGENTA),
              padding: '10px 28px', fontSize: 14, fontWeight: 700,
              letterSpacing: '0.12em',
              opacity: ringAtomCount < 2 ? 0.3 : 1,
              boxShadow: ringAtomCount >= 2
                ? `0 0 20px ${MAGENTA}44, 0 0 40px ${MAGENTA}11`
                : 'none',
            }}
          >
            FIRE
          </button>
        </div>
      )}

      {/* ═══ HUD: Top Right — Score + Stability ═══ */}
      <div style={{
        position: 'absolute', top: 16, right: 16, zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}>
        <div style={{
          padding: '8px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(12px)',
          border: `1px solid ${VIOLET}22`,
        }}>
          <div style={{ fontSize: 10, color: DIM, fontFamily: FONT_DATA, letterSpacing: 1 }}>SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 300, color: CYAN, fontFamily: FONT_DATA, textShadow: `0 0 16px ${CYAN}44` }}>
            {score.toLocaleString()}
          </div>
        </div>

        {formula && (
          <div style={{
            padding: '6px 14px', borderRadius: 10,
            background: matchedRecipe && stability.complete ? `${GREEN}12` : 'rgba(255,255,255,0.015)',
            border: `1px solid ${matchedRecipe && stability.complete ? `${GREEN}66` : `${VIOLET}22`}`,
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontSize: 18, color: matchedRecipe && stability.complete ? GREEN : TEXT, fontWeight: 600, fontFamily: FONT_DATA }}>
              {matchedRecipe?.display ?? formula}
            </div>
            {matchedRecipe && stability.complete && (
              <div style={{ fontSize: 11, color: GREEN, opacity: 0.8, fontFamily: FONT_DATA }}>{matchedRecipe.name}</div>
            )}
            {matchedRecipe && !stability.complete && (
              <div style={{ fontSize: 11, color: AMBER, opacity: 0.8, fontFamily: FONT_DATA }}>Bonding in progress...</div>
            )}
          </div>
        )}

        {atoms.length > 0 && (
          <div style={{
            padding: '6px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(12px)',
            border: `1px solid ${VIOLET}22`, width: 140,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: DIM, fontFamily: FONT_DATA, marginBottom: 4 }}>
              <span>Stability</span>
              <span style={{ color: stability.complete ? GREEN : AMBER }}>{(stability.pct * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(0,255,255,0.04)', borderRadius: 4 }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.3s',
                width: `${stability.pct * 100}%`,
                background: stability.complete ? GREEN : stability.pct > 0.5 ? AMBER : CORAL,
                boxShadow: `0 0 6px ${stability.complete ? GREEN : AMBER}`,
              }} />
            </div>
            <div style={{ fontSize: 9, color: DIM, fontFamily: FONT_DATA, marginTop: 3 }}>
              {stability.filled}/{stability.total} bonds filled
            </div>
          </div>
        )}
      </div>

      {/* ═══ HUD: Bottom Left — Quest Tracker ═══ */}
      <div style={{
        position: 'absolute', bottom: 100, left: 16, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 220,
      }}>
        <div style={{ fontSize: 11, color: VIOLET, fontWeight: 600, letterSpacing: '0.06em' }}>QUESTS</div>
        {QUESTS.map(q => {
          const progress = questProgress[q.id];
          const done = progress.size === q.steps.length;
          return (
            <div key={q.id} style={{
              padding: '6px 10px', borderRadius: 10,
              background: done ? `${q.color}10` : 'rgba(255,255,255,0.015)',
              border: `1px solid ${done ? `${q.color}44` : 'rgba(0,255,255,0.03)'}`,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: done ? q.color : TEXT, fontWeight: 600 }}>
                  {q.name}
                </span>
                <span style={{ fontSize: 10, color: done ? GREEN : DIM, fontFamily: FONT_DATA }}>
                  {progress.size}/{q.steps.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                {q.steps.map((step, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: progress.has(step) ? q.color : 'rgba(0,255,255,0.04)',
                    boxShadow: progress.has(step) ? `0 0 4px ${q.color}` : 'none',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 9, color: DIM, fontFamily: FONT_DATA, marginTop: 2 }}>
                {q.description} — {q.reward} pts
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ HUD: Bottom Right — Discovery Log ═══ */}
      {discoveries.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 100, right: 16, zIndex: 100,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(12px)',
          border: `1px solid ${VIOLET}22`, maxWidth: 180,
        }}>
          <div style={{ fontSize: 10, color: VIOLET, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>
            DISCOVERIES ({discoveries.length})
          </div>
          {discoveries.slice(-6).map((f, i) => {
            const r = RECIPES.find(rec => rec.formula === f);
            return (
              <div key={i} style={{ fontSize: 11, fontFamily: FONT_DATA, padding: '2px 0', color: TEXT, opacity: 0.8 }}>
                <span style={{ color: GREEN, fontWeight: 600 }}>{r?.display ?? f}</span>
                {r && <span style={{ color: DIM, marginLeft: 6, fontSize: 9 }}>{r.name}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Element Palette (bottom center) ═══ */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, padding: '10px 20px', zIndex: 11,
        background: 'rgba(5,5,16,0.85)', borderRadius: 20,
        border: `1px solid ${VIOLET}33`,
        boxShadow: '0 0 24px rgba(0,255,255,0.04)',
        backdropFilter: 'blur(12px)',
      }}>
        {paletteElements.map(sym => {
          const el = ELEMENTS[sym];
          if (!el) return null;
          const isSelected = selectedElement === sym;
          return (
            <div key={sym}
              onClick={(e) => { e.stopPropagation(); setSelectedElement(sym); }}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${el.color}cc 0%, ${el.color}44 80%)`,
                display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
                cursor: 'pointer', color: TEXT, fontSize: 14, fontWeight: 700,
                fontFamily: FONT_DATA, touchAction: 'none',
                border: `2px solid ${isSelected ? TEXT : el.color + '66'}`,
                boxShadow: isSelected ? `0 0 20px ${el.color}aa, 0 0 4px ${TEXT}88` : `0 0 12px ${el.color}44`,
                textShadow: `0 0 8px ${el.color}`,
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              title={`${el.name} (valence ${el.valence})`}
            >
              <span>{sym}</span>
              <span style={{ fontSize: 7, opacity: 0.6, marginTop: -1 }}>{el.valence}</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, borderLeft: `1px solid ${VIOLET}22` }}>
          <div style={{ textAlign: 'center', fontFamily: FONT_DATA }}>
            <div style={{ fontSize: 14, fontWeight: 300, color: CYAN }}>{atoms.length}</div>
            <div style={{ fontSize: 8, color: DIM }}>atoms</div>
          </div>
        </div>
      </div>

      {/* ═══ Ghost Signal — 172.35 Hz Missing Node egg ═══ */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (missingNodeRevealed) return;
          playMissingNodePulse(6000);
          setMissingNodeRevealed(true);
          setTimeout(() => setMissingNodeRevealed(false), 6000);
        }}
        style={{
          position: 'absolute', top: '31%', left: '73%',
          width: 36, height: 36, borderRadius: '50%',
          background: `radial-gradient(circle, ${CYAN}44 0%, transparent 70%)`,
          border: `1px solid ${CYAN}30`,
          opacity: missingNodeRevealed ? 0 : 1,
          animation: 'ghost-pulse 2.8s ease-in-out infinite',
          cursor: 'pointer', zIndex: 5, pointerEvents: 'auto',
          transition: 'opacity 0.3s',
        }}
      />
      {missingNodeRevealed && (
        <div style={{
          position: 'absolute', top: '18%', left: '50%',
          transform: 'translateX(-50%)',
          color: CYAN, fontFamily: FONT_DATA, fontSize: '1.1rem',
          fontWeight: 600, letterSpacing: '0.08em',
          textShadow: `0 0 12px ${CYAN}88, 0 0 24px ${CYAN}44`,
          zIndex: 200, pointerEvents: 'none',
          animation: 'forgeToast 0.3s ease-out',
          whiteSpace: 'nowrap',
        }}>
          172.35 Hz — ³¹P MISSING NODE DETECTED
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 200, padding: '14px 28px', borderRadius: 14,
          background: 'rgba(5,5,16,0.9)', border: `1px solid ${GREEN}66`,
          color: GREEN, fontSize: 16, fontWeight: 600, fontFamily: FONT,
          textShadow: `0 0 12px ${GREEN}66`, boxShadow: `0 0 30px ${GREEN}22`,
          backdropFilter: 'blur(16px)',
          animation: 'forgeToast 0.3s ease-out',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes forgeToast {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes ghost-pulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.35); opacity: 0.22; }
        }
      `}</style>
    </div>
  );
}

// ── Helper ──

function modeBtn(active: boolean, color: string): React.CSSProperties {
  return {
    background: active ? `${color}18` : 'rgba(5,5,16,0.6)',
    border: `1px solid ${active ? `${color}88` : 'rgba(0,255,255,0.08)'}`,
    color: active ? color : DIM,
    padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: "'Oxanium', sans-serif",
    letterSpacing: '0.04em',
    textShadow: active ? `0 0 8px ${color}44` : 'none',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(8px)',
    minHeight: '48px',
    minWidth: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
