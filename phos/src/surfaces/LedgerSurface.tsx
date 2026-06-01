import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { getBalance, mintCredits } from '../lib/KarmaEngine';
import { getHistory } from '../lib/EventLogger';

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
  const [balance, setBalance] = useState(getBalance());
  const [logs, setLogs] = useState(() => getHistory());

  const refresh = useCallback(() => {
    setBalance(getBalance());
    setLogs(getHistory());
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleCheckIn = () => {
    mintCredits(5, 'Daily check-in');
    refresh();
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono tracking-widest uppercase opacity-60">LOVE Ledger</h3>
        <span className="text-sm font-mono font-bold text-orange-400">{balance} LOVE</span>
      </div>

      <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
        <div className="text-2xl font-mono font-bold text-orange-300 mb-1">{balance}</div>
        <div className="text-[10px] font-mono uppercase opacity-40 mb-3">Care Economy Credits</div>
        <button
          onClick={handleCheckIn}
          className="px-4 py-2 text-xs font-mono border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-900/20 transition-all"
        >
          + Daily Check-in (+5)
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        <div className="text-[10px] font-mono uppercase opacity-40 mb-1">Transaction History</div>
        {logs.length === 0 ? (
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-xs opacity-40 font-mono">
            No transactions yet. Complete a daily check-in or journal entry to earn LOVE credits.
          </div>
        ) : (
          [...logs].reverse().map((log, index) => (
            <div key={index} className="p-2.5 rounded-lg bg-white/5 border border-white/5 font-mono text-[11px] flex justify-between items-start gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="text-cyan-400 uppercase font-bold block truncate">{log.type}</span>
                {log.message && <p className="opacity-80 text-white/70 truncate">{log.message}</p>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] opacity-30">{relativeTime(log.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
