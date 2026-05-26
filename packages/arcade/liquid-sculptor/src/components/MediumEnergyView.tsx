import React, { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Play, Pause, Droplet, Wind, RotateCcw } from 'lucide-react';
import { FluidCanvas } from './FluidCanvas';
import { FluidPhysics } from '../engine/FluidPhysics';
import { useLogSculptEvent, useCreateSession } from '../db/hooks';
import { useDatabase } from '../db/PGLiteProvider';

interface MediumEnergyViewProps {
  onBack: () => void;
}

export const MediumEnergyView: React.FC<MediumEnergyViewProps> = ({ onBack }) => {
  const { db } = useDatabase();
  const { logEvent } = useLogSculptEvent();
  const { create } = useCreateSession();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({ cyan: 5000, phos: 5000, orchid: 0 });
  const physicsRef = useRef<FluidPhysics | null>(null);
  const sequenceRef = useRef(0);

  // Initialize session
  const initSession = useCallback(async () => {
    const seed = Date.now();
    const newSessionId = await create(`Sculpture-${Date.now()}`, seed);
    setSessionId(newSessionId);
    physicsRef.current = new FluidPhysics(seed);

    // Initial pour
    handlePourCyan();
    setTimeout(() => handlePourPhos(), 1000);
  }, [create]);

  // Pour cyan particles
  const handlePourCyan = async () => {
    if (!sessionId || !physicsRef.current) return;

    physicsRef.current.pour(-5, 10, 0, 500, 0);

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, 'POUR', Date.now(), {
      x: -5, y: 10, z: 0, count: 500, type: 0,
    });

    updateStats();
  };

  // Pour phos particles
  const handlePourPhos = async () => {
    if (!sessionId || !physicsRef.current) return;

    physicsRef.current.pour(5, 10, 0, 500, 1);

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, 'POUR', Date.now(), {
      x: 5, y: 10, z: 0, count: 500, type: 1,
    });

    updateStats();
  };

  // Trigger vortex
  const handleVortex = async () => {
    if (!sessionId || !physicsRef.current) return;

    physicsRef.current.triggerVortex(0, 0, 1.5);

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, 'TRIGGER_VORTEX', Date.now(), {
      x: 0, y: 0, strength: 1.5,
    });
  };

  // Stop vortex
  const handleStopVortex = async () => {
    if (!sessionId || !physicsRef.current) return;

    physicsRef.current.stopVortex();

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, 'STOP_VORTEX', Date.now(), {});
  };

  // Update stats
  const updateStats = () => {
    if (!physicsRef.current) return;
    setStats(physicsRef.current.getStats());
  };

  // Reset
  const handleReset = () => {
    setSessionId(null);
    physicsRef.current = null;
    sequenceRef.current = 0;
    setStats({ cyan: 5000, phos: 5000, orchid: 0 });
  };

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
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
        {!sessionId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-phos/20 flex items-center justify-center mx-auto">
                <Droplet className="w-10 h-10 text-phos" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Guided Pouring</h2>
                <p className="text-white/50 mt-2">Pour Cyan and Phos, watch gravity take over</p>
              </div>
              <button
                onClick={initSession}
                className="glass-button px-8 py-4 rounded-xl font-bold text-phos border-phos/30
                           flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                Start Session
              </button>
            </div>
          </div>
        ) : (
          <>
            <FluidCanvas
              sessionId={sessionId}
              seed={Date.now()}
              mode="guided"
            />

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePourCyan}
                  className="glass-button px-4 py-3 rounded-xl font-bold text-cyan border-cyan/30
                             flex items-center gap-2"
                >
                  <Droplet className="w-4 h-4" />
                  Pour Cyan
                </button>

                <button
                  onClick={handlePourPhos}
                  className="glass-button px-4 py-3 rounded-xl font-bold text-phos border-phos/30
                             flex items-center gap-2"
                >
                  <Droplet className="w-4 h-4" />
                  Pour Phos
                </button>

                <div className="w-px h-8 bg-white/20 mx-2" />

                <button
                  onClick={handleVortex}
                  className="glass-button px-4 py-3 rounded-xl font-bold text-orchid border-orchid/30
                             flex items-center gap-2"
                >
                  <Wind className="w-4 h-4" />
                  Vortex
                </button>

                <button
                  onClick={handleStopVortex}
                  className="glass-button p-3 rounded-xl text-white/50"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="absolute top-6 right-6 glass-panel rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-cyan">Cyan</span>
                <span className="font-bold text-cyan">{stats.cyan}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-phos">Phos</span>
                <span className="font-bold text-phos">{stats.phos}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-xs text-orchid">Orchid</span>
                <span className="font-bold text-orchid">{stats.orchid}</span>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="absolute top-6 left-6 glass-button p-3 rounded-xl text-white/50"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}
      </main>

      <footer className="glass-panel px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          Medium Energy • CPU Float32Arrays • Custom Shaders
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>10,000 Particles</span>
          <span>•</span>
          <span>Guided Mode</span>
          <span>•</span>
          <span>Paused Timing</span>
        </div>
      </footer>
    </div>
  );
};
