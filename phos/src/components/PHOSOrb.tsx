import React, { useState, useRef, useCallback } from 'react';
import { Hexagon, Zap, ShieldAlert } from 'lucide-react';
import type { OrbState } from '../types/phos';

export interface PhosOrbProps {
  status?: OrbState;
  onTap?: () => void;
  onIntentionalHold?: () => void;
  disablePulse?: boolean;
}

export const PhosOrb: React.FC<PhosOrbProps> = ({
  status = 'idle',
  onTap,
  onIntentionalHold,
  disablePulse = false
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback(() => {
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      if (onIntentionalHold) onIntentionalHold();
      setIsPressing(false);
    }, 1500);
  }, [onIntentionalHold]);

  const handlePointerUp = useCallback(() => {
    setIsPressing(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      if (onTap) onTap();
    }
  }, [onTap]);

  const stateConfig = {
    idle: {
      colors: 'bg-zinc-950 border-zinc-800 text-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.02)]',
      icon: <Hexagon size={24} strokeWidth={1.5} />,
      animation: 'animate-none'
    },
    active: {
      colors: 'bg-zinc-950 border-emerald-900/50 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      icon: <Zap size={24} strokeWidth={1.5} />,
      animation: disablePulse ? 'animate-none' : 'animate-[pulse_4s_ease-in-out_infinite]'
    },
    crisis: {
      colors: 'bg-zinc-950 border-purple-900/60 text-purple-400 shadow-[0_0_40px_rgba(147,51,234,0.25)]',
      icon: <ShieldAlert size={26} strokeWidth={2} />,
      animation: disablePulse ? 'animate-none' : 'animate-[pulse_2s_ease-in-out_infinite]'
    }
  };

  const config = stateConfig[status];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        aria-label={`PHOS Core State Indicator: ${status}. Hold to shift core system parameter.`}
        className={`
          relative flex items-center justify-center
          w-16 h-16 rounded-full border-2
          transition-all duration-700 ease-out
          touch-manipulation select-none outline-none
          focus-visible:ring-2 focus-visible:ring-zinc-400
          ${config.colors}
          ${config.animation}
          ${isPressing ? 'scale-90 brightness-150' : 'scale-100'}
          after:absolute after:inset-[-24px] after:content-[''] after:rounded-full
        `}
      >
        <span className={`relative z-10 transition-transform duration-300 ${isPressing ? 'scale-75' : 'scale-100'}`}>
          {config.icon}
        </span>
      </button>
      <span className="text-[10px] tracking-widest uppercase font-mono text-zinc-600 select-none">{status}</span>
    </div>
  );
};
