import React, { useState, useEffect, useCallback } from 'react';
import { KarmaEngine, toDollars, type LoveTransaction } from '../lib/KarmaEngine';
import { getEventLog, type PHOSEvent } from '../lib/EventLogger';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { CompanionVoice } from '../components/bio/CompanionVoice';

// ── Treasury types from simplex-worker ──────────────────────────────────
interface TreasuryData {
  treasury_balance_cents: number;
  treasury_balance_dollars: string;
  kofi_balance: string;
  kofi_target: number;
  kofi_percent: string;
  tranche1_total_ingested_cents: number;
  tranche2_slicing_pie_settled_cents: number;
  available_for_tranche3_cents: number;
  recent_stripe_events: Array<{
    event_id: string; type: string; amount: number | null; currency: string; created_at: number;
  }>;
}

interface Props { className?: string; }

export const LedgerSurface: React.FC<Props> = ({ className }) => {
  const { spoons, grayRock } = useAtmosphere();
  const [balanceCents, setBalanceCents] = useState(0);
  const [transactions, setTransactions] = useState<LoveTransaction[]>([]);
  const [events, setEvents] = useState<PHOSEvent[]>([]);
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'love' | 'treasury'>('love');
  const PAGE_SIZE = 20;

  const loadTreasury = useCallback(async () => {
    setTreasuryLoading(true);
    try {
      const url = 'https://simplex-worker.trimtab-signal.workers.dev';
      const resp = await fetch(`${url}/api/treasury`);
      if (resp.ok) setTreasury(await resp.json() as TreasuryData);
    } catch { /* silent */ }
    setTreasuryLoading(false);
  }, []);

  const loadData = useCallback(() => {
    setBalanceCents(KarmaEngine.getBalanceCents());
    setTransactions(KarmaEngine.getHistory().reverse());
    setEvents(getEventLog().reverse());
  }, []);

  useEffect(() => {
    loadData();
    loadTreasury();
    const interval = setInterval(() => { loadData(); loadTreasury(); }, 30000);
    return () => clearInterval(interval);
  }, [loadData, loadTreasury]);

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

  if (grayRock) {
    return (
      <div className={className}>
        <div className="text-center py-12 text-zinc-500 font-mono text-sm">Ledger suspended. Gray Rock active.</div>
      </div>
    );
  }

  const showTreasury = spoons > 2;

  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold mb-6">L.O.V.E. Ledger</h2>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6">
        {[['love', '❤ L.O.V.E.']].concat(showTreasury ? [['treasury', '💰 Treasury']] : []).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as 'love' | 'treasury')}
            className={`px-4 py-2 text-xs font-mono rounded-t transition-colors ${
              activeTab === key ? 'bg-white/10 text-amber-400 border-t border-x border-white/10' : 'text-gray-500 hover:text-gray-300'
            }`}>{label}</button>
        ))}
      </div>

      {activeTab === 'love' && (<>

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
      </>)}

      {activeTab === 'treasury' && (
        <div className="space-y-4">
          {/* Treasury Balance Hero */}
          <div className="p-6 rounded-2xl bg-black/30 border border-white/10 text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Treasury Balance</div>
            <div className="text-4xl font-bold text-amber-400 font-mono">
              ${treasury?.treasury_balance_dollars ?? '0.00'}
            </div>
            <div className="text-[10px] text-gray-600 mt-1">
              {treasuryLoading ? 'Syncing...' : treasury ? `Updated ${new Date().toLocaleTimeString()}` : 'No treasury data'}
            </div>
          </div>

          {/* Tranche Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-black/20 border border-amber-500/20 text-center">
              <div className="text-[9px] uppercase tracking-wider text-amber-400 mb-1">Tranche 1</div>
              <div className="text-lg font-mono font-bold text-amber-300">${((treasury?.tranche1_total_ingested_cents ?? 0) / 100).toFixed(2)}</div>
              <div className="text-[9px] text-gray-500">Ops Payroll</div>
            </div>
            <div className="p-4 rounded-xl bg-black/20 border border-cyan-500/20 text-center">
              <div className="text-[9px] uppercase tracking-wider text-cyan-400 mb-1">Tranche 2</div>
              <div className="text-lg font-mono font-bold text-cyan-300">${((treasury?.tranche2_slicing_pie_settled_cents ?? 0) / 100).toFixed(2)}</div>
              <div className="text-[9px] text-gray-500">Slicing Pie</div>
            </div>
            <div className="p-4 rounded-xl bg-black/20 border border-purple-500/20 text-center">
              <div className="text-[9px] uppercase tracking-wider text-purple-400 mb-1">Tranche 3</div>
              <div className="text-lg font-mono font-bold text-purple-300">${((treasury?.available_for_tranche3_cents ?? 0) / 100).toFixed(2)}</div>
              <div className="text-[9px] text-gray-500">PoC Available</div>
            </div>
          </div>

          {/* Ko-fi Progress */}
          <div className="p-4 rounded-xl bg-black/20 border border-white/10">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Ko-fi Target</span>
              <span className="text-xs font-mono text-amber-400">
                ${treasury?.kofi_balance ?? '0.00'} / ${treasury?.kofi_target ?? 863} ({treasury?.kofi_percent ?? '0.0%'})
              </span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, treasury ? (parseFloat(treasury.kofi_balance) / treasury.kofi_target) * 100 : 0)}%` }} />
            </div>
          </div>

          {/* Recent Stripe Events */}
          <div>
            <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">
              Recent Stripe Events ({treasury?.recent_stripe_events?.length ?? 0})
            </h3>
            {(!treasury?.recent_stripe_events || treasury.recent_stripe_events.length === 0) ? (
              <div className="text-sm text-gray-600 text-center py-4">
                No events yet. Waiting for Stripe webhook ingestion...
              </div>
            ) : (
              <div className="space-y-1">
                {treasury.recent_stripe_events.map((evt) => (
                  <div key={evt.event_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                    <span className="font-mono text-xs text-cyan-400 w-24 shrink-0 truncate">{evt.type.replace(/\./g, ' ')}</span>
                    <span className="flex-1 text-gray-400">
                      {evt.amount ? `$${(evt.amount / 100).toFixed(2)} ${evt.currency?.toUpperCase()}` : '—'}
                    </span>
                    <span className="text-xs text-gray-600">{new Date(evt.created_at * 1000).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legal Shield Status */}
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
            <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-2">⚖ Van Camp Shield Status</div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <span className="text-gray-500">Method</span><span className="text-amber-400">Van Camp ✓</span>
              <span className="text-gray-500">Pereira Risk</span><span className="text-emerald-400">Neutralized ✓</span>
              <span className="text-gray-500">Trust Firewall</span><span className="text-emerald-400">Intact ✓</span>
              <span className="text-gray-500">Shield</span><span className="text-emerald-400">Engaged ✓</span>
            </div>
          </div>
          </div>
        )}
        {spoons >= 3 && !grayRock && (
          <CompanionVoice
            isAwake={spoons >= 3}
            calcium={8.5}
            spoons={spoons / 5}
            qmuState={spoons <= 1 ? 'critical' : spoons <= 2 ? 'low' : 'normal'}
            pendingAction={null}
            onAcknowledge={() => {}}
          />
        )}
      </div>
  );
};

export default LedgerSurface;
