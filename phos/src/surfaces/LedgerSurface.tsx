import React, { useState, useEffect, useCallback } from 'react';
import { KarmaEngine, toDollars, type LoveTransaction } from '../lib/KarmaEngine';
import { getEventLog, type PHOSEvent } from '../lib/EventLogger';

interface Props { className?: string; }

export const LedgerSurface: React.FC<Props> = ({ className }) => {
  const [balanceCents, setBalanceCents] = useState(0);
  const [transactions, setTransactions] = useState<LoveTransaction[]>([]);
  const [events, setEvents] = useState<PHOSEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  const loadData = useCallback(() => {
    setBalanceCents(KarmaEngine.getBalanceCents());
    setTransactions(KarmaEngine.getHistory().reverse());
    setEvents(getEventLog().reverse());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredTransactions = filter.trim()
    ? transactions.filter((t) =>
        t.reason.toLowerCase().includes(filter.toLowerCase()) ||
        String(t.amountCents).includes(filter)
      )
    : transactions;

  const filteredEvents = filter.trim()
    ? events.filter((e) =>
        e.type.toLowerCase().includes(filter.toLowerCase()) ||
        Object.values(e.data).some((v) =>
          String(v).toLowerCase().includes(filter.toLowerCase())
        )
      )
    : events;

  const txPage = filteredTransactions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const txPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-6">L.O.V.E. Ledger</h2>

      <div className="p-6 rounded-2xl bg-black/30 border border-white/10 text-center mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Balance</div>
        <div className="text-5xl font-bold text-amber-400">${toDollars(balanceCents)}</div>
        <div className="text-xs text-gray-600 mt-1">Ledger of Ontological Volume and Entropy</div>
        <div className="text-[10px] text-gray-600 mt-1">{transactions.length} transactions · Live refresh 5s</div>
      </div>

      <div className="mb-4">
        <input type="text" value={filter} onChange={(e) => { setFilter(e.target.value); setCurrentPage(0); }}
          placeholder="Filter by type, reason, event..."
          className="w-full p-2 text-xs rounded-lg bg-black/30 border border-white/10 text-gray-300 placeholder-gray-600" />
      </div>

      <div className="mb-6">
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">
          Transactions {filter ? `(${filteredTransactions.length})` : ''}
        </h3>
        {txPage.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-4">
            {filter ? 'No matching transactions.' : 'No transactions yet.'}
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {txPage.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                  <span className={`font-mono text-xs ${t.amountCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.amountCents >= 0 ? '+' : ''}{t.amountCents}
                  </span>
                  <span className="flex-1 text-gray-400 truncate">{t.reason}</span>
                  <span className="text-xs text-gray-600">{new Date(t.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            {txPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
                  className="px-2 py-1 text-[10px] rounded bg-white/5 text-gray-400 disabled:opacity-30">← Prev</button>
                <span className="text-[10px] text-gray-500">Page {currentPage + 1}/{txPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(txPages - 1, p + 1))} disabled={currentPage >= txPages - 1}
                  className="px-2 py-1 text-[10px] rounded bg-white/5 text-gray-400 disabled:opacity-30">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">
          System Events {filter ? `(${filteredEvents.length})` : ''}
        </h3>
        {filteredEvents.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-4">
            {filter ? 'No matching events.' : 'No events logged.'}
          </div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredEvents.slice(0, 20).map((e) => (
              <div key={e.id} className="flex items-center gap-2 p-1.5 rounded text-xs">
                <span className="font-mono text-gray-500 w-16 shrink-0">
                  {e.timestamp.split('T')[1]?.slice(0, 8) || '—'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 ${
                  e.type === 'ERROR' ? 'bg-red-900/50 text-red-400' :
                  e.type === 'GUARDIAN_ACTIVATED' ? 'bg-red-900/50 text-red-400' :
                  e.type === 'SPOON_STATE_CHANGED' ? 'bg-amber-900/50 text-amber-400' :
                  'bg-white/5 text-gray-500'
                }`}>{e.type}</span>
                <span className="text-gray-500 truncate text-[10px]">
                  {Object.entries(e.data).map(([k, v]) => `${k}=${v}`).join(' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerSurface;
