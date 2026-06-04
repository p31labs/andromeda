import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { getBalanceAtomic, mintCreditsAtomic, getLedgerHistory, verifyLedgerIntegrity } from '../lib/KarmaEngine';

interface LedgerEntry {
  kind: string;
  delta: number;
  timestamp: number;
  signature: string;
  prevSignature: string;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function LedgerSurface({ theme }: { theme: Record<string, string> }) {
  const [balance, setBalance] = useState(0);
  const [logs, setLogs] = useState<LedgerEntry[]>([]);
  const [integrity, setIntegrity] = useState<{ valid: boolean; count: number } | null>(null);

  /* v8 ignore start */
  const refresh = useCallback(async () => {
    const [b, h, i] = await Promise.all([
      getBalanceAtomic(),
      getLedgerHistory(20),
      verifyLedgerIntegrity(),
    ]);
    setBalance(b);
    setLogs(h);
    setIntegrity(i);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);
  /* v8 ignore stop */

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono tracking-widest uppercase opacity-60">LOVE Ledger</h3>
        <div className="flex items-center gap-2">
          {integrity && (
            <span className={`text-[9px] font-mono ${integrity.valid ? 'text-emerald-400' : 'text-red-400'}`}>
              {integrity.valid ? '✓ CHAIN VALID' : '⚠ TAMPERED'} ({integrity.count})
            </span>
          )}
          <span className="text-[10px] font-mono rounded px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">Atomic</span>
        </div>
      </div>

      <div className={`p-6 rounded-xl border border-white/5 text-center ${theme.name === 'CRISIS' ? 'bg-black' : 'bg-white/5'}`}>
        <span className="text-[9px] font-mono uppercase opacity-40 block mb-1">Care Economy Credits</span>
        <span className="text-3xl font-mono font-bold tracking-tight">{balance} <span className="text-sm opacity-50">LOVE</span></span>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase opacity-40 block">Transaction History</span>
        {logs.length === 0 ? (
          <p className="text-xs opacity-40 font-mono italic">No transactions yet. Start earning LOVE.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((entry, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-mono p-2 rounded bg-white/5 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className={entry.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {entry.delta >= 0 ? '+' : ''}{entry.delta}
                  </span>
                  <span className="opacity-70">{entry.kind}</span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.signature && (
                    <span className="text-[8px] font-mono opacity-20">
                      {entry.signature.substring(0, 8)}…
                    </span>
                  )}
                  <span className="opacity-40 text-[10px]">{relativeTime(entry.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
