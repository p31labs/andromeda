/**
 * LedgerSurface.tsx — L.O.V.E. Economy + Event Log viewer.
 *
 * Reads from localStorage-based EventLogger and KarmaEngine.
 * Displays LOVE balance, recent transactions, and recent system events.
 */

import React, { useState, useEffect } from 'react';
import { KarmaEngine, type LoveTransaction } from '../lib/KarmaEngine';
import { getEventLog, type PHOSEvent } from '../lib/EventLogger';

interface Props {
  className?: string;
}

export const LedgerSurface: React.FC<Props> = ({ className }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<LoveTransaction[]>([]);
  const [events, setEvents] = useState<PHOSEvent[]>([]);

  useEffect(() => {
    setBalance(KarmaEngine.getBalance());
    setTransactions(KarmaEngine.getHistory().slice(-20).reverse());
    setEvents(getEventLog().slice(-20).reverse());
  }, []);

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-6">L.O.V.E. Ledger</h2>

      {/* Balance */}
      <div className="p-6 rounded-2xl bg-black/30 border border-white/10 text-center mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Balance</div>
        <div className="text-5xl font-bold text-amber-400">{balance.toFixed(2)}</div>
        <div className="text-xs text-gray-600 mt-1">Ledger of Ontological Volume and Entropy</div>
      </div>

      {/* Recent Transactions */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-4">No transactions yet.</div>
        ) : (
          <div className="space-y-1">
            {transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                <span className={`font-mono text-xs ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount}
                </span>
                <span className="flex-1 text-gray-400">{t.reason}</span>
                <span className="text-xs text-gray-600">{new Date(t.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div>
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">System Events</h3>
        {events.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-4">No events logged.</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 p-1.5 rounded text-xs">
                <span className="font-mono text-gray-500 w-16">{e.timestamp.split('T')[1]?.slice(0, 8) || '—'}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                  e.type === 'ERROR' ? 'bg-red-900/50 text-red-400' :
                  e.type === 'GUARDIAN_ACTIVATED' ? 'bg-red-900/50 text-red-400' :
                  e.type === 'SPOON_STATE_CHANGED' ? 'bg-amber-900/50 text-amber-400' :
                  'bg-white/5 text-gray-500'
                }`}>{e.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerSurface;
