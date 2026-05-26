import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Trophy, RotateCcw, Play } from 'lucide-react';
import { usePlayers } from '../db/hooks';

interface MediumEnergyViewProps {
  onBack: () => void;
}

interface SwingResult {
  timing: 'perfect' | 'good' | 'early' | 'late' | 'miss';
  power: number;
  xp: number;
}

export const MediumEnergyView: React.FC<MediumEnergyViewProps> = ({ onBack }) => {
  const { players, loading } = usePlayers();

  const [isActive, setIsActive] = useState(false);
  const [swings, setSwings] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [lastResult, setLastResult] = useState<SwingResult | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Timing game state
  const [pitcherState, setPitcherState] = useState<'windup' | 'release' | 'hittable' | 'passed'>('windup');
  const [swingWindow, setSwingWindow] = useState(false);

  // Animation refs
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const startMinigame = () => {
    setIsActive(true);
    setSwings(0);
    setTotalXp(0);
    setLastResult(null);
    runPitchSequence();
  };

  const runPitchSequence = useCallback(() => {
    setPitcherState('windup');
    setSwingWindow(false);

    // Windup phase (800ms)
    setTimeout(() => {
      setPitcherState('release');

      // Release to hittable window (300ms)
      setTimeout(() => {
        setPitcherState('hittable');
        setSwingWindow(true);
        startTimeRef.current = performance.now();

        // Perfect window closes after 200ms
        setTimeout(() => {
          setSwingWindow(false);
          setPitcherState('passed');

          // Reset for next pitch after delay
          setTimeout(() => {
            if (isActive) {
              runPitchSequence();
            }
          }, 1000);
        }, 200);
      }, 300);
    }, 800);
  }, [isActive]);

  const handleSwing = () => {
    if (!swingWindow || pitcherState !== 'hittable') {
      // Miss or too early/late
      const result: SwingResult = {
        timing: pitcherState === 'hittable' ? 'miss' : pitcherState === 'release' ? 'early' : 'late',
        power: 0,
        xp: 0,
      };
      setLastResult(result);
      setSwings(s => s + 1);
      return;
    }

    // Calculate timing precision
    const reactionTime = performance.now() - startTimeRef.current;
    let result: SwingResult;

    if (reactionTime < 100) {
      result = { timing: 'perfect', power: 100, xp: 50 };
    } else if (reactionTime < 180) {
      result = { timing: 'good', power: 80, xp: 30 };
    } else {
      result = { timing: 'late', power: 40, xp: 10 };
    }

    setLastResult(result);
    setSwings(s => s + 1);
    setTotalXp(xp => xp + result.xp);
    setSwingWindow(false);
  };

  const stopMinigame = () => {
    setIsActive(false);
    cancelAnimationFrame(rafRef.current);
    // In a real implementation, this would flush accumulated XP to PGLite
    console.log(`[Medium] Flushing ${totalXp} XP to database`);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const timingLabels: Record<string, { color: string; bg: string }> = {
    perfect: { color: 'text-phos', bg: 'bg-phos/20' },
    good: { color: 'text-cyan', bg: 'bg-cyan/20' },
    early: { color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
    late: { color: 'text-orange-400', bg: 'bg-orange-400/20' },
    miss: { color: 'text-red-400', bg: 'bg-red-400/20' },
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => {
            stopMinigame();
            onBack();
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-phos" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Medium Energy Mode</h1>
          <p className="text-xs text-white/50">3 Spoons • 15-Minute Loop</p>
        </div>
        {isActive && (
          <div className="text-right">
            <p className="text-xs text-white/50">Total XP</p>
            <p className="text-lg font-bold text-phos">{totalXp}</p>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {!isActive ? (
          /* Pre-Game Setup */
          <div className="space-y-6 pt-8">
            <div className="text-center space-y-2">
              <Trophy className="w-16 h-16 text-phos mx-auto" />
              <h2 className="text-2xl font-bold text-white">Batting Practice</h2>
              <p className="text-white/50 text-sm">
                Time your swings to maximize XP gains
              </p>
            </div>

            {/* Player Selection */}
            {loading ? (
              <div className="glass-panel rounded-xl p-6 text-center">
                <p className="text-white/50">Loading roster...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-white/70">Select Player:</p>
                <div className="grid grid-cols-2 gap-2">
                  {players.slice(0, 4).map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(player.id)}
                      className={`glass-panel rounded-lg p-3 text-left transition-all ${
                        selectedPlayer === player.id
                          ? 'bg-phos/10 border-phos/50'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <p className="font-bold text-white">{player.first_name}</p>
                      <p className="text-xs text-white/50">#{player.jersey_number}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={startMinigame}
              disabled={loading || players.length === 0}
              className="w-full glass-button py-4 rounded-xl font-bold text-phos border-phos/30
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Practice
            </button>
          </div>
        ) : (
          /* Active Minigame */
          <div className="space-y-6 pt-4">
            {/* Pitcher Visualization */}
            <div className="glass-panel rounded-2xl p-8 aspect-square flex flex-col items-center justify-center relative overflow-hidden">
              {/* Pitcher Mound */}
              <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-dirt/30 to-transparent" />

              {/* Pitcher Avatar */}
              <div
                className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                  pitcherState === 'windup'
                    ? 'border-yellow-400 bg-yellow-400/10 scale-100'
                    : pitcherState === 'release'
                    ? 'border-orange-400 bg-orange-400/20 scale-110'
                    : pitcherState === 'hittable'
                    ? 'border-phos bg-phos/30 scale-125'
                    : 'border-white/20 bg-white/5 scale-100'
                }`}
              >
                <span className="text-4xl">
                  {pitcherState === 'windup' ? '🌀' : pitcherState === 'release' ? '⚡' : pitcherState === 'hittable' ? '🎯' : '✓'}
                </span>
              </div>

              {/* State Label */}
              <p className={`mt-4 font-bold text-lg ${
                pitcherState === 'hittable' ? 'text-phos' : 'text-white/50'
              }`}>
                {pitcherState === 'windup' && 'Windup...'}
                {pitcherState === 'release' && 'Release!'}
                {pitcherState === 'hittable' && 'SWING NOW!'}
                {pitcherState === 'passed' && 'Ball passed...'}
              </p>
            </div>

            {/* Swing Button - Massive Touch Target */}
            <button
              onClick={handleSwing}
              className={`w-full aspect-[2/1] rounded-2xl font-bold text-2xl transition-all duration-100 active:scale-95 ${
                swingWindow
                  ? 'bg-phos/20 border-4 border-phos shadow-[0_0_40px_rgba(57,255,20,0.3)]'
                  : 'glass-panel border-4 border-white/10'
              }`}
            >
              <span className={swingWindow ? 'text-phos' : 'text-white/50'}>
                {swingWindow ? '⚾ TAP TO SWING!' : 'Wait for pitch...'}
              </span>
            </button>

            {/* Last Result Display */}
            {lastResult && (
              <div className={`glass-panel rounded-xl p-4 text-center ${timingLabels[lastResult.timing].bg}`}>
                <p className={`text-2xl font-bold ${timingLabels[lastResult.timing].color}`}>
                  {lastResult.timing.toUpperCase()}!
                </p>
                <p className="text-white/70 mt-1">
                  Power: {lastResult.power}% • +{lastResult.xp} XP
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="glass-panel rounded-xl p-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-white/50">Swings</p>
                <p className="text-2xl font-bold text-white">{swings}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/50">Session XP</p>
                <p className="text-2xl font-bold text-phos">{totalXp}</p>
              </div>
            </div>

            {/* Stop Button */}
            <button
              onClick={stopMinigame}
              className="w-full glass-button py-3 rounded-xl font-bold text-white/50
                         flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              End Practice & Save XP
            </button>
          </div>
        )}
      </main>

      {/* Instructions Footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-white/30">
          Tap when the pitcher reaches 🎯 for perfect timing
        </p>
      </footer>
    </div>
  );
};
