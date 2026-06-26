/**
 * @file App.tsx — P31 Spaceship Earth cockpit shell
 */
<<<<<<< HEAD
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
=======
import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
import { Globe, Battery, Volume2, VolumeX } from 'lucide-react';
import { create } from 'zustand';
import { haptic } from './services/haptic';
import { getLarmorEngine } from './lib/engine/larmor';
<<<<<<< HEAD
import { RicciMath, getAnimatedCurvature } from './lib/engine/ricci';
import { FawnGuard } from './lib/engine/fawn';
=======
import { RicciMath } from './lib/engine/ricci';
import { FawnGuard } from './lib/engine/fawn';
import { STAGE_COLORS } from './lib/theme/stageColors';
>>>>>>> auto-heal/ui-ux-drift-20260620-120057

import { CatchersMitt } from './components/hud/CatchersMitt';
import { ProofOfCare } from './components/hud/ProofOfCare';
import { DeltaMesh } from './components/mesh/DeltaMesh';
import { PosnerMolecule } from './components/mesh/PosnerMolecule';
<<<<<<< HEAD
import { MolecularField } from './components/MolecularField';
=======

import { DecisionIcosahedron } from './components/rooms/DecisionIcosahedron';
import { EquilibriumMeter } from './components/hud/EquilibriumMeter';
import { EquilibriumAdmin } from './components/EquilibriumAdmin';
import { useDecisionEngine, type DecisionResult } from './hooks/useDecisionEngine';
import { useEquilibrium } from './hooks/useEquilibrium';
>>>>>>> auto-heal/ui-ux-drift-20260620-120057

const useAppStore = create<{ spoons: number; setSpoons: (n: number) => void }>((set) => ({
  spoons: 12,
  setSpoons: (n) => set({ spoons: n }),
}));

<<<<<<< HEAD
function CurvatureDriver({ onTick }: { onTick: (t: number) => void }) {
  useFrame(({ clock }) => onTick(clock.getElapsedTime()));
  return null;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'DELTA' | 'POSNER'>('DELTA');
=======


export default function App() {
  const [viewMode, setViewMode] = useState<'DELTA' | 'POSNER' | 'DECIDE'>('DELTA');
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const [isLarmorActive, setIsLarmorActive] = useState(false);
  const spoons = useAppStore((s) => s.spoons);
  const setSpoons = useAppStore((s) => s.setSpoons);
  const [input, setInput] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
<<<<<<< HEAD
  const [curvature, setCurvature] = useState(1.0);
  const larmorEngine = useMemo(() => getLarmorEngine(), []);

  const onCurvatureTick = useCallback((t: number) => {
    setCurvature(getAnimatedCurvature(1.0, t));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'l' && document.activeElement?.tagName !== 'TEXTAREA') {
        setViewMode((p) => (p === 'DELTA' ? 'POSNER' : 'DELTA'));
      }
=======
  const [adminOpen, setAdminOpen] = useState(false);
  const larmorEngine = useMemo(() => getLarmorEngine(), []);
  const { result } = useDecisionEngine(30000);
  const { equilibrium } = useEquilibrium(30000);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'l' && document.activeElement?.tagName !== 'TEXTAREA') {
        setViewMode((p) => (p === 'DELTA' ? 'POSNER' : 'DELTA'));
      }
      if (key === 'd' && document.activeElement?.tagName !== 'TEXTAREA') {
        setViewMode((p) => (p === 'DECIDE' ? 'POSNER' : 'DECIDE'));
      }
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const toggleLarmor = async () => {
    if (isLarmorActive) {
      await larmorEngine.stop();
    } else {
      await larmorEngine.start();
    }
    setIsLarmorActive(!isLarmorActive);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    const { triggered } = FawnGuard.analyze(text);
    setWarning(triggered ? FawnGuard.getWarning(text) : null);
  };

  const resilience = useMemo(() => RicciMath.getResilience(4), []);

<<<<<<< HEAD
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] text-[#d8d6d0] font-mono">
      <MolecularField />
      <div className="absolute inset-0 z-[1]">
        <Canvas
=======
  const stageColor = useMemo(() => {
    const stage = (result?.stage ?? 'VOID') as keyof typeof STAGE_COLORS;
    return STAGE_COLORS[stage] ?? STAGE_COLORS.VOID;
  }, [result?.stage]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505] text-[var(--color-cloud)] font-mono">
      <div className="absolute inset-0 z-[1]">
        <Canvas
          className="absolute inset-0"
          style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl, scene }) => {
            scene.background = null;
            gl.setClearColor(0x000000, 0);
          }}
        >
<<<<<<< HEAD
          <CurvatureDriver onTick={onCurvatureTick} />
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} enablePan={false} />
          <ambientLight intensity={0.35} />
          <pointLight position={[10, 10, 10]} intensity={1.2} color={0x22d3ee} />
          {viewMode === 'DELTA' ? (
            <DeltaMesh networkStress={1 - curvature} />
          ) : (
            <PosnerMolecule spoons={spoons} />
=======

          <PerspectiveCamera makeDefault position={[0, 0, 12]} />
          <OrbitControls enableZoom={false} enablePan={false} />
          <Stars radius={100} depth={50} count={2500} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.35} />
          <pointLight position={[10, 10, 10]} intensity={1.2} color={0x22d3ee} />
          {viewMode === 'DELTA' ? (
            <DeltaMesh scale={6} equilibrium={equilibrium} />
          ) : viewMode === 'POSNER' ? (
            <PosnerMolecule spoons={spoons} calcium={8.2} />
          ) : (
            <DecisionIcosahedron
              stage={result?.stage ?? 'VOID'}
              confidence={result?.confidence ?? 0}
              topLabel={result?.recommendation?.name ?? 'evaluating...'}
              topScore={result?.recommendation?.score}
              onClick={() => haptic.transmit()}
            />
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          )}
        </Canvas>
      </div>

      <CatchersMitt />
      <ProofOfCare userAge={25} />

<<<<<<< HEAD
      <div className="absolute top-6 left-6 z-20 pointer-events-auto">
        <div className="rounded-xl border border-white/[0.08] bg-[#080810]/85 p-4 shadow-lg backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2">
            <Globe className="text-[#00FF88]" size={18} />
            <h1 className="text-lg font-bold uppercase tracking-tight text-white">{viewMode} [L]</h1>
          </div>
          <div className="text-[10px] text-white/40">
            <div className="text-[#00FF88]">{resilience}</div>
            <div className="mt-2 flex items-center gap-3">
              <Battery size={14} className={spoons > 4 ? 'text-[#22d3ee]' : 'text-[#E8636F]'} />
=======
      {/* Mode indicator + status */}
      <div className="absolute top-6 left-6 z-20 pointer-events-auto">
        <div className="rounded-xl border border-white/[0.08] bg-[#080810]/85 p-4 shadow-lg backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2">
            <Globe className="text-[var(--color-phosphor)]" size={18} />
            <h1 className="text-lg font-bold uppercase tracking-tight text-white">{viewMode} [L/D]</h1>
          </div>
          <div className="text-[10px] text-white/40">
            <div className="text-[var(--color-phosphor)]">{resilience}</div>
            <div className="mt-2 flex items-center gap-3">
              <Battery size={14} className={spoons > 4 ? 'text-[var(--color-cyan)]' : 'text-[#E8636F]'} />
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              <div className="flex gap-1">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 w-1.5 rounded-sm ${
<<<<<<< HEAD
                      i < spoons ? (spoons > 4 ? 'bg-[#22d3ee]' : 'bg-[#E8636F]') : 'bg-white/10'
=======
                      i < spoons ? (spoons > 4 ? 'bg-[var(--color-cyan)]' : 'bg-[#E8636F]') : 'bg-white/10'
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
                    }`}
                  />
                ))}
              </div>
            </div>
<<<<<<< HEAD
=======
            {result && (
              <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#050505]/80 p-3">
                <div className="text-[10px] uppercase text-white/35">Decision Stage</div>
                <div className="text-xs font-bold" style={{ color: stageColor }}>
                  {result.stage}
                </div>
                <div className="mt-2 text-[10px] uppercase text-white/35">Top Action</div>
                <div className="text-[11px] text-white/85">{result.recommendation.name}</div>
                <div className="text-[10px] text-white/35">confidence {(result.confidence * 100).toFixed(0)}%</div>
              </div>
            )}
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div className="pointer-events-auto absolute right-6 top-6 z-20">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#080810]/85 p-4 shadow-lg backdrop-blur-md">
=======
      <div className="pointer-events-auto absolute right-6 top-6 z-20 flex flex-col gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#080810]/85 p-4 shadow-lg backdrop-blur-md">
          <EquilibriumMeter />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#080810]/85 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          <span className="text-xs uppercase text-white/45">Larmor</span>
          <button
            type="button"
            onClick={toggleLarmor}
            className={`rounded-full p-2 ${isLarmorActive ? 'bg-[#E8636F]/20 text-[#E8636F]' : 'bg-white/5 text-white/40'}`}
          >
            {isLarmorActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>
<<<<<<< HEAD
=======
      <button
        type="button"
        onClick={() => setAdminOpen(!adminOpen)}
        className="absolute right-0 top-full mt-2 rounded-lg bg-white/5 px-3 py-1 font-mono text-xs font-bold text-white/50 hover:bg-white/10"
      >
        Admin
      </button>
    </div>

      <EquilibriumAdmin adminOpen={adminOpen} equilibrium={equilibrium} />
>>>>>>> auto-heal/ui-ux-drift-20260620-120057

      <div className="pointer-events-none absolute bottom-6 z-20 flex w-full justify-center">
        <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-white/[0.08] bg-[#080810]/90 p-4 shadow-xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2">
<<<<<<< HEAD
            <h2 className="font-mono text-xs font-bold uppercase tracking-wide text-[#22d3ee]">
=======
            <h2 className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-cyan)]">
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              Whale Channel
            </h2>
            <div className="text-[10px] uppercase text-white/35">Fawn Guard</div>
          </div>
          <textarea
            value={input}
            onChange={handleInput}
<<<<<<< HEAD
            className="mb-3 h-24 w-full resize-none rounded-lg border border-white/[0.08] bg-[#050505]/90 p-3 font-mono text-[11px] text-[#d8d6d0] placeholder:text-white/25"
            placeholder="Prepare transmission..."
          />
          {warning && (
            <div className="mb-3 rounded-lg border border-[#fbbf24]/40 bg-[#fbbf24]/10 p-3 font-mono text-[10px] text-[#fbbf24]">
=======
            className="mb-3 h-24 w-full resize-none rounded-lg border border-white/[0.08] bg-[#050505]/90 p-3 font-mono text-[11px] text-[var(--color-cloud)] placeholder:text-white/25"
            placeholder="Prepare transmission..."
          />
          {warning && (
            <div className="mb-3 rounded-lg border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 p-3 font-mono text-[10px] text-[var(--color-amber)]">
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              {warning}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                haptic.transmit();
                setInput('');
                setSpoons(Math.max(0, spoons - 1));
              }}
              disabled={!!warning || !input.trim()}
              className={`rounded-lg px-6 py-2 font-mono text-xs font-bold ${
                warning || !input.trim()
                  ? 'cursor-not-allowed bg-white/5 text-white/25'
<<<<<<< HEAD
                  : 'bg-[#22d3ee]/20 text-[#22d3ee]'
=======
                  : 'bg-[var(--color-cyan)]/20 text-[var(--color-cyan)]'
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              }`}
            >
              {warning ? 'INTERCEPTED' : 'TRANSMIT'}
            </button>
          </div>
<<<<<<< HEAD
=======
          <div className="mt-2 text-center text-[10px] text-white/25">
            Press <span className="text-white/50">[L]</span> Delta/POSNER ·{' '}
            <span className="text-white/50">[D]</span> Decision Icosahedron
          </div>
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        </div>
      </div>
    </div>
  );
}
