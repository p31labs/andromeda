/**
 * HearthSurface.tsx - The Hearth (Family Mesh).
 *
 * Quick-log: 1-tap presets. Emergency mode at spoons <= 1.
 * SHA-256 hash-chained + HashChain ledger + ECDSA-P256 export.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { KarmaEngine } from '../lib/KarmaEngine';
import {
  getContactLog, addContactEntry, getContactSummary,
  getVisitationSchedule, setVisitationSchedule, getNextVisitation,
  exportContactLog, verifyContactChain, quickLog,
  LOVE_VALUES, QUICK_LOG_PRESETS,
  type FamilyContactEntry, type VisitationSchedule, type FamilyContactSummary,
} from '../lib/FamilyContactLog';
import { logEvent, getEventLog } from '../lib/EventLogger';

type HearthTab = 'contacts' | 'schedule' | 'bonding' | 'cage' | 'income';

interface Props {
  className?: string;
  spoons: number;
  grayRock: boolean;
  onPainAlert: () => void;
}

export const HearthSurface: React.FC<Props> = ({ className, spoons, grayRock, onPainAlert }) => {
  const [tab, setTab] = useState<HearthTab>('contacts');
  const [contacts, setContacts] = useState<FamilyContactEntry[]>([]);
  const [summary, setSummary] = useState<FamilyContactSummary | null>(null);
  const [schedule, setSchedule] = useState<VisitationSchedule[]>([]);
  const [nextVisit, setNextVisitation] = useState<{ entry: VisitationSchedule; etaMs: number } | null>(null);
  const [newChild, setNewChild] = useState<'SJ' | 'WJ'>('SJ');
  const [newType, setNewType] = useState<FamilyContactEntry['type']>('phone_call');
  const [newDuration, setNewDuration] = useState(15);
  const [newInitiated, setNewInitiated] = useState<'parent' | 'child' | 'court_ordered'>('parent');
  const [newNotes, setNewNotes] = useState('');
  const [chainStatus, setChainStatus] = useState<{ valid: boolean; anchored: number } | null>(null);
  const [showVerifyResult, setShowVerifyResult] = useState(false);

  useEffect(function() { refresh(); var i = setInterval(refresh, 60000); return function() { return clearInterval(i); }; }, [refresh]);

  useEffect(() => {
    const checkPain = () => {
      try {
        const raw = localStorage.getItem('phos_event_log');
        if (raw) {
          const events = JSON.parse(raw);
          const hasSeverePain = events.some((e: { type: string; data?: { painLevel?: number } }) => e.type === 'PAIN_LOGGED' && e.data && typeof e.data.painLevel === 'number' && e.data.painLevel >= 7);
          if (hasSeverePain) {
            onPainAlert();
            return true;
          }
        }
      } catch (e) { /* malformed */ }
      return false;
    };
    if (checkPain()) return;
    const interval = setInterval(() => { if (checkPain()) clearInterval(interval); }, 500);
    return () => clearInterval(interval);
  }, [onPainAlert]);

  const handleQuickLog = useCallback(async (idx: number) => {
    const preset = QUICK_LOG_PRESETS[idx];
    const entry = await quickLog(preset);
    KarmaEngine.addLove(LOVE_VALUES[preset.type], 'Quick: ' + preset.label);
    logEvent('FAMILY_CONTACT', { contactId: entry.id, child: entry.child, type: entry.type, durationMin: entry.durationMin, initiatedBy: entry.initiatedBy, quickLog: true });
    refresh();
  }, [refresh]);

  const handleLogContact = useCallback(async () => {
    const entry = await addContactEntry({ timestamp: Date.now(), iso8601: new Date().toISOString(), child: newChild, type: newType, durationMin: newDuration, initiatedBy: newInitiated, notes: newNotes.trim(), loveAwarded: LOVE_VALUES[newType] });
    KarmaEngine.addLove(LOVE_VALUES[newType], 'Family contact: ' + newType + ' with ' + newChild);
    logEvent('FAMILY_CONTACT', { contactId: entry.id, child: newChild, type: newType, durationMin: newDuration, initiatedBy: newInitiated });
    setNewNotes(''); refresh();
  }, [newChild, newType, newDuration, newInitiated, newNotes, refresh]);

  const handleExport = useCallback(async () => {
    const data = await exportContactLog();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'p31-family-contact-log-' + new Date().toISOString().split('T')[0] + '.json';
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const handleVerifyChain = useCallback(async () => {
    const result = await verifyContactChain();
    setChainStatus({ valid: result.valid, anchored: result.anchoredEntries });
    setShowVerifyResult(true);
    setTimeout(() => setShowVerifyResult(false), 5000);
  }, []);

  const handleAddSchedule = useCallback(() => {
    const ns: VisitationSchedule = { id: 'vis_' + Date.now(), type: 'phone_call', dayOfWeek: new Date().getDay(), startTime: '17:00', durationMin: 30, supervised: false, courtOrderRef: '2025CV936' };
    const u = [...schedule, ns]; setVisitationSchedule(u); setSchedule(u);
  }, [schedule]);

  const handleRemoveSchedule = useCallback((id: string) => {
    const u = schedule.filter(s => s.id !== id); setVisitationSchedule(u); setSchedule(u);
  }, [schedule]);

  if (grayRock || spoons === 0) {
    return (
      <div className={className}>
        <p className="text-xs opacity-50">Hearth suspended.</p>
      </div>
    );
  }

  const formatEta = (ms: number) => {
    if (ms <= 0) return 'Now';
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return days + 'd ' + (hours % 24) + 'h';
    return hours + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
  };

  const formatTs = (ts: number) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const initClr = (by: string) => {
    if (by === 'parent') return { bg: 'rgba(255,107,107,0.2)', fg: '#ff6b6b' };
    if (by === 'child') return { bg: 'rgba(167,139,250,0.2)', fg: '#a78bfa' };
    return { bg: 'rgba(245,158,11,0.2)', fg: '#f59e0b' };
  };

  const tabBtn = (key: HearthTab, label: string) => (
    <button key={key} onClick={() => setTab(key)} className="flex-1 py-2 text-[10px] rounded-lg"
      style={{ backgroundColor: tab === key ? 'rgba(255,107,107,0.15)' : 'transparent',
        border: '1px solid ' + (tab === key ? 'rgba(255,107,107,0.3)' : 'rgba(102,68,68,0.2)'),
        color: tab === key ? '#ff6b6b' : '#664444' }}>
      {label}
    </button>
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#ff6b6b' }}>The Hearth</h1>
          <p className="text-[10px]" style={{ color: '#664444' }}>Family mesh \u2014 SHA-256 hash-chained \u2014 Court-admissible logs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleVerifyChain} className="text-[10px] px-3 py-1 rounded-lg" style={{ border: '1px solid #664444', color: '#ffa07a' }}>Verify Chain</button>
          <button onClick={handleExport} className="text-[10px] px-3 py-1 rounded-lg" style={{ border: '1px solid #664444', color: '#ff6b6b' }}>Export Legal Log</button>
        </div>
      </div>

      {showVerifyResult && chainStatus && (
        <div className="mb-3 p-2 rounded-lg text-[10px] flex items-center gap-2"
          style={{ backgroundColor: chainStatus.valid ? 'rgba(110,231,183,0.1)' : 'rgba(255,107,107,0.1)',
            border: '1px solid ' + (chainStatus.valid ? 'rgba(110,231,183,0.3)' : 'rgba(255,107,107,0.3)') }}>
          <span style={{ color: chainStatus.valid ? '#6ee7b7' : '#ff6b6b' }}>
            {chainStatus.valid ? '\u2713 Chain valid' : '\u2717 Chain broken'}
          </span>
          <span style={{ color: '#664444' }}>\u00b7 {chainStatus.anchored} entries anchored</span>
        </div>
      )}

      {spoons <= 1 && (
        <div className="mb-3 p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <div className="text-[9px] mb-1.5" style={{ color: '#ffa07a' }}>\u26a1 Emergency Quick Log (1-tap)</div>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_LOG_PRESETS.map((p, i) => (
              <button key={i} onClick={() => handleQuickLog(i)}
                className="px-2 py-1 text-[9px] rounded-lg font-medium active:scale-95"
                style={{ backgroundColor: 'rgba(255,107,107,0.2)', border: '1px solid rgba(255,107,107,0.3)', color: '#f0d0d0' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {nextVisit && (
        <div className="mb-4 p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <div className="flex items-center justify-between">
            <span style={{ color: '#ff6b6b' }}>
              Next: {nextVisit.entry.type.replace('_', ' ')} \u00b7 {dayNames[nextVisit.entry.dayOfWeek]} @ {nextVisit.entry.startTime}
            </span>
            <span style={{ color: '#ffa07a' }}>ETA: {formatEta(nextVisit.etaMs)}</span>
          </div>
          {nextVisit.entry.courtOrderRef && (
            <div className="text-[9px] mt-1" style={{ color: '#664444' }}>
              Court Order: {nextVisit.entry.courtOrderRef}{nextVisit.entry.supervised && ' \u2014 Supervised'}
            </div>
          )}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {[
            { l: 'Total', v: summary.totalContacts },
            { l: 'Week', v: summary.contactsThisWeek },
            { l: 'S.J.', v: summary.bySJ.count },
            { l: 'W.J.', v: summary.byWJ.count },
            { l: 'Streak', v: summary.currentStreak },
          ].map((s, i) => (
            <div key={i} className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
              <div className="text-lg font-bold" style={{ color: s.l === 'Streak' ? '#6ee7b7' : '#ff6b6b' }}>{s.v}</div>
              <div className="text-[8px]" style={{ color: '#664444' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 mb-4">
        {tabBtn('contacts', '\u24d3 Log')}
        {tabBtn('schedule', '\u24c5 Schedule')}
        {tabBtn('bonding', '\u24ae Bonding')}
        {tabBtn('cage', '\u24c7 Cage')}
        {tabBtn('income', '\u24b0 Income')}
      </div>

      {tab === 'contacts' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.6)', border: '1px solid rgba(102,68,68,0.3)' }}>
            <div className="text-[10px] mb-2" style={{ color: '#ffa07a' }}>Quick Log (1 tap)</div>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_LOG_PRESETS.map((p, i) => (
                <button key={i} onClick={() => handleQuickLog(i)}
                  className="p-2 text-center rounded-lg text-[10px] font-medium active:scale-95"
                  style={{ backgroundColor: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.2)', color: '#f0d0d0' }}>
                  <div>{p.label}</div>
                  <div className="text-[8px]" style={{ color: '#6ee7b7' }}>+{LOVE_VALUES[p.type]} LOVE</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.6)', border: '1px solid rgba(102,68,68,0.2)' }}>
            <div className="text-[10px] mb-2" style={{ color: '#996666' }}>Detailed Log</div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <select value={newChild} onChange={e => setNewChild(e.target.value as 'SJ' | 'WJ')}
                className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }}>
                <option value="SJ">S.J.</option><option value="WJ">W.J.</option>
              </select>
              <select value={newType} onChange={e => setNewType(e.target.value as FamilyContactEntry['type'])}
                className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }}>
                <option value="phone_call">Phone</option><option value="video_call">Video</option>
                <option value="in_person_visit">Visit</option><option value="bonding_game">BONDING</option>
                <option value="message">Msg</option><option value="other">Other</option>
              </select>
              <input type="number" value={newDuration} onChange={e => setNewDuration(parseInt(e.target.value) || 0)}
                placeholder="Min" className="p-1.5 text-[10px] rounded"
                style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }} />
              <select value={newInitiated} onChange={e => setNewInitiated(e.target.value as 'parent' | 'child' | 'court_ordered')}
                className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }}>
                <option value="parent">Parent</option><option value="child">Child</option><option value="court_ordered">Court</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)}
                placeholder="Notes..." className="flex-1 p-1.5 text-[10px] rounded"
                style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }} />
              <button onClick={handleLogContact}
                className="px-4 py-1.5 text-[10px] rounded-lg font-semibold"
                style={{ backgroundColor: '#ff6b6b', color: '#0a0505' }}>LOG</button>
            </div>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: '#664444' }}>No contacts logged yet.</p>
          ) : contacts.slice(0, 15).map(c => {
            const ic = initClr(c.initiatedBy);
            return (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl text-xs"
                style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.2)' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold" style={{ color: '#ff6b6b' }}>{c.child}</span>
                    <span style={{ color: '#f0d0d0' }}>{c.type.replace('_', ' ')}</span>
                    <span style={{ color: '#664444' }}>{c.durationMin}min</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: ic.bg, color: ic.fg }}>{c.initiatedBy}</span>
                    {c.chainEventId && (
                      <span className="text-[8px] px-1 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(110,231,183,0.15)', color: '#6ee7b7' }}>
                        Chained
                      </span>
                    )}
                  </div>
                  {c.notes && <p className="text-[10px]" style={{ color: '#996666' }}>{c.notes}</p>}
                </div>
                <div className="text-right">
                  <div className="text-[9px]" style={{ color: '#664444' }}>{formatTs(c.timestamp)}</div>
                  <div className="text-[9px]" style={{ color: '#6ee7b7' }}>+{c.loveAwarded} LOVE</div>
                  {c.hash && (
                    <div className="text-[8px] mt-0.5" style={{ color: '#443333' }} title={c.hash}>
                      {c.hash.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: '#664444' }}>Court-ordered schedule (Camden County)</span>
            <button onClick={handleAddSchedule} className="text-[10px] px-3 py-1 rounded-lg"
              style={{ border: '1px solid #664444', color: '#ff6b6b' }}>+ Add</button>
          </div>
          {schedule.length === 0 ? (
            <div className="p-4 rounded-xl text-center" style={{ border: '1px dashed #664444' }}>
              <p className="text-xs mb-2" style={{ color: '#664444' }}>No schedule configured.</p>
            </div>
          ) : schedule.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.2)' }}>
              <div className="flex-1 text-xs">
                <span style={{ color: '#ff6b6b' }}>{s.type.replace('_', ' ')}</span>
                <span style={{ color: '#664444' }}> \u00b7 {dayNames[s.dayOfWeek]} @ {s.startTime} \u00b7 {s.durationMin}min</span>
                {s.supervised && <span style={{ color: '#f59e0b' }}> \u2014 Supervised</span>}
                {s.courtOrderRef && <span style={{ color: '#999966' }}> \u2014 {s.courtOrderRef}</span>}
              </div>
              <button onClick={() => handleRemoveSchedule(s.id)}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: '#664444', border: '1px solid #664444' }}>X</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'bonding' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.3)' }}>
            <div className="text-xs mb-2" style={{ color: '#ff6b6b' }}>BONDING Family Sessions</div>
            <p className="text-[10px] mb-3" style={{ color: '#664444' }}>
              Every atom placed generates SHA-256 timestamped parental engagement logs anchored to HashChain.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{summary?.bySJ.count || 0}</div>
                <div className="text-[9px]" style={{ color: '#664444' }}>S.J.</div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#ffa07a' }}>{summary?.byWJ.count || 0}</div>
                <div className="text-[9px]" style={{ color: '#664444' }}>W.J.</div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#6ee7b7' }}>
                  {(summary?.bySJ.loveAwarded || 0) + (summary?.byWJ.loveAwarded || 0)}
                </div>
                <div className="text-[9px]" style={{ color: '#664444' }}>LOVE</div>
              </div>
            </div>
          </div>
          {contacts.filter(c => c.type === 'bonding_game').slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(10,5,5,0.3)' }}>
              <span className="font-semibold" style={{ color: '#ff6b6b' }}>{c.child}</span>
              <span style={{ color: '#664444' }}>{c.durationMin}min</span>
              <span className="text-[9px]" style={{ color: '#6ee7b7' }}>+{c.loveAwarded}</span>
              <span className="text-[9px]" style={{ color: '#664444' }}>{formatTs(c.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'cage' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.3)' }}>
            <div className="text-xs mb-2" style={{ color: '#ff6b6b' }}>Family Cage \u2014 K4 Agent Mesh</div>
            <div className="space-y-2">
              {[
                { n: 'SJ', a: 'scholar', c: '#a78bfa' },
                { n: 'WJ', a: 'scribe', c: '#c4b5fd' },
              ].map(ch => (
                <div key={ch.n} className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ backgroundColor: ch.c + '08', border: '1px solid ' + ch.c + '30' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.c }} />
                  <span className="text-xs font-semibold" style={{ color: ch.c }}>{ch.n}</span>
                  <span className="text-[10px] flex-1" style={{ color: '#664444' }}>Agent: {ch.a}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(102,68,68,0.3)', color: '#996666' }}>Mesh Pending</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'income' && (
        <IncomeTab />
      )}

      {spoons <= 1 && (
        <div className="mt-4 p-3 rounded-xl text-xs"
          style={{ border: '1px solid rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.08)' }}>
          <span style={{ color: '#ff6b6b' }}>Low spoons.</span>
          <span style={{ color: '#664444' }}> Use the emergency quick-log buttons above.</span>
        </div>
      )}
    </div>
  );
};

function IncomeTab() {
  const [balanceCents, setBalanceCents] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [todayCents, setTodayCents] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { getBalanceCents, getTransactions, getDailyTotal } = await import('../lib/ForgeLedger');
        const siteId = localStorage.getItem('phos_site_id') || 'default';
        const bal = await getBalanceCents(siteId);
        setBalanceCents(bal);
        const txs = await getTransactions(100);
        setTxCount(txs.length);
        const today = new Date().toISOString().split('T')[0];
        const daily = await getDailyTotal(today);
        setTodayCents(daily?.revenueCents || 0);
      } catch {
        /* ForgeLedger not initialized yet */
      }
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.3)' }}>
        <div className="text-xs mb-3" style={{ color: '#ff6b6b' }}>Revenue Dashboard</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>
              ${balanceCents > 0 ? (balanceCents / 100).toFixed(2) : '0.00'}
            </div>
            <div className="text-[9px]" style={{ color: '#664444' }}>Total</div>
          </div>
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#ffa07a' }}>{txCount}</div>
            <div className="text-[9px]" style={{ color: '#664444' }}>Transactions</div>
          </div>
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#6ee7b7' }}>
              ${todayCents > 0 ? (todayCents / 100).toFixed(2) : '0.00'}
            </div>
            <div className="text-[9px]" style={{ color: '#664444' }}>Today</div>
          </div>
        </div>
      </div>
      <div className="p-3 rounded-xl text-[10px] text-center"
        style={{ border: '1px dashed rgba(102,68,68,0.3)', color: '#664444' }}>
        Connect Stripe Terminal or record POS transactions in the Forge to see live revenue data.
        All amounts are stored as integer cents — zero floating-point drift.
      </div>
    </div>
  );
}

export default HearthSurface;
