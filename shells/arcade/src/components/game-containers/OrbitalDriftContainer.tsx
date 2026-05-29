/**
 * Orbital Drift Container - Phase 2 Space Simulation
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { OrbitalDriftGame } from '../../games/orbital-drift/OrbitalDriftGame';
import type { PlayerId } from '../../types/arcade';

interface OrbitalDriftContainerProps {
  playerId: PlayerId;
  isCoop: boolean;
  siblingPlayer?: PlayerId;
  onScore: (points: number) => void;
  onCareFlow: (amount: number) => void;
  onExit: () => void;
}

export function OrbitalDriftContainer({ playerId, isCoop, onScore, onCareFlow, onExit }: OrbitalDriftContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<OrbitalDriftGame | null>(null);
  const [coOpEnabled, setCoOpEnabled] = useState(isCoop);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new OrbitalDriftGame({
      container: containerRef.current,
      playerId,
      isCoop: coOpEnabled,
      onScore,
      onCareFlow,
    });
    gameRef.current = game;
    game.start();
    return () => game.dispose();
  }, [playerId, coOpEnabled, onScore, onCareFlow]);

  const triggerCareFlow = useCallback(() => {
    gameRef.current?.createCareBurst();
  }, []);

  const toggleCoOp = useCallback(() => {
    const newState = !coOpEnabled;
    setCoOpEnabled(newState);
    gameRef.current?.setCoOpMode(newState);
  }, [coOpEnabled]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030308]">
      <div ref={containerRef} className="absolute inset-0 z-10" />
      <div className={`absolute inset-0 z-20 pointer-events-none border-4 transition-all duration-1000 ${coOpEnabled ? 'border-[#da70d6]/60 shadow-[inset_0_0_60px_rgba(218,112,214,0.4)]' : 'border-transparent'}`} />
      <div className="absolute top-4 left-4 z-30 bg-[#0a0f1e]/60 backdrop-blur-xl rounded-xl p-4 w-80 border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-[#feca57] flex items-center gap-2">💰 $480/mo Fund</span>
          <span className="text-xs bg-white/10 px-2 py-1 rounded text-[#39ff14]">45cr</span>
        </div>
        <div className="space-y-2 text-xs">
          <div><div className="flex justify-between mb-1"><span>CHUMP: $450</span><span>94%</span></div><div className="h-2 w-full bg-white/10 rounded-full"><div className="h-full bg-[#feca57] w-[94%]"></div></div></div>
          <div><div className="flex justify-between mb-1"><span className="text-[#00f5ff]">Arcade: $30</span><span className="text-[#00f5ff]">6%</span></div><div className="h-2 w-full bg-white/10 rounded-full"><div className="h-full bg-[#00f5ff] w-[30%]"></div></div></div>
        </div>
      </div>
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <div className="bg-[#0a0f1e]/60 backdrop-blur-xl border border-[#00f5ff]/30 rounded-lg px-3 py-1.5 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00f5ff]" /><span className="text-xs text-white/80">S.J. (Flow)</span></div>
        <div className="bg-[#0a0f1e]/60 backdrop-blur-xl border border-[#39ff14]/30 rounded-lg px-3 py-1.5 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#39ff14]" /><span className="text-xs text-white/80">W.J. (Growth)</span></div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4">
        <div className="flex gap-4">
          <button onClick={triggerCareFlow} className="px-6 py-3 rounded-full bg-[#da70d6]/20 border border-[#da70d6]/50 text-[#da70d6] hover:bg-[#da70d6]/30 transition-all">Trigger Care Flow ❤️</button>
          <button onClick={toggleCoOp} className={`px-6 py-3 rounded-full border transition-all ${coOpEnabled ? 'bg-[#39ff14]/20 border-[#39ff14]/50 text-[#39ff14]' : 'bg-white/5 border-white/10 text-white/50'}`}>Toggle Co-op Link 🔗</button>
          <button onClick={onExit} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10">← Exit</button>
        </div>
        <p className="text-[10px] text-white/50 uppercase tracking-widest">Phase 2: Orbital Drift Visual Prototype</p>
      </div>
    </div>
  );
}

export default OrbitalDriftContainer;
