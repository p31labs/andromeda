import React, { useEffect, useState, useRef } from 'react';
import { phosAPI } from '../lib/phos-api';

interface TheGuardianProps {
  currentSurface: string;
  onGroundingComplete: () => void;
}

const CYCLE_MS = 19000;
const INHALE_MS = 4000;
const HOLD_MS = 7000;

const TheGuardian: React.FC<TheGuardianProps> = ({ currentSurface, onGroundingComplete }) => {
  const [alertSent, setAlertSent] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const cycleRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let mounted = true;
    phosAPI.sendCrisisAlert({
      surface: currentSurface,
      spoons: 0,
      message: 'Guardian Protocol activated — operator in crisis',
    }).then(() => { if (mounted) setAlertSent(true); });
    return () => { mounted = false; };
  }, [currentSurface]);

  useEffect(() => {
    cycleRef.current = setInterval(() => {
      const elapsed = Date.now() % CYCLE_MS;
      if (elapsed < INHALE_MS) {
        setPhase('inhale');
      } else if (elapsed < INHALE_MS + HOLD_MS) {
        setPhase('hold');
      } else {
        setPhase('exhale');
      }
    }, 100);
    return () => clearInterval(cycleRef.current);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: '#000000',
        color: '#888888',
      }}
    >
      <div className="max-w-md px-8 text-center relative z-10">
        <div className="mb-10 text-6xl font-thin tracking-[0.3em] uppercase opacity-30">
          ●
        </div>

        <p className="text-xl font-mono leading-relaxed mb-6">
          System locked.<br />
          Audio muted.<br />
          You are safe.
        </p>

        <div className="h-8 flex items-center justify-center mb-4">
          {alertSent ? (
            <p className="text-sm font-mono opacity-60">
              Silent alert dispatched to family mesh.
            </p>
          ) : (
            <p className="text-sm font-mono opacity-30 animate-pulse">
              Dispatching alert...
            </p>
          )}
        </div>

        {/* 4-7-8 Breathing Pacer */}
        <div className="my-10 flex flex-col items-center gap-4">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full transition-transform duration-100"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #444444',
                transform: phase === 'inhale'
                  ? 'scale(0.4)'
                  : phase === 'hold'
                  ? 'scale(1.0)'
                  : 'scale(0.4)',
                transition: phase === 'inhale' || phase === 'exhale'
                  ? 'transform 0.1s linear'
                  : 'none',
              }}
            />
          </div>
          <p className="text-sm font-mono uppercase tracking-widest opacity-60">
            {phase}
          </p>
        </div>

        <button
          onClick={onGroundingComplete}
          className="px-12 py-4 text-base font-mono uppercase tracking-widest transition-all hover:opacity-80"
          style={{
            backgroundColor: '#111111',
            color: '#888888',
            border: '1px solid #333333',
          }}
        >
          Grounding Complete
        </button>
      </div>

      <style>{`
        @keyframes breathe {
          0% { transform: scale(0.4); }
          21% { transform: scale(1.0); }
          59% { transform: scale(1.0); }
          100% { transform: scale(0.4); }
        }
        .breathe-pacer {
          animation: breathe 19s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TheGuardian;
