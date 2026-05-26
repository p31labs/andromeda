import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, RotateCcw, Target, Zap } from 'lucide-react';

interface MediumEnergyViewProps {
  onBack: () => void;
}

type DrillPhase = 'ready' | 'windup' | 'throw' | 'result';
type TimingResult = 'perfect' | 'good' | 'early' | 'late' | 'miss';

interface DrillResult {
  timing: TimingResult;
  accuracy: number; // 0-100
  xp: number;
}

export const MediumEnergyView: React.FC<MediumEnergyViewProps> = ({ onBack }) => {
  const [phase, setPhase] = useState<DrillPhase>('ready');
  const [results, setResults] = useState<DrillResult[]>([]);
  const [lastResult, setLastResult] = useState<DrillResult | null>(null);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [ballPos, setBallPos] = useState({ x: 10, y: 80 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const phaseStartRef = useRef<number>(0);

  // Reset drill
  const resetDrill = useCallback(() => {
    setPhase('ready');
    setLastResult(null);
    setBallPos({ x: 10, y: 80 });
    setTargetPos({
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 40,
    });
  }, []);

  // Start drill sequence
  const startDrill = () => {
    setPhase('windup');
    phaseStartRef.current = performance.now();

    // Windup phase (600ms)
    setTimeout(() => {
      setPhase('throw');
      phaseStartRef.current = performance.now();
      startTimeRef.current = performance.now();

      // Throw window (400ms)
      setTimeout(() => {
        if (phase === 'throw') {
          setPhase('result');
          handleResult('miss');
        }
      }, 400);
    }, 600);
  };

  // Handle user input
  const handleInput = () => {
    if (phase !== 'throw') {
      if (phase === 'windup') {
        handleResult('early');
      } else if (phase === 'result') {
        // Ignore input during result
      }
      return;
    }

    const reactionTime = performance.now() - startTimeRef.current;

    let result: TimingResult;
    let accuracy: number;
    let xp: number;

    if (reactionTime < 150) {
      result = 'perfect';
      accuracy = 95 + Math.random() * 5;
      xp = 25;
    } else if (reactionTime < 300) {
      result = 'good';
      accuracy = 80 + Math.random() * 15;
      xp = 15;
    } else {
      result = 'late';
      accuracy = 60 + Math.random() * 20;
      xp = 5;
    }

    handleResult(result, accuracy, xp);
  };

  const handleResult = (timing: TimingResult, accuracy = 0, xp = 0) => {
    setPhase('result');
    const result: DrillResult = { timing, accuracy, xp };
    setLastResult(result);
    setResults(prev => [...prev, result]);

    // Auto-reset after showing result
    setTimeout(() => {
      resetDrill();
    }, 1500);
  };

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#0a101a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw field grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw target zone
      const targetX = (targetPos.x / 100) * canvas.width;
      const targetY = (targetPos.y / 100) * canvas.height;

      // Target rings
      ctx.beginPath();
      ctx.arc(targetX, targetY, 30, 0, Math.PI * 2);
      ctx.strokeStyle = '#da70d6';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(targetX, targetY, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(218, 112, 214, 0.3)';
      ctx.fill();

      // Draw QB
      const qbX = (ballPos.x / 100) * canvas.width;
      const qbY = (ballPos.y / 100) * canvas.height;

      ctx.beginPath();
      ctx.arc(qbX, qbY, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#00f5ff';
      ctx.fill();

      // QB position indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText('QB', qbX - 8, qbY + 4);

      // Draw throw indicator based on phase
      if (phase === 'windup') {
        // Windup arc
        ctx.beginPath();
        ctx.arc(qbX, qbY, 20, -Math.PI / 2, -Math.PI / 2 + (Date.now() - phaseStartRef.current) / 600 * Math.PI);
        ctx.strokeStyle = '#feca57';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (phase === 'throw') {
        // Active throw window
        ctx.beginPath();
        ctx.arc(targetX, targetY, 35, 0, Math.PI * 2);
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Throw line
        ctx.beginPath();
        ctx.moveTo(qbX, qbY);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Result overlay
      if (phase === 'result' && lastResult) {
        const colors: Record<TimingResult, string> = {
          perfect: '#39ff14',
          good: '#00f5ff',
          early: '#feca57',
          late: '#ff6b6b',
          miss: '#ff6b6b',
        };

        ctx.fillStyle = colors[lastResult.timing];
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          lastResult.timing.toUpperCase(),
          canvas.width / 2,
          canvas.height / 2
        );

        ctx.font = '16px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(
          `+${lastResult.xp} XP`,
          canvas.width / 2,
          canvas.height / 2 + 30
        );
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase, targetPos, ballPos, lastResult]);

  const totalXp = results.reduce((sum, r) => sum + r.xp, 0);
  const perfectCount = results.filter(r => r.timing === 'perfect').length;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => {
            cancelAnimationFrame(rafRef.current);
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
        <div className="text-right">
          <p className="text-xs text-white/50">Session XP</p>
          <p className="text-lg font-bold text-phos">{totalXp}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Instructions */}
        <div className="glass-panel rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-phos mb-2">
            <Target className="w-5 h-5" />
            <span className="font-bold">QB Accuracy Drill</span>
          </div>
          <p className="text-sm text-white/70">
            Watch the QB windup. Tap when the target flashes GREEN for perfect timing.
          </p>
        </div>

        {/* Game Canvas */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            onClick={handleInput}
            onTouchStart={handleInput}
            className="w-full h-auto cursor-pointer touch-none"
          />
        </div>

        {/* Phase Indicator */}
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Phase</span>
            <span className={`font-bold ${
              phase === 'ready' ? 'text-white' :
              phase === 'windup' ? 'text-gold' :
              phase === 'throw' ? 'text-phos' :
              'text-orchid'
            }`}>
              {phase === 'ready' && 'Ready'}
              {phase === 'windup' && 'Windup...'}
              {phase === 'throw' && 'THROW NOW!'}
              {phase === 'result' && 'Result'}
            </span>
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                phase === 'throw' ? 'bg-phos' : 'bg-white/30'
              }`}
              style={{
                width: phase === 'windup' ? '60%' : phase === 'throw' ? '100%' : '0%'
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="glass-panel rounded-xl p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-white/50">Attempts</p>
            <p className="text-2xl font-bold text-white">{results.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50">Perfect</p>
            <p className="text-2xl font-bold text-phos">{perfectCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50">Accuracy</p>
            <p className="text-2xl font-bold text-cyan">
              {results.length > 0
                ? Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length)
                : 0}%
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {phase === 'ready' && (
            <button
              onClick={startDrill}
              className="flex-1 glass-button py-4 rounded-xl font-bold text-phos border-phos/30
                         flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Drill
            </button>
          )}

          <button
            onClick={resetDrill}
            className="glass-button px-4 py-4 rounded-xl font-bold text-white/50
                       flex items-center justify-center"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Recent Results */}
        {results.length > 0 && (
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-white/50 mb-3">Recent Throws</p>
            <div className="flex flex-wrap gap-2">
              {results.slice(-10).map((r, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    r.timing === 'perfect' ? 'bg-phos/20 text-phos' :
                    r.timing === 'good' ? 'bg-cyan/20 text-cyan' :
                    r.timing === 'early' ? 'bg-gold/20 text-gold' :
                    'bg-red-500/20 text-red-400'
                  }`}
                >
                  {r.timing[0].toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-white/30">
          Medium Energy Mode • rAF-based timing • Batch XP on completion
        </p>
      </footer>
    </div>
  );
};
