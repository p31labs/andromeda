import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MagneticPoetryGame } from '../../games/magnetic-poetry/MagneticPoetryGame';
import { GlassEarningsOverlay } from '../../visual-system/components/GlassEarningsOverlay';

interface MagneticPoetryContainerProps {
  isActive: boolean;
  onBack: () => void;
}

export const MagneticPoetryContainer: React.FC<MagneticPoetryContainerProps> = ({
  isActive,
  onBack
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MagneticPoetryGame | null>(null);
  const [isCoop, setIsCoop] = useState(false);
  const [isPoemComplete, setIsPoemComplete] = useState(false);
  const [snappedWords, setSnappedWords] = useState<{ word1: string; word2: string }[]>([]);
  const [credits, setCredits] = useState(45);

  useEffect(() => {
    if (!containerRef.current || !isActive) return;

    const game = new MagneticPoetryGame({
      container: containerRef.current,
      onWordSnap: (word1: string, word2: string) => {
        setSnappedWords(prev => [...prev, { word1, word2 }]);
        setCredits(c => c + 1);
      },
      onPoemComplete: () => {
        console.log('Poem complete! Love Economy care flow recorded.');
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

  const handlePoemComplete = useCallback(() => {
    setIsPoemComplete(true);
    gameRef.current?.triggerPoemComplete();
  }, []);

  const handleReset = useCallback(() => {
    setIsPoemComplete(false);
    gameRef.current?.resetCamera();
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0a0c10] overflow-hidden">
      {/* Game Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
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
      <div className={`absolute top-6 left-6 z-20 transition-opacity duration-500 ${isPoemComplete ? 'opacity-0' : 'opacity-100'}`}>
        <GlassEarningsOverlay position="top-left" compact={false} />
      </div>

      {/* Player Tags */}
      <div className={`absolute top-6 right-6 z-20 flex flex-col gap-3 items-end transition-opacity duration-500 ${isPoemComplete ? 'opacity-0' : 'opacity-100'}`}>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border-[#00f5ff]/30 shadow-[0_0_15px_rgba(0,245,255,0.1)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00f5ff] shadow-[0_0_8px_#00f5ff]"></div>
          <span className="text-sm font-bold tracking-wide text-white">S.J. Palette</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border-[#39ff14]/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]"></div>
          <span className="text-sm font-bold tracking-wide text-white">W.J. Palette</span>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className={`absolute top-6 left-1/2 -translate-x-1/2 z-20 glass-button px-4 py-2 rounded-full text-white/80 text-sm font-bold transition-opacity duration-500 ${isPoemComplete ? 'opacity-0' : 'opacity-100'}`}
      >
        ← Back to Arcade
      </button>

      {/* Game Controls */}
      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 transition-opacity duration-500 ${isPoemComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="glass-panel px-6 py-2 rounded-full text-xs text-white/70 mb-2 border border-white/10">
          Drag magnets close to each other to trigger magnetic snap & field lines.
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCoopToggle}
            className={`glass-button px-6 py-3 rounded-full font-bold border transition-all duration-300 flex items-center gap-2 ${
              isCoop
                ? 'bg-white/10 text-[#da70d6] border-[#da70d6]/50 shadow-[0_0_20px_rgba(218,112,214,0.3)]'
                : 'text-[#da70d6] border-[#da70d6]/50 shadow-[0_0_15px_rgba(218,112,214,0.1)]'
            }`}
          >
            <span>🤝</span>
            <span>Co-op Fridge Mode</span>
          </button>

          <button
            onClick={handlePoemComplete}
            className="glass-button px-6 py-3 rounded-full text-white font-bold border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-2 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            <span>✨</span>
            <span>Poem Complete (Pan)</span>
          </button>
        </div>

        <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mt-2">
          Phase 3: Magnetic Poetry — {snappedWords.length} words connected
        </p>
      </div>

      {/* Poem Complete Reset Button */}
      {isPoemComplete && (
        <button
          onClick={handleReset}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 glass-button px-8 py-4 rounded-full text-white font-bold border border-[#da70d6]/50 shadow-[0_0_30px_rgba(218,112,214,0.4)] flex items-center gap-2 animate-pulse"
        >
          <span>🔄</span>
          <span>Reset Camera & Continue</span>
        </button>
      )}

      {/* Stats Overlay */}
      <div className={`absolute bottom-6 left-6 z-20 glass-panel px-4 py-3 rounded-xl transition-opacity duration-500 ${isPoemComplete ? 'opacity-0' : 'opacity-100'}`}>
        <div className="text-xs text-white/60 mb-1">Credits Earned</div>
        <div className="text-2xl font-bold text-[#feca57] shadow-[0_0_10px_rgba(254,202,87,0.3)]">
          {credits}cr
        </div>
      </div>
    </div>
  );
};
