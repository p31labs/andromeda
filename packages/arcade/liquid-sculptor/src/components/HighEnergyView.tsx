import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Radio, Wifi, WifiOff, Wind, Heart, Hand, Save } from 'lucide-react';
import { FluidCanvas } from './FluidCanvas';
import { FluidPhysics } from '../engine/FluidPhysics';
import { useLogSculptEvent, useCreateSession } from '../db/hooks';
import { useDatabase } from '../db/PGLiteProvider';

interface HighEnergyViewProps {
  onBack: () => void;
}

export const HighEnergyView: React.FC<HighEnergyViewProps> = ({ onBack }) => {
  const { db } = useDatabase();
  const { logEvent } = useLogSculptEvent();
  const { create } = useCreateSession();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [vortexActive, setVortexActive] = useState(false);
  const [stats, setStats] = useState({ cyan: 5000, phos: 5000, orchid: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const physicsRef = useRef<FluidPhysics | null>(null);
  const sequenceRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });

  // Add log
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Initialize session
  const initSession = useCallback(async () => {
    const seed = Date.now();
    const newSessionId = await create(`Active-Sculpt-${Date.now()}`, seed);
    setSessionId(newSessionId);
    physicsRef.current = new FluidPhysics(seed);
    setIsConnected(true);
    addLog('Session created with seed: ' + seed);

    // Initial pour
    physicsRef.current.pour(-5, 10, 0, 1000, 0);
    physicsRef.current.pour(5, 10, 0, 1000, 1);
  }, [create, addLog]);

  // Trigger love vortex
  const handleLoveVortex = useCallback(async () => {
    if (!sessionId || !physicsRef.current) return;

    physicsRef.current.triggerVortex(0, 0, 2.0);
    setVortexActive(true);

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, 'TRIGGER_VORTEX', Date.now(), {
      x: 0, y: 0, strength: 2.0,
    });

    addLog('Love Vortex activated!');
  }, [sessionId, logEvent, addLog]);

  // Stop vortex
  const handleStopVortex = useCallback(async () => {
    if (!sessionId || !physicsRef.current) return;

    physicsRef.current.stopVortex();
    setVortexActive(false);

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, 'STOP_VORTEX', Date.now(), {});

    addLog('Vortex stopped');
  }, [sessionId, logEvent, addLog]);

  // Handle log event from canvas
  const handleLogEvent = useCallback(async (type: string, payload: Record<string, unknown>) => {
    if (!sessionId) return;

    sequenceRef.current++;
    await logEvent(sessionId, sequenceRef.current, type as 'DRAG_FORCE' | 'POUR', Date.now(), payload);
    addLog(`${type}: ${JSON.stringify(payload).slice(0, 50)}`);
  }, [sessionId, logEvent, addLog]);

  // Update stats periodically
  useEffect(() => {
    if (!physicsRef.current) return;

    const interval = setInterval(() => {
      setStats(physicsRef.current!.getStats());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-orchid" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <Radio className={`w-5 h-5 ${isConnected ? 'text-red-500 animate-pulse' : 'text-white/30'}`} />
          <div>
            <h1 className="text-lg font-bold text-white">High Energy Mode</h1>
            <p className="text-xs text-white/50">6 Spoons • 30-Minute Loop</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-phos" />
          ) : (
            <WifiOff className="w-5 h-5 text-white/30" />
          )}
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 relative">
        {!sessionId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-orchid/20 flex items-center justify-center mx-auto">
                <Hand className="w-10 h-10 text-orchid" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Active Sculpting</h2>
                <p className="text-white/50 mt-2">Multi-touch force fields. Drag to sculpt.</p>
              </div>
              <button
                onClick={initSession}
                className="glass-button px-8 py-4 rounded-xl font-bold text-orchid border-orchid/30
                           flex items-center gap-2 mx-auto hover:shadow-[0_0_30px_rgba(218,112,214,0.3)]"
              >
                <Save className="w-5 h-5" />
                Create Session
              </button>
            </div>
          </div>
        ) : (
          <>
            <FluidCanvas
              sessionId={sessionId}
              seed={Date.now()}
              mode="active"
              onLogEvent={handleLogEvent}
            />

            {/* Side Controls */}
            <div className="absolute top-4 left-4 glass-panel rounded-xl p-4 w-64 space-y-4">
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Actions</p>
                <div className="space-y-2">
                  <button
                    onClick={vortexActive ? handleStopVortex : handleLoveVortex}
                    className={`w-full glass-button py-3 rounded-xl font-bold flex items-center gap-2
                               ${vortexActive ? 'text-orchid border-orchid/50' : 'text-orchid'}`}
                  >
                    <Heart className="w-4 h-4" />
                    {vortexActive ? 'Stop Vortex' : 'Love Vortex'}
                  </button>

                  <button
                    onClick={handleStopVortex}
                    className="w-full glass-button py-2 rounded-xl text-white/50 text-sm font-bold"
                  >
                    <Wind className="w-4 h-4 inline mr-1" />
                    Reset Flow
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Particles</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan">Cyan</span>
                    <span className="text-cyan font-bold">{stats.cyan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-phos">Phos</span>
                    <span className="text-phos font-bold">{stats.phos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orchid">Orchid</span>
                    <span className="text-orchid font-bold">{stats.orchid}</span>
                  </div>
                </div>
              </div>

              {/* Logs */}
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Event Log</p>
                <div className="bg-black/30 rounded-lg p-2 h-24 overflow-y-auto font-mono text-[10px] space-y-1">
                  {logs.map((log, i) => (
                    <p key={i} className="text-white/60 truncate">{log}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-xl px-6 py-3">
              <p className="text-sm text-white/70">
                <Hand className="w-4 h-4 inline mr-2" />
                Drag to create force fields • Mix Cyan + Phos = Orchid
              </p>
            </div>

            {/* Session Info */}
            <div className="absolute top-4 right-4 glass-panel rounded-xl p-4 text-right">
              <p className="text-xs text-white/50">Session ID</p>
              <p className="text-sm font-mono text-orchid truncate w-32">
                {sessionId}
              </p>
              <p className="text-xs text-white/30 mt-2">
                {isConnected ? 'Events logging to PGLite' : 'Offline'}
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="glass-panel px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          High Energy • CPU Float32Arrays • 10,000 Particles
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>Custom Shaders</span>
          <span>•</span>
          <span>Additive Blending</span>
          <span>•</span>
          <span>60 FPS</span>
        </div>
      </footer>
    </div>
  );
};
