// spaceship-earth/src/components/rooms/BufferRoom.tsx
// The Buffer — sovereignty over when reality arrives.
// Three zones: INGEST (voltage-scored intake), FAWN GUARD (draft checker),
// CHAOS (raw text → structured extraction).
import React, { useState, useCallback, useEffect } from 'react';
import { useNode } from '../../contexts/NodeContext';

type BufferTab = 'ingest' | 'fawn' | 'chaos';

// ── Voltage scoring ─────────────────────────────────────────

const URGENCY_RE = [
  /\basap\b/i, /\burgent\b/i, /\bimmediately\b/i, /\bright now\b/i,
  /\bdeadline\b/i, /\boverdue\b/i, /\bpast due\b/i, /\blast chance\b/i,
  /\bfinal notice\b/i, /\bcritical\b/i, /!!+/,
  /\bcourt\b/i, /\battorney\b/i, /\bhearing\b/i, /\bcustody\b/i,
];

const EMOTIONAL_RE = [
  /\bdisappointed\b/i, /\bangry\b/i, /\bfurious\b/i, /\bscared\b/i,
  /\bworried\b/i, /\bhurt\b/i, /\bbetrayed\b/i, /\bfault\b/i,
  /\bblame\b/i, /\bshame\b/i, /\bguilty\b/i, /\bvisitation\b/i,
  /\bnever\b/i, /\balways\b/i, /\beveryone knows\b/i, /\bno one\b/i,
];

const COGNITIVE_RE = [
  /\d{3,}/, /\b(schedule|calendar|appointment|meeting)\b/i,
  /\b(form|document|paperwork|filing)\b/i,
  /\b(multiple|several|various)\b/i, /\b(moreover|furthermore|however)\b/i,
];

interface VoltageScore {
  voltage: number;
  urgency: number;
  emotional: number;
  cognitive: number;
}

function scoreVoltage(text: string): VoltageScore {
  const words = text.split(/\s+/).length;
  const lengthLoad = Math.min(1, words / 200);

  let urgency = 0;
  for (const p of URGENCY_RE) if (p.test(text)) urgency += 0.15;
  urgency = Math.min(1, urgency + lengthLoad * 0.1);

  let emotional = 0;
  for (const p of EMOTIONAL_RE) if (p.test(text)) emotional += 0.12;
  // ALL CAPS words
  const caps = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase()).length;
  emotional = Math.min(1, emotional + Math.min(0.3, caps * 0.05));

  let cognitive = 0;
  for (const p of COGNITIVE_RE) if (p.test(text)) cognitive += 0.12;
  cognitive = Math.min(1, cognitive + lengthLoad * 0.3);

  const voltage = Math.min(1,
    (urgency + emotional * 0.7 + cognitive * 0.5) / 2.2
  );

  return { voltage, urgency, emotional, cognitive };
}

const VOLTAGE_COLOR = (v: number) =>
  v < 0.3 ? '#4ecdc4' : v < 0.6 ? '#f7dc6f' : '#ff6b6b';

const VOLTAGE_LABEL = (v: number) =>
  v < 0.3 ? 'CALM' : v < 0.6 ? 'MODERATE' : 'HIGH';

// ── Fawn Guard ──────────────────────────────────────────────

interface FawnFlag {
  pattern: string;
  category: 'apologizing' | 'minimizing' | 'over-agreeing' | 'seeking-validation' | 'self-erasing';
  guidance: string;
}

const FAWN_RULES: { re: RegExp; flag: FawnFlag }[] = [
  { re: /\bi'?m sorry\b/gi, flag: { pattern: "I'm sorry", category: 'apologizing', guidance: 'Is this your fault? If not, you don\'t owe an apology.' } },
  { re: /\bjust\b/gi, flag: { pattern: 'just', category: 'minimizing', guidance: '"Just" minimizes your request. Your needs aren\'t small.' } },
  { re: /\bit'?s fine\b/gi, flag: { pattern: "it's fine", category: 'self-erasing', guidance: 'Is it actually fine, or are you suppressing a boundary?' } },
  { re: /\bno worries\b/gi, flag: { pattern: 'no worries', category: 'self-erasing', guidance: 'If there ARE worries, name them.' } },
  { re: /\bi don'?t mind\b/gi, flag: { pattern: "I don't mind", category: 'self-erasing', guidance: 'Do you mind? Check before answering.' } },
  { re: /\bwhatever you (want|need|think)\b/gi, flag: { pattern: 'whatever you...', category: 'self-erasing', guidance: 'What do YOU want? State it.' } },
  { re: /\bdoes that make sense\b/gi, flag: { pattern: 'does that make sense?', category: 'seeking-validation', guidance: 'You made sense. Trust your communication.' } },
  { re: /\bi (hope|think|feel like) (that'?s?|it'?s?|this is) ok/gi, flag: { pattern: "I hope that's ok", category: 'seeking-validation', guidance: 'You don\'t need permission for your truth.' } },
  { re: /\btotally\b/gi, flag: { pattern: 'totally', category: 'over-agreeing', guidance: 'Do you actually fully agree, or are you performing agreement?' } },
  { re: /!{2,}/g, flag: { pattern: '!!', category: 'over-agreeing', guidance: 'Excessive exclamation can mask real feelings.' } },
  { re: /\bi don'?t want to (bother|burden|trouble)\b/gi, flag: { pattern: "I don't want to bother", category: 'self-erasing', guidance: 'Your needs are not a burden.' } },
  { re: /\bif that'?s? ok\b/gi, flag: { pattern: "if that's ok", category: 'seeking-validation', guidance: 'State your need. Don\'t pre-apologize for having one.' } },
];

interface FawnResult {
  flags: FawnFlag[];
  matchCount: number;
  score: number;
}

function analyzeFawn(text: string): FawnResult {
  const seen = new Map<string, FawnFlag>();
  let matchCount = 0;
  for (const { re, flag } of FAWN_RULES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      matchCount++;
      if (!seen.has(flag.pattern)) seen.set(flag.pattern, flag);
    }
  }
  const flags = [...seen.values()];
  const categories = new Set(flags.map(f => f.category));
  const score = Math.min(1, matchCount * 0.12 + categories.size * 0.1);
  return { flags, matchCount, score };
}

const CATEGORY_COLOR: Record<string, string> = {
  apologizing: '#ff6b6b',
  minimizing: '#f7dc6f',
  'over-agreeing': '#c9b1ff',
  'seeking-validation': '#f7dc6f',
  'self-erasing': '#ff6b6b',
};

// ── Chaos Ingestion ─────────────────────────────────────────

interface ExtractedItem {
  type: 'action' | 'date' | 'emotion' | 'question';
  text: string;
}

function extractFromChaos(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();
  const push = (type: ExtractedItem['type'], text: string) => {
    const key = `${type}:${text}`;
    if (!seen.has(key)) { seen.add(key); items.push({ type, text }); }
  };

  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const clean = line.replace(/^[-*•]\s*/, '');

    if (/\b(need to|have to|should|must|todo|to-do|follow up|remember to|don't forget)\b/i.test(line))
      push('action', clean);
    if (/\b(\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week|this week)\b/i.test(line))
      push('date', clean);
    if (/\?$/.test(line))
      push('question', clean);
    if (/\b(feel|felt|feeling|scared|angry|happy|sad|anxious|overwhelmed|frustrated|exhausted|grateful|hopeful)\b/i.test(line))
      push('emotion', clean);
  }
  return items;
}

const ITEM_COLOR: Record<string, string> = {
  action: '#4ecdc4', date: '#f7dc6f', emotion: '#ff9944', question: '#44aaff',
};
const ITEM_ICON: Record<string, string> = {
  action: '>', date: '@', emotion: '*', question: '?',
};

// ── Held message ────────────────────────────────────────────

interface HeldMessage {
  id: string;
  text: string;
  voltage: number;
  ingestedAt: number;
  released: boolean;
}

// ── Styles ──────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(6,10,16,0.8), rgba(6,10,16,0.6))',
  border: '1px solid rgba(40, 60, 80, 0.25)',
  borderRadius: 6,
  padding: '12px 16px',
  width: '100%',
  maxWidth: 340,
};

const ACCENT_PANEL = (color: string): React.CSSProperties => ({
  ...PANEL,
  borderLeft: `3px solid ${color}`,
});

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(78, 205, 196, 0.08)' : 'transparent',
  border: `1px solid ${active ? 'rgba(78, 205, 196, 0.3)' : 'rgba(40, 60, 80, 0.2)'}`,
  borderRadius: 4,
  padding: '6px 14px',
  color: active ? '#4ecdc4' : '#3a4a5a',
  fontSize: 10,
  letterSpacing: 1,
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
});

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(2, 4, 6, 0.8)',
  border: '1px solid rgba(40, 60, 80, 0.3)',
  borderRadius: 4,
  padding: '8px',
  color: '#c8d0dc',
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  resize: 'vertical' as const,
  outline: 'none',
  lineHeight: '1.6',
};

// ── Component ───────────────────────────────────────────────

export function BufferRoom() {
  const { spoons, tier } = useNode();
  const [tab, setTab] = useState<BufferTab>('ingest');

  // ── Ingest state ──
  const [ingestText, setIngestText] = useState('');
  const [liveScore, setLiveScore] = useState<VoltageScore | null>(null);
  const [held, setHeld] = useState<HeldMessage[]>(() => {
    try {
      const s = localStorage.getItem('p31-buffer-held');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [processedCount, setProcessedCount] = useState(0);

  // ── Fawn state ──
  const [draftText, setDraftText] = useState('');
  const [fawn, setFawn] = useState<FawnResult | null>(null);
  const [fawnAcks, setFawnAcks] = useState(0);

  // ── Chaos state ──
  const [chaosText, setChaosText] = useState('');
  const [extracted, setExtracted] = useState<ExtractedItem[]>([]);

  // Persist held queue
  useEffect(() => {
    try { localStorage.setItem('p31-buffer-held', JSON.stringify(held)); } catch {}
  }, [held]);

  // Live voltage scoring
  useEffect(() => {
    setLiveScore(ingestText.trim().length > 10 ? scoreVoltage(ingestText) : null);
  }, [ingestText]);

  // Live fawn analysis
  useEffect(() => {
    setFawn(draftText.trim().length > 5 ? analyzeFawn(draftText) : null);
  }, [draftText]);

  // Voltage threshold adapts to operator's current tier
  const threshold = tier === 'REFLEX' ? 0.2 : tier === 'PATTERN' ? 0.35 : 0.5;

  const handleIngest = useCallback(() => {
    if (!ingestText.trim() || !liveScore) return;

    if (liveScore.voltage > threshold) {
      setHeld(prev => [{
        id: Date.now().toString(36),
        text: ingestText.trim().slice(0, 500),
        voltage: liveScore.voltage,
        ingestedAt: Date.now(),
        released: false,
      }, ...prev]);
    } else {
      setProcessedCount(c => c + 1);
    }
    setIngestText('');
  }, [ingestText, liveScore, threshold]);

  const handleRelease = useCallback((id: string) => {
    setHeld(prev => prev.map(m => m.id === id ? { ...m, released: true } : m));
    setProcessedCount(c => c + 1);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setHeld(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleFawnAck = useCallback(() => { setFawnAcks(c => c + 1); }, []);

  const handleExtract = useCallback(() => {
    if (chaosText.trim()) setExtracted(extractFromChaos(chaosText));
  }, [chaosText]);

  const heldActive = held.filter(m => !m.released);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#c8d0dc',
      fontFamily: "'JetBrains Mono', monospace",
      gap: 12,
      overflow: 'auto',
      padding: '20px 16px',
      background: 'transparent',
    }}>
      <h1 style={{
        fontSize: 22, fontWeight: 300, letterSpacing: 6,
        background: 'linear-gradient(90deg, #44aaff, #4ecdc4)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        THE BUFFER
      </h1>
      <div style={{ fontSize: 9, color: '#3a5a6a', textAlign: 'center', maxWidth: 280, lineHeight: 1.6, letterSpacing: 1 }}>
        The space between stimulus and response.
      </div>

      {/* Tab bar — each tab has its own color */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{
          ...tabStyle(tab === 'ingest'),
          borderColor: tab === 'ingest' ? '#f7dc6f' : undefined,
          color: tab === 'ingest' ? '#f7dc6f' : '#3a4a5a',
          background: tab === 'ingest' ? 'rgba(247,220,111,0.08)' : 'transparent',
        }} onClick={() => setTab('ingest')}>
          INGEST{heldActive.length > 0 ? ` (${heldActive.length})` : ''}
        </button>
        <button style={{
          ...tabStyle(tab === 'fawn'),
          borderColor: tab === 'fawn' ? '#ff6b6b' : undefined,
          color: tab === 'fawn' ? '#ff6b6b' : '#3a4a5a',
          background: tab === 'fawn' ? 'rgba(255,107,107,0.08)' : 'transparent',
        }} onClick={() => setTab('fawn')}>
          FAWN GUARD
        </button>
        <button style={{
          ...tabStyle(tab === 'chaos'),
          borderColor: tab === 'chaos' ? '#ff9944' : undefined,
          color: tab === 'chaos' ? '#ff9944' : '#3a4a5a',
          background: tab === 'chaos' ? 'rgba(255,153,68,0.08)' : 'transparent',
        }} onClick={() => setTab('chaos')}>
          CHAOS
        </button>
      </div>

      {/* ════════════════ INGEST ════════════════ */}
      {tab === 'ingest' && (
        <>
          {/* Threshold status */}
          <div style={{ ...ACCENT_PANEL('#f7dc6f'), display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <div>
              <span style={{ color: '#3a4a5a' }}>threshold </span>
              <span style={{ color: VOLTAGE_COLOR(1 - threshold) }}>
                {tier === 'REFLEX' ? 'LOW (protecting)' : tier === 'PATTERN' ? 'MEDIUM' : 'HIGH (open)'}
              </span>
            </div>
            <div>
              <span style={{ color: '#3a4a5a' }}>held </span>
              <span style={{ color: heldActive.length > 0 ? '#ff6b6b' : '#4ecdc4' }}>
                {heldActive.length}
              </span>
            </div>
          </div>

          {/* Input */}
          <div style={ACCENT_PANEL('#f7dc6f')}>
            <div style={{ fontSize: 10, color: '#8a7733', marginBottom: 6, letterSpacing: 1 }}>
              PASTE INCOMING
            </div>
            <textarea
              value={ingestText}
              onChange={e => setIngestText(e.target.value)}
              placeholder="paste message, email, text..."
              rows={4}
              style={{
                ...INPUT_STYLE,
                borderColor: liveScore
                  ? `rgba(${liveScore.voltage > 0.5 ? '255,107,107' : liveScore.voltage > 0.3 ? '247,220,111' : '78,205,196'}, 0.3)`
                  : 'rgba(40, 60, 80, 0.3)',
              }}
            />

            {/* Live voltage readout */}
            {liveScore && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#3a4a5a' }}>VOLTAGE</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: VOLTAGE_COLOR(liveScore.voltage) }}>
                    {(liveScore.voltage * 100).toFixed(0)}% — {VOLTAGE_LABEL(liveScore.voltage)}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: '#0a1018', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%',
                    width: `${liveScore.voltage * 100}%`,
                    background: VOLTAGE_COLOR(liveScore.voltage),
                    borderRadius: 2,
                    transition: 'width 0.3s, background 0.3s',
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 9, color: '#3a4a5a' }}>
                  <div>urgency <span style={{ color: VOLTAGE_COLOR(liveScore.urgency) }}>{(liveScore.urgency * 100).toFixed(0)}%</span></div>
                  <div>emotional <span style={{ color: VOLTAGE_COLOR(liveScore.emotional) }}>{(liveScore.emotional * 100).toFixed(0)}%</span></div>
                  <div>cognitive <span style={{ color: VOLTAGE_COLOR(liveScore.cognitive) }}>{(liveScore.cognitive * 100).toFixed(0)}%</span></div>
                </div>
              </div>
            )}

            <button
              onClick={handleIngest}
              disabled={!liveScore}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '8px',
                background: liveScore && liveScore.voltage > threshold
                  ? 'rgba(255, 107, 107, 0.08)' : 'rgba(78, 205, 196, 0.08)',
                border: `1px solid ${liveScore
                  ? (liveScore.voltage > threshold ? 'rgba(255,107,107,0.3)' : 'rgba(78,205,196,0.3)')
                  : 'rgba(40,60,80,0.2)'}`,
                borderRadius: 4,
                color: liveScore
                  ? (liveScore.voltage > threshold ? '#ff6b6b' : '#4ecdc4')
                  : '#2a3a4a',
                fontSize: 11,
                letterSpacing: 1,
                cursor: liveScore ? 'pointer' : 'default',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {liveScore && liveScore.voltage > threshold
                ? 'HOLD — voltage too high'
                : 'PROCESS — safe to read'}
            </button>
          </div>

          {/* Held messages */}
          {heldActive.length > 0 && (
            <div style={ACCENT_PANEL('#ff6b6b')}>
              <div style={{ fontSize: 10, color: '#ff6b6b', marginBottom: 6, letterSpacing: 1, textShadow: '0 0 8px rgba(255,107,107,0.3)' }}>
                HOLDING ({heldActive.length})
              </div>
              {heldActive.slice(0, 5).map(msg => (
                <div key={msg.id} style={{
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(40, 60, 80, 0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#5a6a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.text.slice(0, 50)}
                    </div>
                    <div style={{ fontSize: 9, color: '#2a3a4a' }}>
                      {VOLTAGE_LABEL(msg.voltage)} — {new Date(msg.ingestedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => handleRelease(msg.id)} style={{
                      background: 'rgba(78, 205, 196, 0.08)',
                      border: '1px solid rgba(78, 205, 196, 0.2)',
                      borderRadius: 3, padding: '3px 8px',
                      color: '#4ecdc4', fontSize: 9, cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>release</button>
                    <button onClick={() => handleDismiss(msg.id)} style={{
                      background: 'none',
                      border: '1px solid rgba(40, 60, 80, 0.2)',
                      borderRadius: 3, padding: '3px 6px',
                      color: '#3a4a5a', fontSize: 9, cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>x</button>
                  </div>
                </div>
              ))}
              {heldActive.length > 5 && (
                <div style={{ fontSize: 9, color: '#2a3a4a', marginTop: 4 }}>
                  +{heldActive.length - 5} more held
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 10, color: '#2a3a4a', display: 'flex', gap: 16 }}>
            <span>processed: {processedCount}</span>
            <span>released: {held.filter(m => m.released).length}</span>
          </div>
        </>
      )}

      {/* ════════════════ FAWN GUARD ════════════════ */}
      {tab === 'fawn' && (
        <>
          <div style={ACCENT_PANEL('#ff6b6b')}>
            <div style={{ fontSize: 10, color: '#8a3a3a', marginBottom: 6, letterSpacing: 1 }}>
              CHECK OUTGOING DRAFT
            </div>
            <textarea
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              placeholder="paste your reply before sending..."
              rows={5}
              style={{
                ...INPUT_STYLE,
                borderColor: fawn && fawn.score > 0.3
                  ? 'rgba(255, 107, 107, 0.3)' : 'rgba(40, 60, 80, 0.3)',
              }}
            />
          </div>

          {fawn && fawn.flags.length > 0 && (
            <div style={ACCENT_PANEL('#ff6b6b')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: fawn.score > 0.4 ? '#ff6b6b' : '#f7dc6f', letterSpacing: 1 }}>
                  FAWN PATTERNS DETECTED
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: fawn.score > 0.4 ? '#ff6b6b' : '#f7dc6f' }}>
                  {fawn.matchCount}
                </span>
              </div>
              {fawn.flags.map((flag, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(40, 60, 80, 0.12)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: CATEGORY_COLOR[flag.category] ?? '#f7dc6f', fontWeight: 500 }}>
                      "{flag.pattern}"
                    </span>
                    <span style={{
                      fontSize: 8, color: '#3a4a5a',
                      border: `1px solid ${(CATEGORY_COLOR[flag.category] ?? '#3a4a5a')}33`,
                      borderRadius: 2, padding: '1px 5px',
                    }}>
                      {flag.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: '#5a6a7a', marginTop: 2, fontStyle: 'italic', lineHeight: 1.5 }}>
                    {flag.guidance}
                  </div>
                </div>
              ))}
              <button onClick={handleFawnAck} style={{
                width: '100%', marginTop: 10, padding: '8px',
                background: 'rgba(78, 205, 196, 0.06)',
                border: '1px solid rgba(78, 205, 196, 0.25)',
                borderRadius: 4, color: '#4ecdc4',
                fontSize: 10, letterSpacing: 1, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                I SEE IT — SEND WITH AWARENESS
              </button>
            </div>
          )}

          {fawn && fawn.flags.length === 0 && draftText.trim().length > 10 && (
            <div style={ACCENT_PANEL('#4ecdc4')}>
              <div style={{ fontSize: 11, color: '#4ecdc4', textAlign: 'center' }}>
                No fawn patterns detected. Your voice is clear.
              </div>
            </div>
          )}

          {fawnAcks > 0 && (
            <div style={{ fontSize: 10, color: '#2a3a4a' }}>
              patterns acknowledged: {fawnAcks}
            </div>
          )}
        </>
      )}

      {/* ════════════════ CHAOS INGESTION ════════════════ */}
      {tab === 'chaos' && (
        <>
          <div style={ACCENT_PANEL('#ff9944')}>
            <div style={{ fontSize: 10, color: '#8a6633', marginBottom: 6, letterSpacing: 1 }}>
              CHAOS INGESTION
            </div>
            <div style={{ fontSize: 9, color: '#5a4a3a', marginBottom: 6, lineHeight: 1.5 }}>
              Dump raw text. The Buffer extracts structure.
            </div>
            <textarea
              value={chaosText}
              onChange={e => setChaosText(e.target.value)}
              placeholder="journal, notes, brain dump..."
              rows={6}
              style={INPUT_STYLE}
            />
            <button
              onClick={handleExtract}
              disabled={!chaosText.trim()}
              style={{
                width: '100%', marginTop: 8, padding: '8px',
                background: chaosText.trim() ? 'rgba(255, 153, 68, 0.06)' : 'transparent',
                border: `1px solid ${chaosText.trim() ? 'rgba(255, 153, 68, 0.25)' : 'rgba(40, 60, 80, 0.2)'}`,
                borderRadius: 4,
                color: chaosText.trim() ? '#ff9944' : '#2a3a4a',
                fontSize: 11, letterSpacing: 1,
                cursor: chaosText.trim() ? 'pointer' : 'default',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              EXTRACT STRUCTURE
            </button>
          </div>

          {extracted.length > 0 && (
            <div style={ACCENT_PANEL('#ff9944')}>
              <div style={{ fontSize: 10, color: '#ff9944', marginBottom: 8, letterSpacing: 1, textShadow: '0 0 8px rgba(255,153,68,0.3)' }}>
                EXTRACTED ({extracted.length})
              </div>
              {extracted.map((item, i) => (
                <div key={i} style={{
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(40, 60, 80, 0.1)',
                  display: 'flex', gap: 6, alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontSize: 10, color: ITEM_COLOR[item.type],
                    fontWeight: 600, flexShrink: 0, width: 12,
                  }}>
                    {ITEM_ICON[item.type]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#c8d0dc', lineHeight: 1.4 }}>
                      {item.text.slice(0, 120)}{item.text.length > 120 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: 8, color: ITEM_COLOR[item.type] }}>
                      {item.type.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom status */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#2a3a4a', marginTop: 4 }}>
        <span>{spoons}/12 spoons</span>
        <span style={{
          color: tier === 'REFLEX' ? '#ff6b6b' : tier === 'PATTERN' ? '#f7dc6f' : '#4ecdc4',
          fontWeight: 600, letterSpacing: 1,
        }}>{tier}</span>
      </div>
    </div>
  );
}
