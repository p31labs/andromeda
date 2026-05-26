import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Zap, Activity, RotateCcw, Target } from 'lucide-react';
import { ResonanceGrid } from './ResonanceGrid';
import { createSpringPhysics, type SpringPhysics, type NodeType } from '../engine/SpringPhysics';
import { useLogPulse, useCreateSession, useSaveSnapshot } from '../db/hooks';
import { useDatabase } from '../db/PGLiteProvider';

interface MediumEnergyViewProps {
  onBack: () => void;
}

export const MediumEnergyView: React.FC<MediumEnergyViewProps> = ({ onBack }) => {
  const { db } = useDatabase();
  const { logPulse } = useLogPulse();
  const { create } = useCreateSession();
  const { save } = useSaveSnapshot();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [physics, setPhysics] = useState<SpringPhysics | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [harmony, setHarmony] = useState({ total: 0, average: 0, peak: 0, constructive: 0 });
  const [pulses, setPulses] = useState(0);
  const [xp, setXp] = useState(0);
  const sequenceRef = useRef(0);

  // Initialize session
  const initSession = useCallback(async () => {
    const seed = Date.now();
    const newSessionId = await create(`Solo-Emitter-${Date.now()}`, seed);
    setSessionId(newSessionId);
    setPhysics(createSpringPhysics(seed));
    setHarmony({ total: 0, average: 0, peak: 0, constructive: 0 });
    setPulses(0);
    setXp(0);
    sequenceRef.current = 0;
  }, [create]);

  // Handle node click
  const handleNodeClick = useCallback(async (nodeId: number, nodeType: NodeType) => {
    if (!sessionId || !physics || isPaused) return;

    // Apply pulse force
    const force = -8; // Downward pulse
    physics.pulse(nodeId, force);

    // Log to database
    sequenceRef.current++;
    await logPulse(sessionId, sequenceRef.current, nodeId, force, 'solo-player', physics.getTimeMs());

    setPulses(p => p + 1);
  }, [sessionId, physics, isPaused, logPulse]);

  // Update harmony stats
  useEffect(() => {
    if (!physics) return;

    const interval = setInterval(() => {
      const resonance = physics.getHarmonicResonance();
      setHarmony({
        total: resonance.total,
        average: resonance.average,
        peak: resonance.peak,
        constructive: resonance.constructiveCount,
      });

      // XP calculation based on constructive interference
      const newXp = Math.floor(resonance.constructiveCount * 0.5);
      setXp(prev => Math.max(prev, newXp));

      // Save snapshot periodically
      if (sessionId && resonance.constructiveCount > 5) {
        save(sessionId, physics.getTimeMs(), resonance.average, resonance.constructiveCount, pulses);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [physics, sessionId, pulses, save]);

  // Reset
  const handleReset = () => {
    setSessionId(null);
    setPhysics(null);
    setHarmony({ total: 0, average: 0, peak: 0, constructive: 0 });
    setPulses(0);
    setXp(0);
  };

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-phos" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Medium Energy Mode</h1>
          <p className="text-xs text-white/50">3 Spoons • 15-Minute Loop</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-phos" />
            ) : (
              <Pause className="w-5 h-5 text-white/50" />
            )}
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 relative">
        {!sessionId || !physics ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-phos/20 flex items-center justify-center mx-auto">
                <Target className="w-10 h-10 text-phos" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Solo Emitter</h2>
                <p className="text-white/50 mt-2">Tap nodes to create waves</p>
              </div>
              <button
                onClick={initSession}
                className="bg-white/5 backdrop-blur-md border border-phos/30 hover:bg-white/10 px-8 py-4 rounded-xl font-bold text-phos flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                Start Session
              </button>
            </div>
          </div>
        ) : (
          <>
            <ResonanceGrid physics={physics} onNodeClick={handleNodeClick} />

            {/* Stats Panel */}
            <div className="absolute top-6 right-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-3 w-48">
              <div>
                <p className="text-xs text-white/50">Harmonic Resonance</p>
                <p className="text-2xl font-bold text-orchid">{harmony.average.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-white/50">Peak</p>
                  <p className="font-bold text-cyan">{harmony.peak.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Nodes</p>
                  <p className="font-bold text-phos">{harmony.constructive}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/50">Session XP</p>
                <p className="text-xl font-bold text-gold">{xp}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-6 py-3">
              <p className="text-sm text-white/70">
                <Zap className="w-4 h-4 inline mr-2" />
                Tap emitter nodes (Cyan/Phos) to trigger waves
              </p>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="absolute top-6 left-6 bg-white/5 backdrop-blur-md border border-white/20 hover:bg-white/10 p-3 rounded-xl text-white/50"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Pause overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 text-center">
                  <Pause className="w-12 h-12 text-phos mx-auto mb-4" />
                  <p className="text-xl font-bold text-white">Paused</p>
                  <p className="text-white/50 text-sm mt-2">Click play to resume</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-white/5 backdrop-blur-md px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          Medium Energy • Verlet Physics • 37 Nodes
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>InstancedMesh</span>
          <span>•</span>
          <span>LineSegments</span>
          <span>•</span>
          <span>60 FPS</span>
        </div>
      </footer>
    </div>
  );
};
