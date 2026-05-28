import React, { useState, useMemo } from 'react';
import { PhosOrb } from './PhosOrb';
import { PassportProvider, useHardenedPassport } from '../lib/PassportContext';
import { SurfaceRouter } from './SurfaceRouter';
import type { OrbState } from '../types/phos';

export interface PhosShellProps {
  children: React.ReactNode;
  initialOrbState?: OrbState;
  reduceMotion?: boolean;
  spoonLevel?: number;
}

const PhosShellInner: React.FC<PhosShellProps> = ({
  children,
  initialOrbState = 'idle',
  reduceMotion = false,
  spoonLevel = 5
}) => {
  const [orbState, setOrbState] = useState<OrbState>(initialOrbState);
  const [rippleActive, setRippleActive] = useState(false);
  const { state: passport, isHydrated } = useHardenedPassport();

  // Derive triage and motion from passport when hydrated, fall back to props
  const isTriageMode = useMemo(() => {
    if (!isHydrated) return spoonLevel <= 1;
    return spoonLevel <= 1 || passport.visuals.screenComfort < 10;
  }, [isHydrated, passport.visuals.screenComfort, spoonLevel]);

  const effectiveReduceMotion = useMemo(() => {
    if (reduceMotion) return true;
    if (!isHydrated) return false;
    return passport.visuals.motion === 'none' || passport.visuals.motion === 'reduced';
  }, [reduceMotion, isHydrated, passport.visuals.motion]);

  // Background grid opacity from passport screenComfort
  const gridOpacity = useMemo(() => {
    if (isTriageMode) return 0;
    if (!isHydrated) return 0.03;
    return Math.max(0.01, passport.visuals.screenComfort / 2000);
  }, [isTriageMode, isHydrated, passport.visuals.screenComfort]);

  const handleIntentionalHold = () => {
    setOrbState(prev => {
      if (prev === 'idle') return 'active';
      if (prev === 'active') return 'crisis';
      return 'idle';
    });
  };

  const handleTap = () => {
    setRippleActive(true);
    setTimeout(() => setRippleActive(false), 400);
  };

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-200 overflow-x-hidden selection:bg-purple-900/50 pb-32">

      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: gridOpacity
        }}
        aria-hidden="true"
      />

      {rippleActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-zinc-600/20 rounded-full animate-ping z-40 pointer-events-none" aria-hidden="true" />
      )}

      <main className="relative z-10 w-full max-w-md mx-auto px-4 pt-6 h-full flex flex-col">
        <SurfaceRouter />
      </main>

      <PhosOrb
        status={orbState}
        onTap={handleTap}
        onIntentionalHold={handleIntentionalHold}
        disablePulse={effectiveReduceMotion || isTriageMode}
      />
    </div>
  );
};

export const PhosShell: React.FC<PhosShellProps> = (props) => (
  <PassportProvider>
    <PhosShellInner {...props} />
  </PassportProvider>
);

export default PhosShell;
