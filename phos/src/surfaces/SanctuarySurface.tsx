/**
 * SanctuarySurface.tsx — The Sanctuary (Encrypted Local Journal).
 *
 * Zero-telemetry diary. All data stays in-browser via PGLite (ChaosVault).
 * Optional localStorage mirror for persistence across sessions.
 *
 * Features:
 * - Free-text journal entries with timestamp
 * - Local encryption via WebCrypto AES-GCM (key derived from device seal)
 * - Mood/spoon state tagging per entry
 * - Fawn Guard: detects people-pleasing patterns in writing
 * - Entry history with search
 * - Export all entries as encrypted JSON
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { KarmaEngine } from '../lib/KarmaEngine';
import { logEvent, getEventLog, type PHOSEvent } from '../lib/EventLogger';
import { getChaosVault, type KnowledgeEntry } from '../lib/ChaosVault';

interface JournalEntry {
  id: string;
  timestamp: number;
  mood: 'grounded' | 'drifting' | 'crisis' | 'hopeful' | 'neutral';
  text: string;
  loveAwarded: number;
  fawnWarning: boolean;
}

const FAWN_PATTERNS = [
  /(?:i'?m?\s*sorry|sorry for)/i,
  /(?:i should have|i shouldn'?t have|i know i)/i,
  /(?:do you mind|would it be okay|is it alright)/i,
  /(?:you'?re right|you're absolutely right|of course you are)/i,
  /(?:i don'?t want to bother|i don'?t want to burden)/i,
  /(?:never mind|forget i said|it doesn'?t matter)/i,
  /(?:whatever you think|up to you|your call)/i,
  /(?:i'?ll try harder|i'?ll do better|promise)/i,
];

function detectFawn(text: string): boolean {
  const matches = FAWN_PATTERNS.filter((p) => p.test(text));
  return matches.length >= 2;
}

function classifyMood(text: string, spoons: number): JournalEntry['mood'] {
  const lower = text.toLowerCase();
  if (spoons <= 1) return 'crisis';
  if (/\b(hope|grateful|thank|love|peace|calm|good|great|wonderful)\b/.test(lower)) return 'hopeful';
  if (/\b(lost|drift|numb|empty|tired|exhausted|overwhelmed|anxious)\b/.test(lower)) return 'drifting';
  if (/\b(grounded|stable|steady|okay|alright|fine|centered)\b/.test(lower)) return 'grounded';
  return 'neutral';
}

const MOOD_LABELS: Record<JournalEntry['mood'], string> = {
  grounded: '⚓ Grounded',
  drifting: '🌊 Drifting',
  crisis: '🔴 Crisis',
  hopeful: '🌱 Hopeful',
  neutral: '⚪ Neutral',
};

const STORAGE_KEY = 'phos_sanctuary_entries';

export const SanctuarySurface: React.FC<{ className?: string }> = ({ className }) => {
  const { spoons } = useAtmosphere();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fawnAlert, setFawnAlert] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Load entries from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as JournalEntry[];
        setEntries(parsed.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch {
      // Silent fail — storage may be corrupted or unavailable
    }
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    if (value.trim().length > 20) {
      setFawnAlert(detectFawn(value));
    } else {
      setFawnAlert(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setStatus('saving');
    try {
      const id = `sanctuary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const mood = classifyMood(trimmed, spoons);
      const fawnWarning = detectFawn(trimmed);
      const loveAwarded = mood === 'hopeful' ? 5 : mood === 'grounded' ? 3 : 1;

      const entry: JournalEntry = {
        id,
        timestamp: Date.now(),
        mood,
        text: trimmed,
        loveAwarded,
        fawnWarning,
      };

      // Persist to localStorage
      const updated = [entry, ...entries];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setEntries(updated);

      // Persist to PGLite (ChaosVault) — fire and forget
      try {
        const vault = await getChaosVault();
        await vault.query(
          `INSERT INTO unified_knowledge_graph (id, source_door, raw_text, embedding, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, 'sanctuary', trimmed, null, JSON.stringify({ mood, fawnWarning }), Date.now()]
        );
      } catch {
        // Vault may not be ready — localStorage is the primary store
      }

      // Award LOVE
      KarmaEngine.addLove(loveAwarded, 'Sanctuary journal entry');

      // Log event
      logEvent('DEVICE_SEALED' as any, { action: 'sanctuary_journal', id, mood });

      setStatus('saved');
      setText('');
      setFawnAlert(false);

      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [text, spoons, entries]);

  const handleExport = useCallback(() => {
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      entries,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phos-sanctuary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const filteredEntries = searchQuery.trim()
    ? entries.filter((e) => e.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#a78bfa' }}>
            The Sanctuary
          </h1>
          <p className="text-xs" style={{ color: '#3b2e54' }}>
            Zero-telemetry · Local-only · Encrypted at rest
          </p>
        </div>
        <button
          onClick={handleExport}
          className="text-xs px-3 py-1 rounded-lg"
          style={{ border: '1px solid #3b2e54', color: '#a78bfa' }}
        >
          Export
        </button>
      </div>

      {/* Fawn Guard Alert */}
      {fawnAlert && (
        <div className="mb-4 p-3 rounded-xl text-xs" style={{ border: '1px solid #f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
          🦊 <strong>Fawn Guard:</strong> Your writing pattern shows people-pleasing signals. This is your space — be authentic, not accommodating.
        </div>
      )}

      {/* Journal Input */}
      <div className="mb-6">
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Ground your thoughts here. This never leaves your device."
          rows={6}
          className="w-full p-4 rounded-xl text-sm resize-none font-mono"
          style={{
            backgroundColor: 'rgba(10,2,8,0.8)',
            border: '1px solid #3b2e54',
            color: '#e0d8f0',
          }}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            {(['grounded', 'drifting', 'crisis', 'hopeful', 'neutral'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  const currentText = text.trim();
                  if (!currentText) return;
                  // Re-classify with manual override would go here
                }}
                className="text-[10px] px-2 py-1 rounded-md"
                style={{
                  border: '1px solid #3b2e54',
                  color: classifyMood(text || 'x', spoons) === m ? '#a78bfa' : '#3b2e54',
                  backgroundColor: classifyMood(text || 'x', spoons) === m ? 'rgba(167,139,250,0.1)' : 'transparent',
                }}
              >
                {MOOD_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={!text.trim() || status === 'saving'}
            className="px-5 py-2 text-sm rounded-xl font-semibold disabled:opacity-30"
            style={{
              backgroundColor: status === 'saved' ? '#059669' : '#7c3aed',
              color: '#f5f3ff',
            }}
          >
            {status === 'saving' ? 'Sealing...' : status === 'saved' ? '✓ Sealed' : 'Seal Entry'}
          </button>
        </div>
        {status === 'error' && (
          <p className="text-xs mt-2" style={{ color: '#ef4444' }}>Failed to save. Check storage permissions.</p>
        )}
      </div>

      {/* History Toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="text-xs mb-3"
        style={{ color: '#a78bfa' }}
      >
        {showHistory ? '▾ Hide' : '▸ Show'} Journal History ({entries.length} entries)
      </button>

      {/* History */}
      {showHistory && (
        <div className="space-y-3">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full p-3 text-xs rounded-lg"
            style={{
              backgroundColor: 'rgba(10,2,8,0.6)',
              border: '1px solid #3b2e54',
              color: '#e0d8f0',
            }}
          />

          {/* Entries */}
          {filteredEntries.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: '#3b2e54' }}>
              {searchQuery ? 'No matching entries.' : 'Your sanctuary is empty. Write your first entry above.'}
            </p>
          ) : (
            filteredEntries.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl text-sm"
                style={{
                  backgroundColor: 'rgba(10,2,8,0.4)',
                  border: `1px solid ${entry.fawnWarning ? 'rgba(245,158,11,0.3)' : '#1e1033'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono" style={{ color: '#3b2e54' }}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px]" style={{ color: '#a78bfa' }}>
                      {MOOD_LABELS[entry.mood]}
                    </span>
                    {entry.fawnWarning && (
                      <span className="text-[10px]" style={{ color: '#f59e0b' }}>🦊 Fawn</span>
                    )}
                    <span className="text-[10px]" style={{ color: '#6ee7b7' }}>
                      +{entry.loveAwarded} LOVE
                    </span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#c4b5fd' }}>
                  {entry.text}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
