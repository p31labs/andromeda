import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import PHOSOrb from './PHOSOrb';
import ConnectionGrid from './ConnectionGrid';
import LoveLedger from './LoveLedger';
import VaultStatus from './VaultStatus';
import { logGuardianActivated, logGroundingCompleted, logDeviceSealed } from '../lib/EventLogger';
import { phosAPI } from '../lib/phos-api';
import { speak, cancelSpeech } from '../lib/VoiceEngine';
import { KarmaEngine } from '../lib/KarmaEngine';
import { CryptoEngine } from '../lib/CryptoEngine';
import { ChaosIngest } from '../surfaces/ChaosIngest';
import { WarehouseSurface } from '../surfaces/WarehouseSurface';
import { RetroVaultSurface } from '../surfaces/RetroVaultSurface';
import { LedgerSurface } from '../surfaces/LedgerSurface';
import { SanctuarySurface } from '../surfaces/SanctuarySurface';
import { ArchiveSurface } from '../surfaces/ArchiveSurface';
import { ArcadeSurface } from '../surfaces/ArcadeSurface';
import { NodeZeroSurface } from '../surfaces/NodeZeroSurface';
import { HearthSurface } from '../surfaces/HearthSurface';
import { ForgeSurface } from '../surfaces/ForgeSurface';
import { ShakeStream } from '../surfaces/ShakeStream';
import BondingSurface from './BondingSurface';
import DonationCta from './DonationCta';

// --- BIOLOGICAL THEME ENGINE ---
const getBiologicalTheme = (spoons: number, grayRock: boolean) => {
  if (grayRock || spoons === 0) {
    return {
      name: 'CRISIS',
      wrapper: 'bg-black text-gray-500 font-mono tracking-tight',
      orb: 'bg-gray-800 shadow-none animate-none',
      button: 'bg-gray-900 border border-gray-800 text-gray-500 rounded-sm backdrop-blur-none transition-none',
      hud: 'bg-black/90 border border-gray-800',
      input: 'bg-gray-900 border-gray-800 text-gray-500 rounded-sm',
      card: 'bg-black border border-gray-800',
      heading: 'text-gray-500 font-mono',
      body: 'text-gray-600 font-mono text-sm',
    };
  }
  if (spoons <= 2) {
    return {
      name: 'SANCTUARY',
      wrapper: 'bg-gradient-to-b from-orange-950/20 to-rose-950/20 text-orange-50 font-sans tracking-normal',
      orb: 'bg-gradient-to-tr from-amber-400 to-rose-400 shadow-[0_0_60px_rgba(251,146,60,0.4)] animate-biomimetic-breath',
      button: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full shadow-lg backdrop-blur-md active:scale-95 transition-all duration-300',
      hud: 'bg-orange-950/40 backdrop-blur-xl border border-orange-900/50 rounded-3xl',
      input: 'bg-orange-950/40 border border-orange-900/50 text-white rounded-full backdrop-blur-md focus:ring-1 focus:ring-orange-400',
      card: 'bg-orange-950/30 backdrop-blur-md border border-orange-900/30 rounded-2xl',
      heading: 'text-orange-100 font-sans',
      body: 'text-orange-200/70 font-sans text-base',
    };
  }
  if (spoons === 3) {
    return {
      name: 'BRIDGE',
      wrapper: 'bg-slate-950/50 text-slate-200 font-serif tracking-wide',
      orb: 'bg-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-pulse',
      button: 'bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg backdrop-blur-sm active:scale-95 transition-all duration-300',
      hud: 'bg-slate-900/80 backdrop-blur-lg border border-slate-800 rounded-2xl',
      input: 'bg-slate-900 border border-slate-800 text-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500',
      card: 'bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl',
      heading: 'text-slate-100 font-serif',
      body: 'text-slate-300/70 font-serif text-base',
    };
  }
  return {
    name: 'QUANTUM',
    wrapper: 'bg-black text-emerald-400 font-mono tracking-tight',
    orb: 'bg-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.8)] animate-pulse',
    button: 'bg-emerald-950/20 hover:bg-emerald-900/40 border border-emerald-500/50 text-emerald-400 rounded-none active:scale-95 transition-all duration-150',
    hud: 'bg-black/90 backdrop-blur-md border border-emerald-900/50',
    input: 'bg-black border border-emerald-900 text-emerald-400 rounded-none focus:ring-1 focus:ring-emerald-500',
    card: 'bg-black/80 border border-emerald-900/50',
    heading: 'text-emerald-300 font-mono',
    body: 'text-emerald-400/60 font-mono text-sm',
  };
};

import type { SurfaceKey } from '../lib/atmosphere';

// --- SURFACE CONTENT RENDERERS ---
const SurfaceContent: React.FC<{
  surface: string;
  theme: ReturnType<typeof getBiologicalTheme>;
  spoons: number;
  grayRock: boolean;
  setSurface: (s: SurfaceKey) => void;
  setSpoons: (s: number) => void;
}> = ({ surface, theme, spoons, grayRock, setSurface, setSpoons }) => {
  if (grayRock || spoons === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm opacity-50">All systems muted. Gray Rock active.</p>
        <p className="text-xs opacity-30">Use the Escape Hatch or PHOS Guide to restore.</p>
      </div>
    );
  }

  switch (surface) {
    case 'GREETING':
      return (
        <div className="text-center space-y-6 max-w-lg">
          <h1 className={`text-3xl ${theme.heading}`}>
            Welcome home, Operator.
          </h1>
          <p className={theme.body}>
            The calcium cage is stable. Cognition is externalized. I am here.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <VaultStatus />
            <LoveLedger />
          </div>
        </div>
      );

    case 'IGNITION':
      return <IgnitionSurface theme={theme} spoons={spoons} />;

    case 'THE_BUFFER':
      return (
        <div className="max-w-lg w-full">
          <ChaosIngest />
        </div>
      );

    case 'NODE_ZERO':
      return (
        <div className="space-y-6 max-w-3xl w-full">
          <h1 className={`text-2xl ${theme.heading}`}>Node Zero — Command Center</h1>
          <NodeZeroSurface spoons={spoons} grayRock={grayRock} />
          <div className="mt-6">
            <ConnectionGrid />
          </div>
        </div>
      );

    case 'GRID':
      return (
        <div className="space-y-6 max-w-3xl w-full">
          <h1 className={`text-2xl ${theme.heading}`}>Service Mesh</h1>
          <ConnectionGrid />
        </div>
      );

    case 'SANCTUARY':
      return (
        <div className="max-w-2xl w-full">
          <SanctuarySurface />
        </div>
      );

    case 'FORGE':
      return (
        <div className="max-w-3xl w-full">
          <ForgeSurface />
        </div>
      );

    case 'HEARTH':
      return (
        <div className="max-w-3xl w-full">
          <HearthSurface spoons={spoons} grayRock={grayRock} onPainAlert={() => setSpoons(Math.max(0, spoons - 1))} />
        </div>
      );

    case 'COMPASS':
      return (
        <div className="text-center space-y-6 max-w-lg">
          <h1 className={`text-3xl ${theme.heading}`}>Compass</h1>
          <p className={theme.body}>
            Let us find your way. Tell me what you need.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {[
              { label: 'I need to rest', surface: 'SANCTUARY' as const },
              { label: 'I need to work', surface: 'NODE_ZERO' as const },
              { label: 'I need to play', surface: 'ARCADE' as const },
              { label: 'I need to connect', surface: 'BONDING' as const },
              { label: 'I need to build', surface: 'FORGE' as const },
            ].map(({ label, surface: s }) => (
              <button key={label} onClick={() => setSurface(s)} className={`py-4 text-sm ${theme.button}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'ARCADE':
      return (
        <div className="max-w-3xl w-full h-full min-h-[60vh]">
          <ArcadeSurface spoons={spoons} grayRock={grayRock} />
        </div>
      );

    case 'VAULT':
      return (
        <div className="max-w-3xl w-full">
          <RetroVaultSurface />
        </div>
      );

    case 'LEDGER':
      return (
        <div className="max-w-lg w-full">
          <LedgerSurface />
        </div>
      );

    case 'LOVE':
      return (
        <div className="max-w-lg w-full">
          <LedgerSurface />
        </div>
      );

    case 'ARCHIVE': {
      return <ArchiveSurface />;
    }

    case 'SETTINGS':
      return (
        <div className="space-y-6 max-w-lg w-full">
          <h1 className={`text-2xl ${theme.heading}`}>Settings</h1>
          <div className="space-y-3">
            {['Voice Output', 'Haptic Feedback', 'Reduced Motion', 'High Contrast'].map((label) => (
              <div key={label} className={`flex items-center justify-between p-4 ${theme.card}`}>
                <span className="text-sm">{label}</span>
                <div className={`w-10 h-5 rounded-full ${theme.button} relative`}>
                  <div className="w-4 h-4 rounded-full bg-white/50 absolute top-0.5 right-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'BONDING':
      return (
        <div className="max-w-3xl w-full h-full min-h-[60vh]">
          <BondingSurface />
        </div>
      );

    default:
      return (
        <div className="text-center space-y-4">
          <p className={theme.body}>Surface: {surface}</p>
        </div>
      );
  }
};
  // --- IGNITION SURFACE ---
const IgnitionSurface: React.FC<{
  theme: ReturnType<typeof getBiologicalTheme>;
  spoons: number;
}> = ({ theme }) => {
  const { setSurface } = useAtmosphere();
  const [sealing, setSealing] = useState(false);

  const handleSeal = useCallback(async () => {
    setSealing(true);
    try {
      await CryptoEngine.sealDevice();
      logDeviceSealed();
      setSurface('GREETING');
    } catch {
      setSealing(false);
    }
  }, [setSurface]);

  return (
    <div className="max-w-xl text-center space-y-12">
      <div className="flex justify-center mb-16">
        <div className={`w-32 h-32 transition-all duration-1000 flex items-center justify-center rounded-full ${theme.orb}`}>
          <div className="w-16 h-16 bg-white/20 rounded-full blur-md" />
        </div>
      </div>

      <div className="space-y-6">
        <h1 className={`text-4xl font-light leading-relaxed ${theme.heading}`}>
          You are about to step out of the noise and into the Sanctuary.
        </h1>
        <p className={`text-lg opacity-70 leading-relaxed max-w-md mx-auto ${theme.body}`}>
          No passwords to remember. No trackers watching you. Just a private vault for your data, locked directly to this physical device.
        </p>
      </div>

      <div className="pt-8">
        <button
          onClick={handleSeal}
          disabled={sealing}
          className={`px-12 py-5 text-lg tracking-widest flex items-center gap-4 mx-auto ${theme.button}`}
        >
          {sealing ? 'SEALING...' : 'I AM READY. SEAL MY DEVICE.'}
        </button>
      </div>
    </div>
  );
};

// --- GUARDIAN RECOVERY OVERLAY (post-breathing) ---
const GuardianRecovery: React.FC<{
  theme: ReturnType<typeof getBiologicalTheme>;
  onDismiss: () => void;
  onDonate: () => void;
  setDonationContext: (ctx: string) => void;
}> = ({ theme, onDismiss, onDonate, setDonationContext }) => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95">
    <div className="max-w-md text-center space-y-6 p-8">
      <p className={`text-2xl ${theme.heading}`}>Grounding complete.</p>
      <p className={theme.body}>
        You just used a tool that exists because someone funded it.
      </p>
      <p className={`text-sm opacity-60 ${theme.body}`}>
        This crisis protocol is free. Keep it alive for the next person.
      </p>
      <div className="flex flex-col gap-3 pt-4">
        <button
          onClick={() => { setDonationContext('POST_GUARDIAN'); onDonate(); }}
          className="px-8 py-3 text-sm font-bold rounded-xl transition-all"
          style={{ backgroundColor: '#7c3aed', color: '#f5f3ff' }}
        >
          ♥ SUPPORT P31 — $5/mo
        </button>
        <button
          onClick={onDismiss}
          className={`px-8 py-2 text-xs tracking-widest ${theme.button}`}
        >
          DISMISS
        </button>
      </div>
    </div>
  </div>
);

// --- GUARDIAN BREATHING OVERLAY ---
const GuardianOverlay: React.FC<{
  active: boolean;
  theme: ReturnType<typeof getBiologicalTheme>;
  onComplete: () => void;
  onCancel: () => void;
}> = ({ active, theme, onComplete, onCancel }) => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [count, setCount] = useState(4);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;

    const cycle = () => {
      setPhase('inhale');
      setCount(4);
      let c = 4;
      const inhale = setInterval(() => {
        c--;
        if (c <= 0) {
          clearInterval(inhale);
          setPhase('hold');
          setCount(7);
          c = 7;
          const hold = setInterval(() => {
            c--;
            if (c <= 0) {
              clearInterval(hold);
              setPhase('exhale');
              setCount(8);
              c = 8;
              const exhale = setInterval(() => {
                c--;
                if (c <= 0) {
                  clearInterval(exhale);
                  logGroundingCompleted(2);
                  KarmaEngine.addLove(10, 'Guardian breathing completed');
                  onComplete();
                } else {
                  setCount(c);
                }
              }, 1000);
              timerRef.current = exhale;
            } else {
              setCount(c);
            }
          }, 1000);
          timerRef.current = hold;
        } else {
          setCount(c);
        }
      }, 1000);
      timerRef.current = inhale;
    };

    cycle();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95">
      <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-1000 ${theme.orb}`}>
        <span className="text-4xl font-light">{count}</span>
      </div>
      <p className={`mt-8 text-xl tracking-widest uppercase ${theme.heading}`}>
        {phase === 'inhale' ? 'Breathe In' : phase === 'hold' ? 'Hold' : 'Breathe Out'}
      </p>
      <p className={`mt-4 text-sm opacity-50 ${theme.body}`}>
        4-7-8 breathing · Glutamate regulation
      </p>
      <button
        onClick={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          onCancel();
        }}
        className={`mt-12 px-6 py-2 text-xs tracking-widest ${theme.button}`}
      >
        CANCEL
      </button>
    </div>
  );
};

// --- MAIN PHOSSHELL ---
export default function PHOSShell() {
  const {
    spoons,
    grayRock,
    setSpoons,
    setSurface,
    currentSurface,
    preset,
  } = useAtmosphere();

  const [hudOpen, setHudOpen] = useState(false);
  const [guardianActive, setGuardianActive] = useState(false);
  const [guardianRecovery, setGuardianRecovery] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [donationContext, setDonationContext] = useState('ESCAPE_HATCH');
  const [isIgnition, setIsIgnition] = useState(
    !CryptoEngine.isDeviceSealed() && currentSurface === 'IGNITION'
  );

  const theme = getBiologicalTheme(spoons, grayRock);

  // Speak surface entry on change
  useEffect(() => {
    if (!isIgnition) {
      speak(undefined, currentSurface as any, grayRock, preset.voice);
    }
  }, [currentSurface, grayRock, preset.voice, isIgnition]);

  const handlePanic = useCallback(() => {
    logGuardianActivated(spoons);
    cancelSpeech();
    setSpoons(0);
    setGuardianActive(true);

    phosAPI.sendCrisisAlert({
      surface: currentSurface,
      spoons: 0,
      message: 'Guardian Protocol activated — operator in crisis',
    }).catch(() => {});
  }, [spoons, setSpoons, currentSurface]);

  const handleGuardianComplete = useCallback(() => {
    setGuardianActive(false);
    setGuardianRecovery(true);
    setSpoons(2);
  }, [setSpoons]);

  const handleGuardianRecoveryDismiss = useCallback(() => {
    setGuardianRecovery(false);
  }, []);

  const handleGuardianCancel = useCallback(() => {
    setGuardianActive(false);
  }, []);

  // --- ESCAPE HATCH HUD ---
  const EscapeHatch = () => (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      <button
        onClick={() => setHudOpen(!hudOpen)}
        className={`px-6 py-2 flex items-center gap-2 ${theme.hud} transition-all duration-500 group`}
      >
        <span className="text-xs">[</span>
        <span className="text-xs tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
          {theme.name} STATE
        </span>
        <span className="text-xs">]</span>
        <span className={`text-xs opacity-50 transition-transform duration-500 ${hudOpen ? 'rotate-180' : ''}`}>v</span>
      </button>

      <div className={`mt-4 overflow-hidden transition-all duration-500 ease-in-out ${hudOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={`p-6 w-80 flex flex-col gap-6 ${theme.hud}`}>
          <div className="text-center border-b border-inherit pb-4">
            <p className="text-xs tracking-widest opacity-50 mb-4">COGNITIVE LOAD (SPOONS)</p>
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpoons(s)}
                  className={`w-10 h-10 flex items-center justify-center transition-all duration-300
                    ${theme.button}
                    ${spoons === s ? 'scale-110 font-bold opacity-100 bg-white/20' : 'opacity-40'}
                    ${s === 0 ? 'text-red-400 border-red-900/50' : ''}
                  `}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSurface('GRID')} className={`py-3 text-xs tracking-widest ${theme.button}`}>GRID</button>
            <button onClick={() => setSurface('VAULT')} className={`py-3 text-xs tracking-widest ${theme.button}`}>VAULT</button>
            <button onClick={() => setSurface('NODE_ZERO')} className={`py-3 text-xs tracking-widest ${theme.button}`}>NODE ZERO</button>
            <button onClick={() => setSurface('ARCADE')} className={`py-3 text-xs tracking-widest ${theme.button}`}>ARCADE</button>
            <button onClick={() => setSurface('HEARTH')} className={`py-3 text-xs tracking-widest ${theme.button}`}>HEARTH</button>
            <button onClick={() => setSurface('SANCTUARY')} className={`py-3 text-xs tracking-widest ${theme.button}`}>SANCTUARY</button>
            <button onClick={() => setSurface('THE_BUFFER')} className={`py-3 text-xs tracking-widest ${theme.button}`}>BUFFER</button>
            <button onClick={() => setSurface('COMPASS')} className={`py-3 text-xs tracking-widest ${theme.button}`}>COMPASS</button>
            <button onClick={() => setSurface('ARCHIVE')} className={`py-3 text-xs tracking-widest ${theme.button}`}>ARCHIVE</button>
            <button onClick={() => setSurface('FORGE')} className={`py-3 text-xs tracking-widest ${theme.button}`}>FORGE</button>
            <button
              onClick={() => { setDonationContext('ESCAPE_HATCH'); setDonationOpen(true); }}
              className={`py-3 text-xs tracking-widest col-span-2 ${theme.button}`}
              style={{ color: '#c084fc', borderColor: '#5b21b6' }}
            >
              ♥ SUPPORT P31
            </button>
            <div className={`py-2 text-xs text-center col-span-2 ${theme.body}`}>
              <a
                href="https://discord.gg/uYW5rTCuZ"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                💬 Discord Mesh →
              </a>
            </div>
            <button
              onClick={handlePanic}
              className={`py-3 text-xs tracking-widest col-span-2 ${theme.button} text-red-400 border-red-900/30 hover:bg-red-950/30`}
            >
              [ ! ] GUARDIAN PROTOCOL
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- IGNITION SURFACE ---
  if (isIgnition) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-1000 ${theme.wrapper}`}>
        <style>{`
          @keyframes biomimetic-breath {
            0%, 100% { transform: scale(0.95); opacity: 0.85; box-shadow: 0 0 40px rgba(251,146,60,0.2); }
            50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 80px rgba(251,146,60,0.6); }
          }
          .animate-biomimetic-breath {
            animation: biomimetic-breath 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        <IgnitionSurface theme={theme} spoons={spoons} />
      </div>
    );
  }

  // --- PRIMARY OPERATING SURFACE ---
  return (
    <div className={`min-h-screen relative overflow-hidden transition-all duration-1000 ${theme.wrapper}`}>
      <style>{`
        @keyframes biomimetic-breath {
          0%, 100% { transform: scale(0.95); opacity: 0.85; box-shadow: 0 0 40px rgba(251,146,60,0.2); }
          50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 80px rgba(251,146,60,0.6); }
        }
        .animate-biomimetic-breath {
          animation: biomimetic-breath 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <GuardianOverlay
        active={guardianActive}
        theme={theme}
        onComplete={handleGuardianComplete}
        onCancel={handleGuardianCancel}
      />

      {guardianRecovery && (
        <GuardianRecovery
          theme={theme}
          onDismiss={handleGuardianRecoveryDismiss}
          onDonate={() => setDonationOpen(true)}
          setDonationContext={setDonationContext}
        />
      )}

      <DonationCta
        isOpen={donationOpen}
        onClose={() => setDonationOpen(false)}
        surfaceContext={donationContext}
      />

      <EscapeHatch />

      <main className="h-screen flex flex-col items-center justify-center p-6">
        {/* Central Biological Anchor */}
        <div className="mb-12">
          <PHOSOrb />
        </div>

        {/* Surface-Specific Content */}
        <div className="w-full max-w-3xl flex flex-col items-center">
          <SurfaceContent
            surface={currentSurface}
            theme={theme}
            spoons={spoons}
            grayRock={grayRock}
            setSurface={setSurface}
            setSpoons={setSpoons}
          />
        </div>
      </main>
    </div>
  );
}
