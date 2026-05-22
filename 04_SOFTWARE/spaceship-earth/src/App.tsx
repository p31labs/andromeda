/**
 * @file App.tsx — P31 Master Dashboard (Unified Cockpit)
 *
 * Views: DELTA (tetra), POSNER (molecule), GLOBE (geographic)
 * Press 'L' to cycle views. In DELTA mode click vertices to drill down.
 */

import { useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Volume2, VolumeX } from 'lucide-react';
import * as THREE from 'three';

import { useMesh } from './hooks/useMesh';
import { useTetrahedron } from './hooks/useTetrahedron';
import { getLarmorEngine } from './lib/engine/larmor';
import { getAnimatedCurvature } from './lib/engine/ricci';

import { CatchersMitt }  from './components/hud/CatchersMitt';
import { ProofOfCare }   from './components/hud/ProofOfCare';
import { CalciumHUD }    from './components/hud/CalciumHUD';
import { SpoonGauge }    from './components/hud/SpoonGauge';

import UniversalTetra       from './components/mesh/UniversalTetra';
import { PosnerMolecule }   from './components/mesh/PosnerMolecule';
import { GlobeRoom }        from './components/rooms/GlobeRoom';
import { GeodesicDome }     from './components/mesh/GeodesicDome';
import { NotificationStarfield } from './components/mesh/NotificationStarfield';

import { useSovereignStore } from './sovereign/useSovereignStore';

type ViewMode = 'DELTA' | 'POSNER' | 'GLOBE';

// ── Scene controller: runs useFrame INSIDE Canvas ────────────────────────────
interface SceneControllerProps {
  tetraData: any;
  setTransform: React.Dispatch<React.SetStateAction<any>>;
  setCurvature: React.Dispatch<React.SetStateAction<number>>;
}

function SceneController({ tetraData, setTransform, setCurvature }: SceneControllerProps) {
  useFrame(({ clock }) => {
    setCurvature(getAnimatedCurvature(1.0, clock.getElapsedTime()));
    if (tetraData && tetraData.vertices.some((v: any) => v.val < 0.2)) {
      setTransform((prev: any) => ({
        ...prev,
        jitterbugPhase: 0.5 + Math.sin(clock.elapsedTime * 3) * 0.2,
      }));
    }
  });
  return null;
}

// ── Main app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [viewMode, setViewMode]       = useState<ViewMode>('DELTA');
  const [isLarmorActive, setIsLarmorActive] = useState(false);
  const [curvature, setCurvature]     = useState(1.0);
  const [transform, setTransform]     = useState({ autoRotate: true, rotationSpeed: 0.5, jitterbugPhase: 0 });
  const [calciumVal, setCalciumVal]   = useState<number | null>(null);

  const spoons    = useSovereignStore(s => s.spoons);
  const maxSpoons = useSovereignStore(s => s.maxSpoons);
  const love      = useSovereignStore(s => s.love);
  const tier      = useSovereignStore(s => s.tier);

  const { data: tetraData, setTransform: setTetraTransform } = useTetrahedron('personal', 'will');
  const { isMeshActive } = useMesh('p31-cockpit');

  const isDomeUrgent = tetraData?.vertices.some((v: any) => v.val < 0.2) ||
    (calciumVal !== null && calciumVal < 8.0) || false;

  // Sync setTransform → tetrahedron hook
  useEffect(() => {
    setTetraTransform(transform);
  }, [transform, setTetraTransform]);

  // Poll CalciumHUD value for urgent state propagation
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          'https://bonding-relay.trimtab-signal.workers.dev/api/mesh/calcium-latest?subject_id=will'
        );
        if (res.ok) {
          const d = await res.json();
          setCalciumVal(d.calcium ?? null);
        }
      } catch { /* network offline — ok */ }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  // Cycle views with 'L' key
  const cycleView = useCallback(() => {
    setViewMode(v => v === 'DELTA' ? 'POSNER' : v === 'POSNER' ? 'GLOBE' : 'DELTA');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'l' || e.key === 'L') cycleView(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cycleView]);

  const toggleLarmor = useCallback(() => {
    const engine = getLarmorEngine();
    if (isLarmorActive) { engine.stop(); setIsLarmorActive(false); }
    else                { engine.start(); setIsLarmorActive(true); }
  }, [isLarmorActive]);

  const VIEW_LABELS: Record<ViewMode, string> = {
    DELTA:  'DELTA MESH',
    POSNER: 'POSNER SHIELD',
    GLOBE:  'GLOBE VIEW',
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#030308', overflow: 'hidden' }}>

      {/* ── 3-D Canvas ───────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          camera={{ position: [0, 0, 8], fov: 60 }}
          style={{ background: '#030308' }}
        >
          <SceneController tetraData={tetraData} setTransform={setTransform} setCurvature={setCurvature} />

          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
          <OrbitControls enableDamping dampingFactor={0.05} enableZoom enablePan={false} />

          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color="#00D4FF" />
          <pointLight position={[-5, -3, -5]} intensity={0.6} color="#9B59B6" />

          {/* Always-on starfield + dome */}
          <NotificationStarfield isUrgent={isDomeUrgent} count={2000} />
          <GeodesicDome isUrgent={isDomeUrgent} radius={6.5} detail={3} />

          {/* View-specific scene */}
          {viewMode === 'DELTA' && tetraData && (
            <UniversalTetra data={tetraData} mode="view" interactive showLabels showEdges />
          )}
          {viewMode === 'POSNER' && (
            <PosnerMolecule spoons={spoons} calcium={calciumVal ?? undefined} />
          )}
          {viewMode === 'GLOBE' && (
            <GlobeRoom />
          )}
        </Canvas>
      </div>

      {/* ── Top-left HUD ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {/* View mode badge */}
        <div style={{
          fontSize: 10, letterSpacing: '0.12em', color: isDomeUrgent ? '#EF4444' : '#00D4FF',
          fontFamily: 'monospace', opacity: 0.8,
        }}>
          ◈ {VIEW_LABELS[viewMode]}
          {isMeshActive && <span style={{ marginLeft: 8, color: '#00FF88', fontSize: 9 }}>● MESH</span>}
        </div>

        {/* Calcium HUD */}
        <div style={{ pointerEvents: 'auto' }}>
          <CalciumHUD />
        </div>

        {/* Spoon gauge */}
        <div style={{ pointerEvents: 'auto' }}>
          <SpoonGauge spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
        </div>

        {/* View cycle button */}
        <button
          onClick={cycleView}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 6,
            color: '#00D4FF',
            fontSize: 9,
            letterSpacing: '0.1em',
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          [L] CYCLE VIEW
        </button>
      </div>

      {/* ── Bottom-right: Larmor toggle ───────────────────────────────────── */}
      <button
        onClick={toggleLarmor}
        aria-label={isLarmorActive ? 'Mute Larmor resonance' : 'Activate Larmor resonance'}
        style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44,
          background: isLarmorActive ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isLarmorActive ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '50%',
          color: isLarmorActive ? '#00D4FF' : '#6B7280',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {isLarmorActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {/* ── Floating overlays (pointer-events: none container) ───────────── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <ProofOfCare />
        <CatchersMitt />
      </div>

    </div>
  );
}
