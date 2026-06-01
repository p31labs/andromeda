import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere, AtmosphereProvider } from './AtmosphereProvider';
import PHOSOrb from './PHOSOrb';
import TheGuardian from './TheGuardian';
import { SurfaceContent } from './SurfaceContent';
import { SurfaceErrorBoundary } from './SurfaceErrorBoundary';
import { BrainCircuit, ChevronDown, ShieldAlert } from 'lucide-react';
import { DemoController } from './DemoController';
import { GrantNarrativeOverlay } from './GrantNarrativeOverlay';

export function getBiologicalTheme(spoons: number, grayRock: boolean) {
  if (grayRock || spoons === 0) {
    return {
      name: 'CRISIS',
      wrapper: 'bg-black text-gray-500 font-mono tracking-tight select-none',
      orb: 'bg-gray-800 shadow-none animate-none scale-90',
      button: 'bg-gray-900 border border-gray-800 text-gray-500 rounded-sm backdrop-blur-none transition-none',
      hud: 'bg-black/90 border border-gray-800 rounded-none',
      input: 'bg-gray-900 border-gray-800 text-gray-500 rounded-none pointer-events-none',
      container: 'max-w-xl mx-auto p-4 border border-gray-900 bg-black',
    };
  }
  if (spoons <= 2) {
    return {
      name: 'SANCTUARY',
      wrapper: 'bg-slate-950 text-orange-50 font-sans tracking-normal bg-gradient-to-b from-orange-950/20 via-slate-950 to-rose-950/20',
      orb: 'bg-gradient-to-tr from-amber-400 to-rose-400 shadow-[0_0_60px_rgba(251,146,60,0.35)] animate-biomimetic-breath',
      button: 'bg-white/10 hover:bg-white/15 border border-white/10 text-orange-100 rounded-full shadow-md backdrop-blur-md active:scale-98 transition-all duration-300',
      hud: 'bg-orange-950/30 backdrop-blur-xl border border-orange-900/40 rounded-3xl shadow-xl',
      input: 'bg-orange-950/20 border border-orange-900/30 text-orange-100 rounded-full backdrop-blur-md focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all duration-300',
      container: 'max-w-4xl mx-auto p-8 rounded-3xl bg-slate-900/30 border border-white/5 backdrop-blur-md shadow-2xl',
    };
  }
  if (spoons === 3) {
    return {
      name: 'BRIDGE',
      wrapper: 'bg-slate-950 text-slate-200 font-serif tracking-wide',
      orb: 'bg-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)] animate-pulse',
      button: 'bg-slate-900/80 hover:bg-slate-850 border border-slate-700 text-slate-200 rounded-xl backdrop-blur-sm active:scale-97 transition-all duration-200',
      hud: 'bg-slate-900/90 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-lg',
      input: 'bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
      container: 'max-w-6xl mx-auto p-6 border border-slate-800/80 bg-slate-900/40 rounded-2xl',
    };
  }
  return {
    name: 'QUANTUM',
    wrapper: 'bg-black text-emerald-400 font-mono tracking-tight min-h-screen border border-emerald-950/40',
    orb: 'bg-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.6)] animate-pulse rounded-none rotate-45',
    button: 'bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-500/40 text-emerald-400 rounded-none active:translate-y-px transition-all duration-100',
    hud: 'bg-black border-b border-emerald-900/50 rounded-none',
    input: 'bg-black border border-emerald-900/60 text-emerald-300 rounded-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 font-mono',
    container: 'w-full mx-auto p-4 border border-emerald-950 bg-black/80 font-mono grid gap-4',
  };
}

function PHOSShellInner() {
  const { spoons, setSpoons, grayRock, currentSurface, setSurface } = useAtmosphere();
  const [hudOpen, setHudOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const theme = getBiologicalTheme(spoons, grayRock);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setHudOpen(false);
      if (spoons === 0) setSpoons(3);
    }
    if (e.key === 'h' || e.key === 'H') {
      if (!e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setHudOpen(prev => !prev);
      }
    }
    if (e.key === '0') {
      e.preventDefault();
      setSpoons(0);
    }
  }, [spoons, setSpoons]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (spoons === 0 || grayRock) {
    return <TheGuardian />;
  }

  const surfaceNames: Record<string, string> = {
    GREETING: 'Greeting', IGNITION: 'Ignition', BONDING: 'Bonding', THE_BUFFER: 'Buffer',
    VAULT: 'Vault', GRID: 'Grid', NODE_ZERO: 'Node Zero', LEDGER: 'Ledger', LOVE: 'Love',
    HEARTH: 'Hearth', ARCADE: 'Arcade', ARCHIVE: 'Archive', COMPASS: 'Compass', SETTINGS: 'Settings',
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen w-full relative overflow-x-hidden transition-all duration-1000 select-none ${theme.wrapper}`}>
        <div className="min-h-screen pt-28 pb-12 px-4 flex flex-col items-center justify-start">
          <div className="mb-10"><PHOSOrb /></div>
          <div className={`w-full ${theme.container}`}>
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-3 mb-2"><div className="animate-pulse bg-white/5 rounded h-4 w-32" /><div className="animate-pulse bg-white/5 rounded h-3 w-16 ml-auto" /></div>
              <div className="animate-pulse bg-white/5 rounded h-6 w-3/4" />
              <div className="animate-pulse bg-white/5 rounded h-4 w-full" />
              <div className="animate-pulse bg-white/5 rounded h-4 w-5/6" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="animate-pulse bg-white/5 rounded h-20" />
                <div className="animate-pulse bg-white/5 rounded h-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden transition-all duration-1000 select-none ${theme.wrapper}`}>
      <style>{`
        @keyframes biomimetic-breath {
          0%, 100% { transform: scale(0.96); opacity: 0.8; box-shadow: 0 0 35px rgba(251,146,60,0.15); }
          50% { transform: scale(1.04); opacity: 1; box-shadow: 0 0 70px rgba(251,146,60,0.5); }
        }
        .animate-biomimetic-breath { animation: biomimetic-breath 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-biomimetic-breath, .animate-pulse, .transition-all { animation: none !important; transition: none !important; }
        }
        *:focus-visible { outline: 2px solid rgba(52, 211, 153, 0.6); outline-offset: 2px; }
      `}</style>

      <GrantNarrativeOverlay />
      <DemoController />

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <button
          onClick={() => setHudOpen(!hudOpen)}
          className={`px-5 py-2.5 flex items-center gap-3 font-mono text-xs tracking-wider border transition-all duration-500 group ${theme.button}`}
          aria-label="Toggle HUD (press H)"
          aria-expanded={hudOpen}
          aria-controls="hud-panel"
        >
          <BrainCircuit size={14} className="text-inherit opacity-70 animate-pulse" />
          <span>PHOS_CORE // {theme.name}</span>
          <ChevronDown size={12} className={`transform transition-transform duration-500 ${hudOpen ? 'rotate-180' : ''}`} />
        </button>
        <div
          id="hud-panel"
          role="region"
          aria-label="Navigation HUD"
          className={`mt-3 overflow-hidden transition-all duration-500 ease-in-out ${hudOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className={`p-5 w-80 flex flex-col gap-5 border border-white/5 shadow-2xl backdrop-blur-2xl ${theme.hud}`}>
            <div className="text-center border-b border-white/10 pb-3">
              <p className="text-[10px] font-mono tracking-widest opacity-50 mb-3 uppercase">Spoon Configuration</p>
              <div className="flex justify-between gap-1" role="radiogroup" aria-label="Spoon level">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpoons(s); setHudOpen(false); }}
                    className={`w-9 h-9 flex items-center justify-center font-mono text-xs border rounded transition-all duration-300 ${theme.button} ${spoons === s ? 'scale-110 font-bold opacity-100 bg-white/5 ring-1 ring-emerald-500/40' : 'opacity-40 hover:opacity-70'}`}
                    role="radio"
                    aria-checked={spoons === s}
                    aria-label={`${s} spoons${s === 0 ? ' (crisis mode)' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Surfaces">
              {['GREETING', 'GRID', 'VAULT', 'ARCADE', 'HEARTH', 'THE_BUFFER', 'NODE_ZERO', 'ARCHIVE'].map((surf) => (
                <button
                  key={surf}
                  onClick={() => { setSurface(surf); setHudOpen(false); }}
                  className={`py-2 text-[10px] font-mono tracking-wider truncate uppercase ${theme.button} ${currentSurface === surf ? 'opacity-100 bg-white/5 ring-1 ring-emerald-500/40' : 'opacity-60 hover:opacity-80'}`}
                  role="tab"
                  aria-selected={currentSurface === surf}
                  aria-label={surfaceNames[surf] || surf}
                >
                  {surf.replace('THE_', '')}
                </button>
              ))}
              <button
                onClick={() => { setSpoons(0); setHudOpen(false); }}
                className="col-span-2 py-2.5 rounded-lg border border-red-900/40 bg-red-950/20 text-red-400 font-mono text-[10px] tracking-widest hover:bg-red-900/30 flex items-center justify-center gap-2 transition-all duration-300"
                aria-label="Emergency crisis mode (press Escape to exit)"
              >
                <ShieldAlert size={12} /> CRISIS_MODE
              </button>
            </div>
            <div className="text-[9px] font-mono opacity-30 text-center pt-1 border-t border-white/5">
              H: toggle HUD · 0: crisis · Esc: reset
            </div>
          </div>
        </div>
      </div>

      <main className="min-h-screen pt-28 pb-12 px-4 flex flex-col items-center justify-start z-10 relative" aria-live="polite" aria-label={`${surfaceNames[currentSurface] || currentSurface} surface`}>
        <div className="mb-10 flex flex-col items-center justify-center">
          <PHOSOrb />
        </div>
        <div className={`w-full transition-all duration-700 ${theme.container}`}>
          <SurfaceErrorBoundary surfaceName={currentSurface}>
            <SurfaceContent currentSurface={currentSurface} setSurface={setSurface} spoons={spoons} theme={theme} />
          </SurfaceErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function PHOSShell() {
  return (
    <AtmosphereProvider initialSpoons={3} initialSurface="GREETING">
      <PHOSShellInner />
    </AtmosphereProvider>
  );
}
