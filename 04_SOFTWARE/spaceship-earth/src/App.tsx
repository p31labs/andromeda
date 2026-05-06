/**
 * @file App.tsx — P31 Master Dashboard (Unified Cockpit)
 * Modular architecture per WCD-04.5: < 100 lines shell
 * Press 'L' to toggle views
 */
import { useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Icosahedron, MeshDistortMaterial } from '@react-three/drei';
import { Globe, Battery, Volume2, VolumeX } from 'lucide-react';
import { create } from 'zustand';
import * as THREE from 'three';

import { useMesh } from './hooks/useMesh';
import { haptic } from './services/haptic';
import { getLarmorEngine } from './lib/engine/larmor';
import { RicciMath, getAnimatedCurvature } from './lib/engine/ricci';
import { FawnGuard } from './lib/engine/fawn';

import { CatchersMitt } from './components/hud/CatchersMitt';
import { ProofOfCare } from './components/hud/ProofOfCare';
import { DeltaMesh } from './components/mesh/DeltaMesh';
import { PosnerMolecule } from './components/mesh/PosnerMolecule';
import { GlobeRoom } from './components/rooms/GlobeRoom';

const useAppStore = create<{ spoons: number; setSpoons: (n: number) => void }>((set) => ({
  spoons: 12,
  setSpoons: (n) => set({ spoons: n }),
}));

export default function App() {
  const { isMeshActive } = useMesh('p31-alpha-node');
  const [viewMode, setViewMode] = useState<'DELTA' | 'POSNER' | 'GLOBE'>(() => {
    const v = new URLSearchParams(window.location.search).get('view')?.toUpperCase();
    return (v === 'POSNER' || v === 'GLOBE') ? v : 'DELTA';
  });
  const [isLarmorActive, setIsLarmorActive] = useState(false);
  const spoons = useAppStore((s) => s.spoons);
  const setSpoons = useAppStore((s) => s.setSpoons);
  const [input, setInput] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [curvature, setCurvature] = useState(1.0);
  const larmorEngine = useMemo(() => getLarmorEngine(), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'l' && document.activeElement?.tagName !== 'TEXTAREA') {
        setViewMode((p) => p === 'DELTA' ? 'POSNER' : p === 'POSNER' ? 'GLOBE' : 'DELTA');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useFrame(({ clock }) => setCurvature(getAnimatedCurvature(1.0, clock.getElapsedTime())));

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

  return (
    <div className="w-full h-screen bg-[#030308] text-[#E8ECF4] font-mono relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} enablePan={false} />
          <primitive object={new THREE.AmbientLight(0.2)} />
          <primitive object={new THREE.PointLight(0x00D4FF, 1.5)} position={[10, 10, 10]} />
          {viewMode === 'DELTA' ? <DeltaMesh networkStress={1 - curvature} /> : viewMode === 'POSNER' ? <PosnerMolecule spoons={spoons} /> : <GlobeRoom />}
        </Canvas>
      </div>

      <CatchersMitt />
      <ProofOfCare userAge={25} />

      <div className="absolute top-6 left-6 z-20 pointer-events-auto">
        <div className="bg-[#050510]/80 backdrop-blur-md border border-[#1f2937] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="text-[#00FF88]" size={18} />
            <h1 className="text-lg font-bold uppercase">{viewMode} [L]</h1>
          </div>
          <div className="text-[10px] text-gray-500">
            <div className="text-[#00FF88]">{resilience}</div>
            <div className="flex items-center gap-3 mt-2">
              <Battery size={14} className={spoons > 4 ? "text-[#00D4FF]" : "text-[#EF4444]"} />
              <div className="flex gap-1">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-4 rounded-sm ${i < spoons ? (spoons > 4 ? 'bg-[#00D4FF]' : 'bg-[#EF4444]') : 'bg-[#1f2937]'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-20 pointer-events-auto">
        <div className="bg-[#050510]/80 backdrop-blur-md border border-[#1f2937] p-4 rounded-lg flex items-center gap-3">
          <span className="text-xs text-gray-400 uppercase">Larmor</span>
          <button onClick={toggleLarmor} className={`p-2 rounded-full ${isLarmorActive ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#1f2937] text-gray-400'}`}>
            {isLarmorActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 w-full flex justify-center z-20 pointer-events-none">
        <div className="bg-[#050510]/90 backdrop-blur-xl border border-[#1f2937] p-4 rounded-lg w-full max-w-lg pointer-events-auto">
          <div className="flex items-center justify-between border-b border-[#1f2937] pb-2 mb-3">
            <h2 className="text-[#00D4FF] font-mono text-xs font-bold uppercase">Whale Channel</h2>
            <div className="text-[10px] text-gray-500 uppercase">Fawn Guard</div>
          </div>
          <textarea value={input} onChange={handleInput} className="w-full bg-[#030308] text-[#E8ECF4] border border-[#1f2937] rounded p-3 font-mono text-[11px] resize-none h-24 mb-3" placeholder="Prepare transmission..." />
          {warning && <div className="bg-[#F59E0B]/10 border border-[#F59E0B] p-3 rounded text-[#F59E0B] font-mono text-[10px] mb-3">{warning}</div>}
          <div className="flex justify-end">
            <button onClick={() => { haptic.transmit(); setInput(''); setSpoons(Math.max(0, spoons - 1)); }} disabled={!!warning || !input.trim()} className={`px-6 py-2 rounded font-mono text-xs font-bold ${warning || !input.trim() ? 'bg-[#1f2937] text-gray-600' : 'bg-[#00D4FF]/20 text-[#00D4FF]'}`}>
              {warning ? 'INTERCEPTED' : 'TRANSMIT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}