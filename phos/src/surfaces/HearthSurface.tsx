/**
 * HearthSurface.tsx — The Hearth (Family Mesh).
 *
 * Four sub-modes:
 * 1. Contact Log — Timestamped parent-child interactions (court-admissible)
 * 2. Visitation Schedule — Court-ordered calls/visit schedule
 * 3. Bonding Sessions — Family BONDING game integration
 * 4. Family Cage — K4 agent mesh status for SJ and WJ nodes
 *
 * Legal evidence: Every contact is logged with SHA-256 hash, stored locally,
 * and exportable as FRE 902(14) compliant document.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { KarmaEngine } from '../lib/KarmaEngine';
import {
  getContactLog,
  addContactEntry,
  getContactSummary,
  getVisitationSchedule,
  setVisitationSchedule,
  getNextVisitation,
  exportContactLog,
  type FamilyContactEntry,
  type VisitationSchedule,
  type FamilyContactSummary,
} from '../lib/FamilyContactLog';
import { logEvent } from '../lib/EventLogger';

type HearthTab = 'contacts' | 'schedule' | 'bonding' | 'cage';

interface Props {
  className?: string;
  spoons: number;
  grayRock: boolean;
  onPainAlert: () => void;
}

export const HearthSurface: React.FC<Props> = ({ className, spoons, grayRock, onPainAlert }) => {
  const [tab, setTab] = useState<HearthTab>('contacts');
  const [contacts, setContacts] = useState<FamilyContactEntry[]>([]);
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [schedule, setSchedule] = useState<VisitationSchedule[]>([]);
  const [nextVisit, setNextVisit] = useState<{ entry: VisitationSchedule; etaMs: number } | null>(null);

  // New contact form
  const [newChild, setNewChild] = useState<'SJ' | 'WJ'>('SJ');
  const [newType, setNewType] = useState<FamilyContactEntry['type']>('phone_call');
  const [newDuration, setNewDuration] = useState(15);
  const [newInitiated, setNewInitiated] = useState<'parent' | 'child' | 'court_ordered'>('parent');
  const [newNotes, setNewNotes] = useState('');

  const refresh = useCallback(() => {
    setContacts(getContactLog());
    setSummary(getContactSummary());
    setSchedule(getVisitationSchedule());
    setNextVisitation(getNextVisitation());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleLogContact = useCallback(() => {
    const loveMap: Record<FamilyContactEntry['type'], number> = {
      phone_call: 5, video_call: 8, in_person_visit: 15,
      bonding_game: 10, message: 3, other: 2,
    };

    const entry = addContactEntry({
      timestamp: Date.now(),
      iso8601: new Date().toISOString(),
      child: newChild,
      type: newType,
      durationMin: newDuration,
      initiatedBy: newInitiated,
      notes: newNotes.trim(),
      loveAwarded: loveMap[newType],
    });

    KarmaEngine.addLove(loveMap[newType], `Family contact: ${newType} with ${newChild}`);
    logEvent('FAMILY_CONTACT', {
      contactId: entry.id,
      child: newChild,
      type: newType,
      durationMin: newDuration,
      initiatedBy: newInitiated,
    });

    setNewNotes('');
    refresh();
  }, [newChild, newType, newDuration, newInitiated, newNotes, refresh]);

  const handleExport = useCallback(() => {
    const data = exportContactLog();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p31-family-contact-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleAddSchedule = useCallback(() => {
    const newSchedule: VisitationSchedule = {
      id: `vis_${Date.now()}`,
      type: 'phone_call',
      dayOfWeek: new Date().getDay(),
      startTime: '17:00',
      durationMin: 30,
      supervised: false,
      courtOrderRef: '2025CV936',
    };
    const updated = [...schedule, newSchedule];
    setVisitationSchedule(updated);
    setSchedule(updated);
  }, [schedule]);

  const handleRemoveSchedule = useCallback((id: string) => {
    const updated = schedule.filter((s) => s.id !== id);
    setVisitationSchedule(updated);
    setSchedule(updated);
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
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#ff6b6b' }}>
            The Hearth
          </h1>
          <p className="text-[10px]" style={{ color: '#664444' }}>
            Family mesh · Zero-telemetry · Court-admissible logs
          </p>
        </div>
        <button
          onClick={handleExport}
          className="text-[10px] px-3 py-1 rounded-lg"
          style={{ border: '1px solid #664444', color: '#ff6b6b' }}
        >
          Export Legal Log
        </button>
      </div>

      {/* Next Visitation Banner */}
      {nextVisit && (
        <div className="mb-4 p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <div className="flex items-center justify-between">
            <span style={{ color: '#ff6b6b' }}>
              Next: {nextVisit.entry.type.replace('_', ' ')} with {nextVisit.entry.type === 'in_person_visit' ? 'children' : 'S.J.'}
            </span>
            <span style={{ color: '#ffa07a' }}>
              ETA: {formatEta(nextVisit.etaMs)}
            </span>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{summary.totalContacts}</div>
            <div className="text-[9px]" style={{ color: '#664444' }}>Total Contacts</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#ffa07a' }}>{summary.contactsThisWeek}</div>
            <div className="text-[9px]" style={{ color: '#664444' }}>This Week</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{summary.bySJ.count}</div>
            <div className="text-[9px]" style={{ color: '#664444' }}>S.J.</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
            <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{summary.byWJ.count}</div>
            <div className="text-[9px]" style={{ color: '#664444' }}>W.J.</div>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'contacts', label: '📋 Log', },
          { key: 'schedule', label: '📅 Schedule' },
          { key: 'bonding', label: '🎮 Bonding' },
          { key: 'cage', label: '🔗 Cage' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 text-[10px] rounded-lg"
            style={{
              backgroundColor: tab === t.key ? 'rgba(255,107,107,0.15)' : 'transparent',
              border: `1px solid ${tab === t.key ? 'rgba(255,107,107,0.3)' : 'rgba(102,68,68,0.2)'}`,
              color: tab === t.key ? '#ff6b6b' : '#664444',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTACT LOG TAB */}
      {tab === 'contacts' && (
        <div className="space-y-3">
          {/* Quick Log Form */}
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.6)', border: '1px solid rgba(102,68,68,0.3)' }}>
            <div className="text-[10px] mb-2" style={{ color: '#ffa07a' }}>Log New Contact</div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <select value={newChild} onChange={(e) => setNewChild(e.target.value as 'SJ' | 'WJ')}
                className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }}>
                <option value="SJ">S.J.</option>
                <option value="WJ">W.J.</option>
              </select>
              <select value={newType} onChange={(e) => setNewType(e.target.value as FamilyContactEntry['type'])}
                className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }}>
                <option value="phone_call">📞 Phone</option>
                <option value="video_call">📹 Video</option>
                <option value="in_person_visit">🏠 Visit</option>
                <option value="bonding_game">🎮 BONDING</option>
                <option value="message">💬 Message</option>
                <option value="other">📝 Other</option>
              </select>
              <input type="number" value={newDuration} onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                placeholder="Min" className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }} />
              <select value={newInitiated} onChange={(e) => setNewInitiated(e.target.value as 'parent' | 'child' | 'court_ordered')}
                className="p-1.5 text-[10px] rounded" style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }}>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="court_ordered">Court</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="text" value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)..." className="flex-1 p-1.5 text-[10px] rounded"
                style={{ backgroundColor: 'rgba(10,5,5,0.8)', border: '1px solid #664444', color: '#f0d0d0' }} />
              <button onClick={handleLogContact}
                className="px-4 py-1.5 text-[10px] rounded-lg font-semibold"
                style={{ backgroundColor: '#ff6b6b', color: '#0a0505' }}>
                LOG →
              </button>
            </div>
          </div>

          {/* Contact List */}
          {contacts.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: '#664444' }}>
              No contacts logged yet. Every call, visit, and BONDING session = documented evidence.
            </p>
          ) : contacts.slice(0, 15).map((c) => (
            <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl text-xs"
              style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.2)' }}>
              <span className="text-base leading-none mt-0.5">
                {c.type === 'phone_call' ? '📞' : c.type === 'video_call' ? '📹' : c.type === 'in_person_visit' ? '🏠' : c.type === 'bonding_game' ? '🎮' : '💬'}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold" style={{ color: '#ff6b6b' }}>{c.child}</span>
                  <span style={{ color: '#664444' }}>·</span>
                  <span style={{ color: '#f0d0d0' }}>{c.type.replace('_', ' ')}</span>
                  <span style={{ color: '#664444' }}>·</span>
                  <span style={{ color: '#664444' }}>{c.durationMin}min</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: c.initiatedBy === 'parent' ? 'rgba(255,107,107,0.2)' : c.initiatedBy === 'child' ? 'rgba(167,139,250,0.2)' : 'rgba(245,158,11,0.2)',
                      color: c.initiatedBy === 'parent' ? '#ff6b6b' : c.initiatedBy === 'child' ? '#a78bfa' : '#f59e0b',
                    }}>
                    {c.initiatedBy}
                  </span>
                </div>
                {c.notes && <p className="text-[10px]" style={{ color: '#996666' }}>{c.notes}</p>}
              </div>
              <div className="text-right">
                <div className="text-[9px]" style={{ color: '#664444' }}>{formatTimestamp(c.timestamp)}</div>
                <div className="text-[9px]" style={{ color: '#6ee7b7' }}>+{c.loveAwarded} LOVE</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'schedule' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: '#664444' }}>
              Court-ordered communication schedule (Camden County)
            </span>
            <button onClick={handleAddSchedule}
              className="text-[10px] px-3 py-1 rounded-lg"
              style={{ border: '1px solid #664444', color: '#ff6b6b' }}>
              + Add
            </button>
          </div>

          {schedule.length === 0 ? (
            <div className="p-4 rounded-xl text-center" style={{ border: '1px dashed #664444' }}>
              <p className="text-xs mb-2" style={{ color: '#664444' }}>No visitation schedule configured.</p>
              <p className="text-[10px]" style={{ color: '#443333' }}>
                Add court-ordered call/visit times to track compliance and ETA.
              </p>
            </div>
          ) : schedule.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.2)' }}>
              <span className="text-base">
                {s.type === 'phone_call' ? '📞' : s.type === 'video_call' ? '📹' : '🏠'}
              </span>
              <div className="flex-1 text-xs">
                <span style={{ color: '#ff6b6b' }}>{s.type.replace('_', ' ')}</span>
                <span style={{ color: '#664444' }}> · {dayNames[s.dayOfWeek]} @ {s.startTime} · {s.durationMin}min</span>
                {s.supervised && <span style={{ color: '#f59e0b' }}> · Supervised</span>}
              </div>
              <button onClick={() => handleRemoveSchedule(s.id)}
                className="text-[10px] px-2 py-1 rounded"
                style={{ color: '#664444', border: '1px solid #664444' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* BONDING TAB */}
      {tab === 'bonding' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.3)' }}>
            <div className="text-xs mb-2" style={{ color: '#ff6b6b' }}>BONDING Family Sessions</div>
            <p className="text-[10px] mb-3" style={{ color: '#664444' }}>
              Every atom placed with S.J. or W.J. generates timestamped parental engagement logs
              and LOVE rewards. Sessions sync via the bonding-relay worker.
            </p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{summary?.bySJ.count || 0}</div>
                <div className="text-[9px]" style={{ color: '#664444' }}>S.J. Sessions</div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,107,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#ffa07a' }}>{summary?.byWJ.count || 0}</div>
                <div className="text-[9px]" style={{ color: '#664444' }}>W.J. Sessions</div>
              </div>
            </div>
          </div>

          {/* Recent bonding contacts */}
          <div className="text-[10px]" style={{ color: '#664444' }}>Recent BONDING sessions:</div>
          {contacts.filter((c) => c.type === 'bonding_game').slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(10,5,5,0.3)' }}>
              <span>🎮</span>
              <span style={{ color: '#ff6b6b' }}>{c.child}</span>
              <span style={{ color: '#664444' }}>{c.durationMin}min</span>
              {c.notes && <span className="flex-1 text-[10px]" style={{ color: '#664444' }}>{c.notes}</span>}
              <span className="text-[9px]" style={{ color: '#664444' }}>{formatTimestamp(c.timestamp)}</span>
            </div>
          ))}
          {contacts.filter((c) => c.type === 'bonding_game').length === 0 && (
            <p className="text-[10px] text-center py-4" style={{ color: '#443333' }}>
              No BONDING sessions logged yet. Play with S.J. or W.J. and log it here.
            </p>
          )}
        </div>
      )}

      {/* CAGE TAB (Family Mesh Status) */}
      {tab === 'cage' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,68,0.3)' }}>
            <div className="text-xs mb-2" style={{ color: '#ff6b6b' }}>Family Cage — K4 Agent Mesh</div>
            <p className="text-[10px] mb-3" style={{ color: '#664444' }}>
              Decentralized family communication mesh. Each family node is gated by Ed25519 authentication.
            </p>
            <div className="space-y-2">
              {[
                { node: 'SJ', agent: 'scholar', gate: 'child-mesh-unlock', color: '#a78bfa' },
                { node: 'WJ', agent: 'scribe', gate: 'child-mesh-unlock', color: '#c4b5fd' },
              ].map((child) => (
                <div key={child.node} className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ backgroundColor: `${child.color}08`, border: `1px solid ${child.color}30` }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color }} />
                  <span className="text-xs font-semibold" style={{ color: child.color }}>{child.node}</span>
                  <span className="text-[10px] flex-1" style={{ color: '#664444' }}>
                    Agent: {child.agent} · Gate: {child.gate}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(102,68,68,0.3)', color: '#996666' }}>
                    Mesh Pending
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-3" style={{ color: '#443333' }}>
              Cage wire deployment requires k4-cage CF worker with K4_MESH + K4_MESH_K4CAGE namespaces.
              Contact P31_AGENT_HUB administrator to provision child nodes.
            </p>
          </div>
        </div>
      )}

      {/* Pain Alert Integration */}
      {spoons <= 1 && (
        <div className="mt-4 p-3 rounded-xl text-xs" style={{ border: '1px solid rgba(255,107,107,0.3)', backgroundColor: 'rgba(255,107,107,0.08)' }}>
          <span style={{ color: '#ff6b6b' }}>⚠ Low spoons.</span>
          <span style={{ color: '#664444' }}> Family time may be draining. Consider logging your energy state.</span>
        </div>
      )}
    </div>
  );
};

// Type alias for the summary (re-export for component)
type ContactSummary = ReturnType<typeof getContactSummary>;

export default HearthSurface;
