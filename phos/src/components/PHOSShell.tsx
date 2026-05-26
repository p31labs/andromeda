import React, { useCallback, useEffect, useState } from 'react';
import type { SurfaceKey } from '../lib/atmosphere';
import { useAtmosphere } from './AtmosphereProvider';
import { speak, isMuted, toggleMute, speakGreeting, cancelSpeech } from '../lib/VoiceEngine';
import { logSurfaceNavigated, logVoiceToggled, logDeviceSealed, logDeviceUnlocked, logGuardianActivated } from '../lib/EventLogger';
import { CryptoEngine } from '../lib/CryptoEngine';
import { routeIntent } from '../lib/IntentEngine';
import { phosAPI } from '../lib/phos-api';
import PHOSOrb from './PHOSOrb';
import TheGuardian from './TheGuardian';
import TheLedger from './TheLedger';
import TheLoveLedger from './TheLoveLedger';
import NodeZero from './NodeZero';
import { KarmaEngine } from '../lib/KarmaEngine';
import { logGroundingCompleted, logLoveChanged } from '../lib/EventLogger';
import TheBuffer from './TheBuffer';
import TheCompass from './TheCompass';
import BondingSurface from './BondingSurface';
import ConnectionGrid from './ConnectionGrid';
import SpoonLogger from './SpoonLogger';
import VaultStatus from './VaultStatus';
import LoveLedger from './LoveLedger';
import TheArchive from './TheArchive';

const PHOS_GREETINGS: Record<string, string> = {
  GREETING: 'Welcome home, Operator. The calcium cage is stable. Cognition is externalized. Type your intent into the guide, or select a surface. I am here.',
  IGNITION: 'Welcome home. You are about to step out of the noise and into the Sanctuary. No passwords to remember. No trackers watching you. Just a private vault for your data, locked directly to this device.',
  BONDING: 'Channel open. You are held in safe connection.',
  THE_BUFFER: 'Sanctuary active. The noise cannot reach you here.',
  NODE_ZERO: 'Physical Hardware Bridge connected. Telemetry active.',
  ARCADE: 'Play is productive. Let the joy flow.',
  VAULT: 'Vault sealed. Your assets are secure.',
  GRID: 'The Referee is active. All family nodes are merging peacefully.',
  COMPASS: 'Compass active. Let us find your way.',
  LEDGER: 'Memory surface active. Reviewing your cognitive history.',
  LOVE: 'Love economy active. Your value is sovereign.',
  SETTINGS: 'Preferences accessible. Tuning your experience.',
  ARCHIVE: 'Sovereign archive accessed. What do you seek?',
};

const PHOSShell: React.FC = () => {
  const {
    currentSurface,
    preset,
    grayRock,
    setSurface,
    setSpoons,
    loading,
    error,
    spoons,
  } = useAtmosphere();

  const [muted, setMutedState] = useState(() => isMuted());
  const [hudOpen, setHudOpen] = useState(false);
  const [intentInput, setIntentInput] = useState('');
  const [isSealing, setIsSealing] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    speakGreeting(currentSurface, grayRock);
  }, []);

  const handleToggleMute = useCallback(() => {
    const newState = toggleMute();
    setMutedState(newState);
    logVoiceToggled(newState);
  }, []);

  const navigate = useCallback(
    (surface: SurfaceKey) => {
      const prevSurface = currentSurface;
      setSurface(surface);
      logSurfaceNavigated(prevSurface, surface, grayRock);
      speak(undefined, surface, grayRock, preset.voice);
      const url = new URL(window.location.href);
      url.searchParams.set('surface', surface.toLowerCase());
      window.history.replaceState({}, '', url.toString());
    },
    [currentSurface, setSurface, grayRock, preset.voice]
  );

  const handleRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentInput.trim()) return;
    const nextSurface = routeIntent(intentInput, spoons);
    setSurface(nextSurface);
    setIntentInput('');
    speak(undefined, nextSurface, grayRock, preset.voice);
    logSurfaceNavigated(currentSurface, nextSurface, grayRock);
    const url = new URL(window.location.href);
    url.searchParams.set('surface', nextSurface.toLowerCase());
    window.history.replaceState({}, '', url.toString());
  };

  const getTheme = () => {
    if (grayRock || spoons === 0) {
      return {
        font: 'font-mono tracking-tight',
        bg: 'bg-black/95 backdrop-blur-3xl',
        text: 'text-gray-500',
        input: 'bg-black border border-gray-800 text-gray-500 rounded-none',
        button: 'bg-gray-900 border border-gray-800 text-gray-500 rounded-none',
        glass: 'bg-black/90 border border-gray-900',
      };
    }
    if (spoons <= 2) {
      return {
        font: 'font-sans tracking-normal',
        bg: 'bg-gradient-to-b from-orange-950/60 to-rose-950/40 backdrop-blur-2xl',
        text: 'text-orange-50',
        input: 'bg-white/5 border border-white/10 text-orange-50 rounded-full shadow-inner focus:bg-white/10',
        button: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95',
        glass: 'bg-orange-950/40 backdrop-blur-xl border border-orange-500/20 rounded-3xl',
      };
    }
    if (spoons === 3) {
      return {
        font: 'font-serif tracking-wide',
        bg: 'bg-slate-950/50 backdrop-blur-md',
        text: 'text-slate-200',
        input: 'bg-slate-900/50 border border-slate-700 text-slate-200 rounded-lg focus:bg-slate-800',
        button: 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg transition-all',
        glass: 'bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-xl',
      };
    }
    return {
      font: 'font-mono tracking-tight',
      bg: 'bg-transparent',
      text: 'text-emerald-400',
      input: 'bg-black/50 border border-emerald-900 text-emerald-400 rounded-sm focus:border-emerald-500',
      button: 'bg-black border border-emerald-500/50 hover:bg-emerald-950 text-emerald-400 rounded-sm transition-all',
      glass: 'bg-black/80 backdrop-blur-md border border-emerald-900/50 rounded-none',
    };
  };

  const handlePanic = useCallback(() => {
    logGuardianActivated(spoons);
    cancelSpeech();
    setSpoons(0);
    phosAPI.sendCrisisAlert({
      surface: currentSurface,
      spoons: 0,
      message: 'Guardian Protocol activated — operator in crisis',
    }).catch(() => {});
  }, [setSpoons, currentSurface]);

  const handleGuardianReturn = useCallback(() => {
    const newBalance = KarmaEngine.addLove(10, 'Grounding cycle completed');
    logGroundingCompleted(spoons);
    logLoveChanged(newBalance, 10);
    setSpoons(1);
    setSurface('THE_BUFFER');
  }, [setSpoons, setSurface, spoons]);

  const theme = getTheme();
  const isIgnition = currentSurface === 'IGNITION';

  if (spoons === 0) {
    return <TheGuardian currentSurface={currentSurface} onGroundingComplete={handleGuardianReturn} />;
  }

  return (
    <div className={`relative z-10 w-full min-h-screen flex flex-col items-center justify-center transition-all duration-1000 ${theme.font} ${theme.bg}`}>

      {/* HUD ESCAPE HATCH */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <button
          onClick={() => setHudOpen(!hudOpen)}
          className={`px-4 py-1.5 text-xs uppercase tracking-widest transition-all ${theme.glass} ${theme.text} hover:opacity-100 opacity-60`}
        >
          {hudOpen ? 'Close HUD' : 'HUD'}
        </button>

        {hudOpen && (
          <div className={`mt-4 p-4 flex flex-col gap-4 animate-fade-in ${theme.glass}`}>
            {/* Status widgets */}
            <div className="flex items-center gap-3">
              <SpoonLogger />
              <VaultStatus />
              <LoveLedger />
              <button
                onClick={handleToggleMute}
                className="px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors hover:scale-105"
                style={{
                  color: muted ? '#888888' : preset.palette.secondary,
                  borderColor: muted ? '#444444' : preset.palette.secondary,
                  borderWidth: 1,
                  borderStyle: 'solid',
                }}
              >
                {muted ? 'MUTED' : 'VOICE'}
              </button>
            </div>

            {/* Cognitive Load Selector */}
            <div className="flex flex-col items-center">
              <span className={`text-[10px] uppercase mb-2 ${theme.text} opacity-50`}>Cognitive Load</span>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpoons(s)}
                    className={`w-8 h-8 flex items-center justify-center text-xs transition-all
                      ${spoons === s ? 'bg-current text-black font-bold scale-110 rounded-full' : 'bg-transparent border border-current/30 hover:border-current/80 rounded-full'}`}
                    style={{ color: spoons === s ? '#000' : 'inherit' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Nav */}
            <div className="flex flex-col items-center pt-2 border-t border-current/20">
              <span className={`text-[10px] uppercase mb-2 ${theme.text} opacity-50`}>Emergency Nav</span>
              <div className="flex gap-2">
                {['GREETING', 'GRID', 'SETTINGS'].map((surf) => (
                  <button
                    key={surf}
                    onClick={() => { setSurface(surf as SurfaceKey); setHudOpen(false); }}
                    className={`text-xs px-3 py-1.5 transition-colors hover:bg-white/10 ${theme.button}`}
                  >
                    {surf}
                  </button>
                ))}
              </div>
            </div>

            {/* Sync status */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono opacity-50">
              {loading && <span className="text-amber-500 animate-pulse">syncing...</span>}
              {error && <span className="text-red-500" title={error}>error</span>}
            </div>

            {/* Surface Navigation */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-current/20">
              {(Object.keys(PHOS_GREETINGS) as SurfaceKey[]).map((surface) => (
                <button
                  key={surface}
                  onClick={() => { navigate(surface); setHudOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-mono rounded border transition-all duration-200 hover:scale-105 ${
                    currentSurface === surface
                      ? 'border-current font-bold'
                      : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                  style={{
                    borderColor: currentSurface === surface ? preset.palette.primary : undefined,
                    color: preset.palette.text,
                    backgroundColor: currentSurface === surface
                      ? preset.palette.primary + '11'
                      : 'rgba(0,0,0,0.4)',
                  }}
                >
                  {surface.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* IGNITION SURFACE */}
      {isIgnition ? (
        <div className="flex flex-col items-center text-center max-w-lg px-6 animate-fade-in mt-12">
          <PHOSOrb />
          <h1 className={`text-4xl md:text-5xl font-light mb-6 mt-8 ${theme.text}`}>
            {CryptoEngine.isDeviceSealed() ? 'Device Sealed.' : 'Welcome home.'}
          </h1>
          <p className={`text-lg md:text-xl mb-12 opacity-80 leading-relaxed ${theme.text}`}>
            {CryptoEngine.isDeviceSealed()
              ? 'Your local vault is cryptographically locked to this physical device\'s secure enclave. You are safe.'
              : 'You are about to step out of the noise and into the Sanctuary. No passwords to remember. No trackers watching you. Just a private vault for your data, locked directly to this device.'}
          </p>

          {!CryptoEngine.isDeviceSealed() ? (
            <button
              disabled={isSealing}
              onClick={async () => {
                setIsSealing(true);
                const success = await CryptoEngine.sealDevice();
                setIsSealing(false);
                if (success) {
                  logDeviceSealed();
                  setSurface('GREETING');
                }
              }}
              className={`w-full py-6 text-xl font-medium tracking-wide ${theme.button} ${isSealing ? 'opacity-50 animate-pulse' : ''}`}
            >
              {isSealing ? 'Communing with Secure Enclave...' : 'I am ready. Seal my device.'}
            </button>
          ) : (
            <button
              onClick={() => setSurface('GREETING')}
              className={`w-full py-6 text-xl font-medium tracking-wide ${theme.button}`}
            >
              Enter Sanctuary
            </button>
          )}
          {!CryptoEngine.isDeviceSealed() && (
            <p className={`mt-6 text-sm opacity-50 ${theme.text}`}>Tapping this generates your secure key via WebAuthn. Takes 2 seconds.</p>
          )}
        </div>
      ) : currentSurface === 'THE_BUFFER' ? (
        CryptoEngine.isDeviceSealed() && !isUnlocked ? (
          <div className="flex flex-col items-center text-center max-w-lg px-6 animate-fade-in mt-12">
            <PHOSOrb />
            <h1 className={`text-4xl md:text-5xl font-light mb-6 mt-8 ${theme.text}`}>Vault Locked</h1>
            <p className={`text-lg md:text-xl mb-12 opacity-80 leading-relaxed ${theme.text}`}>
              Your Sanctuary is sealed to this device. Authenticate with your biometric or PIN to open the vault.
            </p>
            <button
              disabled={isUnlocking}
              onClick={async () => {
                setIsUnlocking(true);
                const success = await CryptoEngine.unlockDevice();
                setIsUnlocking(false);
                if (success) {
                  setIsUnlocked(true);
                  logDeviceUnlocked();
                }
              }}
              className={`w-full py-6 text-xl font-medium tracking-wide ${theme.button} ${isUnlocking ? 'opacity-50 animate-pulse' : ''}`}
            >
              {isUnlocking ? 'Verifying...' : 'Unlock Vault'}
            </button>
          </div>
        ) : (
          <TheBuffer />
        )
      ) : currentSurface === 'BONDING' ? (
        <div className="relative w-full min-h-screen flex flex-col items-center">
          <BondingSurface />
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
            <PHOSOrb />
          </div>
        </div>
      ) : currentSurface === 'COMPASS' ? (
        <TheCompass />
      ) : currentSurface === 'LEDGER' ? (
        <TheLedger />
      ) : currentSurface === 'LOVE' ? (
        <TheLoveLedger />
      ) : currentSurface === 'NODE_ZERO' ? (
        <NodeZero />
      ) : currentSurface === 'ARCHIVE' ? (
        <TheArchive />
      ) : (
        /* STANDARD SURFACE */
        <div className="flex flex-col items-center w-full max-w-md px-6 animate-fade-in mt-16">

          <div className="mb-12">
            <PHOSOrb />
          </div>

          <div className="text-center mb-10 h-16 flex items-center justify-center">
            <p className={`text-lg transition-all ${theme.text}`}>
              {spoons <= 2
                ? 'The calcium cage is stable. You are safe here.'
                : currentSurface === 'GREETING'
                  ? 'Operator detected. Awaiting intent.'
                  : `${currentSurface} active.`}
            </p>
          </div>

          <form onSubmit={handleRoute} className="w-full relative flex items-center gap-3">
            <input
              type="text"
              value={intentInput}
              onChange={(e) => setIntentInput(e.target.value)}
              placeholder={spoons <= 2 ? 'What do you need?' : 'Enter intent...'}
              className={`w-full px-6 py-4 text-center outline-none transition-all ${theme.input} ${theme.text}`}
            />
            <button
              type="button"
              onClick={handlePanic}
              className="w-12 h-12 shrink-0 rounded-full bg-red-950/80 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center font-mono font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              title="Guardian Panic Protocol"
            >
              !
            </button>
          </form>

          {/* Connection Grid — only on GRID surface */}
          {currentSurface === 'GRID' && (
            <div className="w-full max-w-4xl mt-8">
              <ConnectionGrid />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PHOSShell;
