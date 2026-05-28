import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, PowerOff, AlertTriangle } from 'lucide-react';
import { usePanicEject } from '../lib/hooks/usePanicEject';
import type { SanctuarySurfaceProps } from '../types/phos';

export const SanctuarySurface: React.FC<SanctuarySurfaceProps> = ({ onAttemptUnlock, onEject, isUnlocked }) => {
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [isDeriving, setIsDeriving] = useState(false);
  const [authError, setAuthError] = useState(false);

  usePanicEject(onEject, isUnlocked);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setIsDeriving(true);
    setAuthError(false);

    const success = await onAttemptUnlock(passphrase);
    if (!success) {
      setAuthError(true);
      setPassphrase('');
    }
    setIsDeriving(false);
  };

  if (isUnlocked) {
    return (
      <div className="flex flex-col h-full w-full bg-zinc-950 text-emerald-50 p-4">
        <header className="flex justify-between items-center pb-4 border-b border-emerald-900/50">
          <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs">
            <Unlock size={16} />
            <span>SECURE MEMORY ACTIVE</span>
          </div>
          <button onClick={onEject} className="flex items-center gap-2 px-3 py-1.5 bg-red-950/50 border border-red-900 text-red-400 font-mono text-xs rounded">
            <PowerOff size={14} />
            <span>PURGE KEY</span>
          </button>
        </header>
        <div className="flex-grow flex items-center justify-center text-zinc-600 font-mono text-center text-xs">
          ENVELOPE STORAGE RETURNED TO RAM CACHE.<br />DECRYPTION CAPABLE.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-6">
      {!safetyConfirmed ? (
        <div className="w-full max-w-sm space-y-4">
          <div className="p-4 border border-indigo-900/50 bg-indigo-950/10 rounded-lg font-mono text-xs text-indigo-300 text-center">
            CONFIRM PHYSICAL SECURITY AND ISOLATION BEFORE DECRYPTION STEP
          </div>
          <button onClick={() => setSafetyConfirmed(true)} className="w-full py-4 bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-lg flex items-center justify-center gap-2">
            <ShieldCheck size={18} />
            <span>ISOLATION BOUNDS CONFIRMED</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Passphrase credential verification..."
            autoComplete="off"
            spellCheck={false}
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
          />
          {authError && (
            <div className="flex items-center gap-2 text-red-400 text-xs justify-center font-mono">
              <AlertTriangle size={12} />
              <span>KEY CALCULATION EXCEPTION</span>
            </div>
          )}
          <button type="submit" disabled={isDeriving} className="w-full py-4 bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono rounded-lg">
            {isDeriving ? 'PBKDF2 EXPANSION RUNNING...' : 'DECRYPT SYSTEM DATA'}
          </button>
        </form>
      )}
    </div>
  );
};
