import { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { RicciMath } from './lib/engine/ricci';
import { FawnGuard } from './lib/engine/fawn';
import { STAGE_COLORS } from './lib/theme/stageColors';

import { DecisionIcosahedron } from './components/rooms/DecisionIcosahedron';
import { EquilibriumMeter } from './components/hud/EquilibriumMeter';
import { EquilibriumAdmin } from './components/EquilibriumAdmin';
import { useDecisionEngine, type DecisionResult } from './hooks/useDecisionEngine';
import { useEquilibrium } from './hooks/useEquilibrium';


export default function App() {
  const [viewMode, setViewMode] = useState<'DELTA' | 'POSNER' | 'DECIDE'>('DELTA');
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
                      i < spoons ? (spoons > 4 ? 'bg-[var(--color-cyan)]' : 'bg-[#E8636F]') : 'bg-white/10'
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
      <div className="pointer-events-auto absolute right-6 top-6 z-20 flex flex-col gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#080810]/85 p-4 shadow-lg backdrop-blur-md">
          <EquilibriumMeter />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#080810]/85 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setAdminOpen(!adminOpen)}
        className="absolute right-0 top-full mt-2 rounded-lg bg-white/5 px-3 py-1 font-mono text-xs font-bold text-white/50 hover:bg-white/10"
      >
        Admin
      </button>
    </div>

      <EquilibriumAdmin adminOpen={adminOpen} equilibrium={equilibrium} />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--color-cyan)]">
            className="mb-3 h-24 w-full resize-none rounded-lg border border-white/[0.08] bg-[#050505]/90 p-3 font-mono text-[11px] text-[var(--color-cloud)] placeholder:text-white/25"
            placeholder="Prepare transmission..."
          />
          {warning && (
            <div className="mb-3 rounded-lg border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 p-3 font-mono text-[10px] text-[var(--color-amber)]">
                  : 'bg-[var(--color-cyan)]/20 text-[var(--color-cyan)]'
          <div className="mt-2 text-center text-[10px] text-white/25">
            Press <span className="text-white/50">[L]</span> Delta/POSNER ·{' '}
            <span className="text-white/50">[D]</span> Decision Icosahedron
          </div>
