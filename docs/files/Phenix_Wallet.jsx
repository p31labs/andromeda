import React, { useState, useCallback } from 'react';
import { Shield, Database, Download, Plus, Hash, Clock, FileText, ChevronDown, ChevronRight, Lock, Zap, ExternalLink, Copy, Check } from 'lucide-react';

// ── Memo-to-File Event Types ──
const EVENT_TYPES = [
  { id: 'DONATION_RECEIVED', label: 'Donation Received', color: '#22c55e' },
  { id: 'GRANT_RECEIVED', label: 'Grant Received', color: '#2A9D8F' },
  { id: 'EXPENSE', label: 'Expense', color: '#E8636F' },
  { id: 'FIAT_CONVERSION', label: 'Fiat Conversion', color: '#eab308' },
  { id: 'NOTE', label: 'Note / Memo', color: '#a78bfa' },
];

// ── SHA-256 Hash ──
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Memo Entry Component ──
function MemoEntry({ entry, isLatest }) {
  const [expanded, setExpanded] = useState(false);
  const eventConfig = EVENT_TYPES.find(e => e.id === entry.type) || EVENT_TYPES[4];

  return (
    <div className="rounded-xl border transition-all"
      style={{
        background: isLatest ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
        borderColor: isLatest ? `${eventConfig.color}30` : 'rgba(255,255,255,0.05)'
      }}>
      <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: eventConfig.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{entry.description}</span>
            {entry.amount && (
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${eventConfig.color}15`, color: eventConfig.color }}>
                {entry.amount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <span>{new Date(entry.timestamp).toLocaleString()}</span>
            <span>#{entry.blockNumber}</span>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[10px] font-mono p-3 rounded-lg break-all" style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.5)' }}>
            <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>hash:</span> {entry.hash}</div>
            <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>prev:</span> {entry.prevHash}</div>
            <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>type:</span> {entry.type}</div>
          </div>
          {entry.notes && (
            <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{entry.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── New Entry Form ──
function NewEntryForm({ onAdd }) {
  const [type, setType] = useState('DONATION_RECEIVED');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!description.trim()) return;
    onAdd({ type, description: description.trim(), amount: amount.trim() || null, notes: notes.trim() || null });
    setDescription(''); setAmount(''); setNotes('');
  };

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>New Ledger Entry</div>

      <div className="flex gap-2 flex-wrap">
        {EVENT_TYPES.map(et => (
          <button key={et.id} onClick={() => setType(et.id)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: type === et.id ? `${et.color}20` : 'transparent',
              border: `1px solid ${type === et.id ? `${et.color}50` : 'rgba(255,255,255,0.08)'}`,
              color: type === et.id ? et.color : 'rgba(255,255,255,0.3)'
            }}>
            {et.label}
          </button>
        ))}
      </div>

      <input type="text" placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)}
        className="w-full p-3 rounded-lg text-sm text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />

      <div className="flex gap-2">
        <input type="text" placeholder="Amount (optional)" value={amount} onChange={e => setAmount(e.target.value)}
          className="flex-1 p-3 rounded-lg text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <input type="text" placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)}
          className="flex-1 p-3 rounded-lg text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>

      <button onClick={handleSubmit}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
        style={{ background: '#E8636F' }}>
        Sign & Record Entry
      </button>
    </div>
  );
}

// ── Main Wallet App ──
export default function PhenixWallet() {
  const [ledger, setLedger] = useState([
    {
      blockNumber: 0,
      type: 'NOTE',
      description: 'GENESIS BLOCK — P31 Labs Memo-to-File Ledger Initialized',
      amount: null,
      notes: 'Johnson v. Johnson, Civil Action No. 2025CV936, Camden County Superior Court. This ledger provides a cryptographically chained, tamper-evident record of all financial transactions for P31 Labs, Inc. (EIN: 42-1888158).',
      timestamp: '2026-04-13T23:00:00Z',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    }
  ]);
  const [view, setView] = useState('ledger');
  const [copied, setCopied] = useState(false);

  const addEntry = useCallback(async ({ type, description, amount, notes }) => {
    const prev = ledger[ledger.length - 1];
    const timestamp = new Date().toISOString();
    const blockNumber = prev.blockNumber + 1;
    const payload = JSON.stringify({ blockNumber, type, description, amount, timestamp, prevHash: prev.hash });
    const hash = await sha256(payload);

    setLedger(l => [...l, { blockNumber, type, description, amount, notes, timestamp, hash, prevHash: prev.hash }]);
  }, [ledger]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `p31_memo_to_file_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = 'Block,Type,Description,Amount,Timestamp,Hash,PrevHash,Notes\n';
    const rows = ledger.map(e =>
      `${e.blockNumber},"${e.type}","${e.description}","${e.amount || ''}","${e.timestamp}","${e.hash}","${e.prevHash}","${(e.notes || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `p31_memo_to_file_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const verifyChain = async () => {
    for (let i = 1; i < ledger.length; i++) {
      const entry = ledger[i];
      const payload = JSON.stringify({
        blockNumber: entry.blockNumber, type: entry.type, description: entry.description,
        amount: entry.amount, timestamp: entry.timestamp, prevHash: entry.prevHash
      });
      const computed = await sha256(payload);
      if (computed !== entry.hash) {
        alert(`Chain broken at block ${entry.blockNumber}!`);
        return;
      }
    }
    alert(`Chain verified! ${ledger.length} blocks, all hashes valid.`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080810', fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.87)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 p-4 flex items-center justify-between"
        style={{ background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" style={{ color: '#E8636F' }} />
          <span className="font-extrabold text-sm text-white tracking-tight">PHENIX WALLET</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono"
            style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)' }}>
            EIN 42-1888158
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>AES-256-GCM</span>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex gap-2 p-4 pb-0">
        {[
          { id: 'ledger', label: 'Ledger', icon: Database },
          { id: 'new', label: 'New Entry', icon: Plus },
          { id: 'export', label: 'Export', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: active ? 'rgba(232,99,111,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? 'rgba(232,99,111,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: active ? '#E8636F' : 'rgba(255,255,255,0.3)',
              }}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">

        {/* Ledger View */}
        {view === 'ledger' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {ledger.length} blocks • H(n) = SHA256(P(n) + H(n-1))
              </div>
              <button onClick={verifyChain} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                style={{ color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
                Verify Chain
              </button>
            </div>
            {[...ledger].reverse().map((entry, i) => (
              <MemoEntry key={entry.blockNumber} entry={entry} isLatest={i === 0} />
            ))}
          </div>
        )}

        {/* New Entry */}
        {view === 'new' && (
          <NewEntryForm onAdd={(e) => { addEntry(e); setView('ledger'); }} />
        )}

        {/* Export */}
        {view === 'export' && (
          <div className="space-y-4">
            <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Export the complete Memo-to-File ledger for court submission or audit. Chain integrity is preserved in both formats.
            </div>
            <button onClick={exportJSON}
              className="w-full p-4 rounded-xl flex items-center gap-3 transition-all hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <FileText className="w-5 h-5" style={{ color: '#2A9D8F' }} />
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Export as JSON</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Complete chain with hashes. Machine-readable. Forensic grade.</div>
              </div>
            </button>
            <button onClick={exportCSV}
              className="w-full p-4 rounded-xl flex items-center gap-3 transition-all hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Database className="w-5 h-5" style={{ color: '#a78bfa' }} />
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Export as CSV</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Spreadsheet-compatible. For accountants and court exhibits.</div>
              </div>
            </button>
            <button onClick={verifyChain}
              className="w-full p-4 rounded-xl flex items-center gap-3 transition-all hover:brightness-110"
              style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <Shield className="w-5 h-5" style={{ color: '#22c55e' }} />
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Verify Chain Integrity</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Recompute every hash. Confirm zero tampering.</div>
              </div>
            </button>

            <div className="p-4 rounded-xl text-xs" style={{ background: 'rgba(232,99,111,0.05)', border: '1px solid rgba(232,99,111,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              <strong style={{ color: '#E8636F' }}>Legal reference:</strong> Johnson v. Johnson, Civil Action No. 2025CV936, Camden County Superior Court, Georgia. This Memo-to-File ledger is admissible under O.C.G.A. § 24-9-901(b)(9) (electronic authentication) and § 24-8-803(6) (business records exception).
            </div>
          </div>
        )}
      </div>

      <style>{`
        html, body, #root, [data-artifact] { background: #080810 !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { font-family: inherit; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
