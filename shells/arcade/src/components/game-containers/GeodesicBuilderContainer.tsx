import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeodesicBuilderGame } from '../../games/geodesic-builder/GeodesicBuilderGame';
import { GlassEarningsOverlay } from '../../visual-system/components/GlassEarningsOverlay';
import * as THREE from 'three';

interface GeodesicBuilderContainerProps {
  isActive: boolean;
  onBack: () => void;
}

export const GeodesicBuilderContainer: React.FC<GeodesicBuilderContainerProps> = ({
  isActive,
  onBack
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GeodesicBuilderGame | null>(null);
  const [isCoop, setIsCoop] = useState(false);
  const [pieceCount, setPieceCount] = useState(0);
  const [careFlows, setCareFlows] = useState(0);
  const [credits, setCredits] = useState(45);
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !isActive) return;

    const game = new GeodesicBuilderGame({
      container: containerRef.current,
      onPieceBuilt: (isCoopMode: boolean, _position: THREE.Vector3) => {
        setPieceCount(prev => prev + 1);
        if (isCoopMode) {
          setCareFlows(prev => prev + 1);
          setCredits(c => c + 2);
        } else {
          setCredits(c => c + 1);
        }
      },
      onStructurePulse: () => {
        console.log('Structure pulsed! Love Economy bonus recorded.');
        setCredits(c => c + 5);
      }
    });

    gameRef.current = game;

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [isActive]);

  const handleCoopToggle = useCallback(() => {
    const newCoop = !isCoop;
    setIsCoop(newCoop);
    gameRef.current?.setCoOpMode(newCoop);
  }, [isCoop]);

  const handlePulse = useCallback(() => {
    setPulseActive(true);
    gameRef.current?.pulseStructure();
    setTimeout(() => setPulseActive(false), 1000);
  }, []);

  const handleClear = useCallback(() => {
    gameRef.current?.clearStructure();
    setPieceCount(0);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#030408] overflow-hidden">
      {/* Game Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-crosshair"
      />

      {/* Co-op Glow Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none z-5 transition-opacity duration-1000 ${
          isCoop ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 100px rgba(218, 112, 214, 0.3)',
          border: '4px solid rgba(218, 112, 214, 0.4)'
        }}
      />

      {/* CHUMP Earnings Overlay */}
      <div className="absolute top-6 left-6 z-20 transition-transform hover:scale-105 origin-top-left duration-300">
        <GlassEarningsOverlay position="top-left" compact={false} />
      </div>

      {/* Player Tags */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3 items-end">
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border-[#00f5ff]/30 shadow-[0_0_10px_rgba(0,245,255,0.1)]">
          <div className="w-3 h-3 rotate-45 border-2 border-[#00f5ff] shadow-[0_0_8px_#00f5ff]"></div>
          <span className="text-sm font-bold tracking-wide text-white">S.J. Cursor</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border-[#39ff14]/30 shadow-[0_0_10px_rgba(57,255,20,0.1)]">
          <div className="w-3 h-3 rounded-sm border-2 border-[#39ff14] shadow-[0_0_8px_#39ff14]"></div>
          <span className="text-sm font-bold tracking-wide text-white">W.J. Cursor (AI)</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 mt-2">
          <span className="text-xs text-white/50">Pieces: {pieceCount} / 50</span>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-1/2 -translate-x-1/2 z-20 glass-button px-4 py-2 rounded-full text-white/80 text-sm font-bold"
      >
        ← Back to Arcade
      </button>

      {/* Stats */}
      <div className="absolute top-24 left-6 z-20 glass-panel px-4 py-3 rounded-xl">
        <div className="text-xs text-white/60 mb-1">Co-op Care Flows</div>
        <div className="text-2xl font-bold text-[#da70d6]">
          {careFlows}
        </div>
      </div>

      {/* Game Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
        <div className="glass-panel px-6 py-2 rounded-full text-xs text-white/70 mb-2 border border-white/10 text-center">
          Click grid to build. Co-op building generates Orchid structures with Care Particles.
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCoopToggle}
            className={`glass-button px-6 py-3 rounded-full font-bold transition-all duration-300 flex items-center gap-2 ${
              isCoop
                ? 'bg-white/10 text-[#da70d6] border-[#da70d6]/50 shadow-[0_0_20px_rgba(218,112,214,0.3)]'
                : 'text-white border-[#da70d6]/50 shadow-[0_0_15px_rgba(218,112,214,0.1)]'
            }`}
          >
            <span>{isCoop ? '🔗' : '🔗'}</span>
            <span>{isCoop ? 'Linked! (Build together)' : 'Enable Co-op Link'}</span>
          </button>

          <button
            onClick={handlePulse}
            className={`glass-button px-6 py-3 rounded-full text-white font-bold border border-white/20 flex items-center gap-2 transition-all duration-300 ${
              pulseActive ? 'shadow-[0_0_40px_rgba(218,112,214,0.6)] scale-105' : ''
            }`}
          >
            <span>✨</span>
            <span>Structure Pulse</span>
          </button>

          <button
            onClick={handleClear}
            className="glass-button px-6 py-3 rounded-full text-white/50 font-bold border border-white/10"
          >
            Reset
          </button>
        </div>

        <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mt-2">
          Phase 4: Geodesic Builder — {careFlows} care flows generated
        </p>
      </div>

      {/* Credits Display */}
      <div className="absolute bottom-6 left-6 z-20 glass-panel px-4 py-3 rounded-xl">
        <div className="text-xs text-white/60 mb-1">Credits Earned</div>
        <div className="text-2xl font-bold text-[#feca57] shadow-[0_0_10px_rgba(254,202,87,0.3)]">
          {credits}cr
        </div>
      </div>

      {/* Domain Badge */}
      <div className="absolute bottom-6 right-6 z-20 glass-panel px-4 py-3 rounded-xl">
        <div className="text-xs text-white/60 mb-1">Four-Domain</div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="text-[#da70d6]">Love Economy</span>
          <span className="text-white/40">+</span>
          <span className="text-[#00f5ff]">Arcade</span>
        </div>
      </div>
    </div>
  );
};
