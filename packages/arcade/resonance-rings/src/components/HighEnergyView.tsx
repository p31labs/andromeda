import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Radio, Wifi, WifiOff, Zap, Activity, Users, Lock } from 'lucide-react';
import { ResonanceGrid } from './ResonanceGrid';
import { createSpringPhysics, type SpringPhysics, type NodeType } from '../engine/SpringPhysics';
import { useLogPulse, useCreateSession, useSaveSnapshot } from '../db/hooks';
import { useDatabase } from '../db/PGLiteProvider';

interface HighEnergyViewProps {
  onBack: () => void;
}

export const HighEnergyView: React.FC<HighEnergyViewProps> = ({ onBack }) => {
  const { db } = useDatabase();
  const { logPulse } = useLogPulse();
  const { create } = useCreateSession();
  const { save } = useSaveSnapshot();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [physics, setPhysics] = useState<SpringPhysics | null>(null);
  const [coopMode, setCoopMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [harmony, setHarmony] = useState({ average: 0, peak: 0, constructive: 0 });
  const [resin, setResin] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const sequenceRef = useRef(0);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Initialize session
  const initSession = useCallback(async () => {
    const seed = Date.now();
    const newSessionId = await create(`Co-op-PhaseLock-${Date.now()}`, seed);
    setSessionId(newSessionId);
    setPhysics(createSpringPhysics(seed));
    setIsConnected(true);
    setResin(0);
    sequenceRef.current = 0;
    addLog('Co-op session initialized with seed: ' + seed);
  }, [create, addLog]);

  // Toggle co-op mode
  const toggleCoop = useCallback(async () => {
    if (!physics) return;

    const newMode = !coopMode;
    setCoopMode(newMode);
    physics.setCoopMode(newMode);

    addLog(newMode ? 'Phase-Lock activated! Emitters synchronized.' : 'Phase-Lock released.');
  }, [physics, coopMode, addLog]);

  // Handle node click
  const handleNodeClick = useCallback(async (nodeId: number, nodeType: NodeType) => {
    if (!sessionId || !physics) return;

    // Only allow clicking emitters in co-op mode
    if (coopMode && nodeType !== 'SJ' && nodeType !== 'WJ') {
      addLog('In co-op mode, only emitters can be driven manually');
      return;
    }

    const force = -10;
    physics.pulse(nodeId, force);

    sequenceRef.current++;
    await logPulse(sessionId, sequenceRef.current, nodeId, force, 'coop-player', physics.getTimeMs());

    addLog(`Pulse on ${nodeType} emitter (node ${nodeId})`);
  }, [sessionId, physics, coopMode, logPulse, addLog]);

  // Update stats
  useEffect(() => {
    if (!physics) return;

    const interval = setInterval(() => {
      const resonance = physics.getHarmonicResonance();
      setHarmony({
        average: resonance.average,
        peak: resonance.peak,
        constructive: resonance.constructiveCount,
      });

      // Resin yield from constructive interference
      if (coopMode && resonance.constructiveCount > 5) {
        const yield_ = resonance.constructiveCount * 0.1;
        setResin(r => r + yield_);
      }

      // Save high-resonance snapshots
      if (sessionId && resonance.average > 2.0) {
        save(sessionId, physics.getTimeMs(), resonance.average, resonance.constructiveCount, sequenceRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [physics, coopMode, sessionId, save]);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
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
        {!sessionId || !physics ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-orchid/20 flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-orchid" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Co-op Phase-Lock</h2>
                <p className="text-white/50 mt-2">Synchronize emitters for maximum resonance</p>
              </div>
              <button
                onClick={initSession}
                className="bg-white/5 backdrop-blur-md border border-orchid/30 hover:bg-white/10 px-8 py-4 rounded-xl font-bold text-orchid flex items-center gap-2 mx-auto hover:shadow-[0_0_30px_rgba(218,112,214,0.3)]"
              >
                <Lock className="w-5 h-5" />
                Create Co-op Session
              </button>
            </div>
          </div>
        ) : (
          <>
            <ResonanceGrid physics={physics} coopMode={coopMode} onNodeClick={handleNodeClick} />

            {/* Side Panel */}
            <div className="absolute top-4 left-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 w-64 space-y-4">
              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Actions</p>
                <button
                  onClick={toggleCoop}
                  className={`w-full py-3 rounded-xl font-bold flex items-center gap-2
                    ${coopMode ? 'bg-orchid/20 text-orchid border border-orchid/50' : 'bg-white/5 text-orchid border border-orchid/30'}`}
                >
                  <Lock className="w-4 h-4" />
                  {coopMode ? 'Phase-Lock Active' : 'Activate Phase-Lock'}
                </button>
              </div>

              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Resonance</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Average</span>
                    <span className="font-bold text-orchid">{harmony.average.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Peak</span>
                    <span className="font-bold text-cyan">{harmony.peak.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Harmonic</span>
                    <span className="font-bold text-phos">{harmony.constructive}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Resin Yield</p>
                <p className="text-2xl font-bold text-gold">{resin.toFixed(1)} 🧪</p>
              </div>

              <div>
                <p className="text-xs text-white/50 font-bold mb-2">Event Log</p>
                <div className="bg-black/30 rounded-lg p-2 h-24 overflow-y-auto font-mono text-[10px] space-y-1">
                  {logs.map((log, i) => (
                    <p key={i} className="text-white/60 truncate">{log}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Co-op Status */}
            <div className="absolute top-4 right-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-right">
              <p className="text-xs text-white/50">Session ID</p>
              <p className="text-sm font-mono text-orchid truncate w-32">{sessionId}</p>
              <div className="mt-2 flex items-center gap-2 justify-end">
                <span className={`w-2 h-2 rounded-full ${coopMode ? 'bg-orchid animate-pulse' : 'bg-white/30'}`} />
                <span className={`text-xs ${coopMode ? 'text-orchid' : 'text-white/50'}`}>
                  {coopMode ? 'Phase-Locked' : 'Free Play'}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-6 py-3">
              <p className="text-sm text-white/70">
                <Zap className="w-4 h-4 inline mr-2" />
                {coopMode
                  ? 'Emitters auto-driven. Tap center nodes to boost interference.'
                  : 'Tap emitter nodes to create standing waves'}
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="bg-white/5 backdrop-blur-md px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          High Energy • Co-op Phase-Lock • Verlet Integration
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>37 Nodes</span>
          <span>•</span>
          <span>InstancedMesh</span>
          <span>•</span>
          <span>60 FPS</span>
        </div>
      </footer>
    </div>
  );
};
