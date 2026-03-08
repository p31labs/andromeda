// ForgeRoom — Content Forge / Substack pipeline.
// Seed bank + framework library + editor + publishing checklist.
// All data persisted to localStorage.

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──
interface Seed {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  status: 'seed' | 'draft' | 'review' | 'published';
  category: 'framework' | 'personal' | 'technical' | 'research';
  created: number;
}

interface Framework {
  id: string;
  title: string;
  snippet: string;
  category: string;
}

// ── Constants ──
const STORAGE_KEY = 'p31:content-forge:seeds';
const ACTIVE_KEY = 'p31:content-forge:active';

const C = {
  void: '#000000', voidUp: '#000000', surface: '#0a0a0a',
  border: 'rgba(0,255,255,0.06)', borderB: 'rgba(0,255,255,0.1)',
  dim: '#1a4a1a', muted: '#3a7a3a', text: '#d8ffd8', bright: '#e8ffe8',
  green: '#00FFFF', cyan: '#00FFFF', amber: '#FFD700', violet: '#BF5FFF',
};

const MONO = "'Space Mono', 'Cascadia Code', monospace";

const DEFAULT_FRAMEWORKS: Framework[] = [
  { id: 'f-posner', title: 'The Posner Molecule', snippet: 'Ca9(PO4)6 — the hypothesized substrate for quantum cognition. Phosphorus-31 (spin 1/2, NMR-active) + calcium = the molecular bridge between quantum physics and biological thought.', category: 'research' },
  { id: 'f-delta', title: 'Wye-Delta Transformation', snippet: 'A Wye (Y) topology has a single point of failure. A Delta topology is a mesh where every node supports every other. No central point. No hierarchy. From fragile to antifragile.', category: 'framework' },
  { id: 'f-tetrahedron', title: 'The Tetrahedron Protocol', snippet: 'The simplest rigid structure in 3D space. Four points, six edges. Every P31 Labs decision is anchored to four points: Technical Feasibility, Legal Compliance, Medical Necessity, Operational Security.', category: 'framework' },
  { id: 'f-spoons', title: 'Spoon Theory (Quantified)', snippet: 'Every morning you wake with a finite number of spoons. Every task costs spoons. When they are gone, they are gone. P31 quantifies this: the Spoon Counter tracks energy, the Buffer measures voltage, the Scope shows the dashboard.', category: 'framework' },
  { id: 'f-centaur', title: 'The Centaur Protocol', snippet: 'Human + AI symbiosis. The human provides direction, context, values, judgment. The AI provides execution, memory, synthesis, tirelessness. Neither is complete alone.', category: 'framework' },
  { id: 'f-love', title: 'L.O.V.E. Economy', snippet: 'Ledger of Ontological Volume and Entropy. You earn L.O.V.E. tokens through documented parental engagement. Proof of Care = sum(T_prox * Q_res) + Tasks_verified. Time proximity with 24-hour half-life decay.', category: 'framework' },
];

const DEFAULT_SEEDS: Seed[] = [
  { id: 's-1', title: 'Why I Named It After a Molecule', subtitle: 'The origin story nobody asked for but everyone needs', body: 'Phosphorus-31 is the only stable isotope of phosphorus. It has a nuclear spin of 1/2, which makes it NMR-active.\n\nCombine it with calcium and you get the Posner molecule. Matthew Fisher proposed in 2015 that these molecules might be the substrate for quantum cognition.\n\nI didn\'t name P31 Labs after a molecule because it sounded cool. I named it because it IS what we\'re building: the bridge between quantum physics and how neurodivergent brains actually think.', status: 'draft', category: 'personal', created: Date.now() },
  { id: 's-2', title: 'The Floating Neutral: Why Everything Broke', subtitle: 'What electricians know about losing your ground', body: '', status: 'seed', category: 'framework', created: Date.now() - 86400000 },
  { id: 's-3', title: 'Phase Collapse Is Not Social Anxiety', subtitle: 'It\'s quantum mechanics applied to neurodivergent communication', body: '', status: 'seed', category: 'personal', created: Date.now() - 172800000 },
];

const CHECKLIST = [
  'Hook in first 2 sentences',
  'Personal story / vulnerability',
  'Technical concept mapped to human analogy',
  'At least one P31 framework reference',
  'Cross-link to another post or resource',
  'CTA at end (subscribe / share / visit)',
  'Under 1500 words (sweet spot: 800-1200)',
  'Subtitle is a hook, not a summary',
];

// ── Helpers ──
function categoryColor(cat: string): string {
  switch (cat) {
    case 'framework': return C.green;
    case 'personal': return C.amber;
    case 'technical': return C.cyan;
    case 'research': return C.violet;
    default: return C.dim;
  }
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ── Component ──
export function ForgeRoom() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checks, setChecks] = useState<boolean[]>(() => new Array(CHECKLIST.length).fill(false));
  const [saveFlash, setSaveFlash] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded: Seed[] = raw ? JSON.parse(raw) : [...DEFAULT_SEEDS];
      setSeeds(loaded);
      const savedActive = localStorage.getItem(ACTIVE_KEY);
      setActiveId(savedActive || loaded[0]?.id || null);
    } catch {
      setSeeds([...DEFAULT_SEEDS]);
      setActiveId(DEFAULT_SEEDS[0]?.id || null);
    }
  }, []);

  // Persist on change
  const persist = useCallback((s: Seed[], id: string | null) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (id) localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const active = seeds.find(s => s.id === activeId) || null;

  const updateActive = useCallback((field: keyof Seed, value: string) => {
    setSeeds(prev => {
      const next = prev.map(s => s.id === activeId ? { ...s, [field]: value } : s);
      persist(next, activeId);
      return next;
    });
  }, [activeId, persist]);

  const selectSeed = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
    setChecks(new Array(CHECKLIST.length).fill(false));
  }, []);

  const addSeed = useCallback(() => {
    const id = `s-${Date.now()}`;
    const newSeed: Seed = { id, title: '', subtitle: '', body: '', status: 'seed', category: 'framework', created: Date.now() };
    setSeeds(prev => {
      const next = [newSeed, ...prev];
      persist(next, id);
      return next;
    });
    setActiveId(id);
    setChecks(new Array(CHECKLIST.length).fill(false));
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [persist]);

  const deleteSeed = useCallback(() => {
    if (!activeId || !confirm(`Delete "${active?.title || 'Untitled'}"?`)) return;
    setSeeds(prev => {
      const next = prev.filter(s => s.id !== activeId);
      const newActive = next[0]?.id || null;
      persist(next, newActive);
      setActiveId(newActive);
      return next;
    });
  }, [activeId, active, persist]);

  const copyMarkdown = useCallback(() => {
    if (!active) return;
    const md = `# ${active.title}\n\n*${active.subtitle}*\n\n${active.body}`;
    navigator.clipboard.writeText(md);
    setSaveFlash('Markdown copied!');
    setTimeout(() => setSaveFlash(''), 2000);
  }, [active]);

  const exportAll = useCallback(() => {
    const blob = new Blob([JSON.stringify(seeds, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'p31-content-forge-export.json';
    a.click();
    URL.revokeObjectURL(url);
    setSaveFlash('Exported!');
    setTimeout(() => setSaveFlash(''), 2000);
  }, [seeds]);

  const insertFramework = useCallback((fw: Framework) => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;
    const pos = el.selectionStart;
    const insert = `\n\n---\n\n**${fw.title}**\n\n${fw.snippet}\n\n---\n\n`;
    const newBody = (active?.body || '').slice(0, pos) + insert + (active?.body || '').slice(pos);
    updateActive('body', newBody);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = pos + insert.length;
      el.focus();
    }, 20);
  }, [active, updateActive]);

  const wc = wordCount(active?.body || '');
  const readMin = Math.max(1, Math.ceil(wc / 250));

  // ── Render ──
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'grid', gridTemplateColumns: '240px 1fr 260px', gridTemplateRows: 'auto 1fr',
      fontFamily: "'Oxanium', sans-serif", color: C.text, background: C.void,
      fontSize: 13, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.voidUp,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.green, textShadow: `0 0 10px ${C.green}44` }}>
            <span style={{ color: C.green }}>&#9650;</span> Content Forge
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO, textShadow: `0 0 4px ${C.green}22` }}>
            The Geodesic Self &middot; Substack Pipeline
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, fontFamily: MONO, color: saveFlash ? C.green : C.muted, textShadow: saveFlash ? `0 0 6px ${C.green}44` : 'none' }}>
          {saveFlash || 'Auto-saved'}
        </div>
      </div>

      {/* Sidebar — seed list + frameworks */}
      <div style={{ borderRight: `1px solid ${C.border}`, overflowY: 'auto', overflowX: 'hidden', background: C.voidUp, minHeight: 0 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', textShadow: `0 0 4px ${C.green}22` }}>
            Content Seeds
          </div>
          {seeds.map(s => (
            <div
              key={s.id}
              onClick={() => selectSeed(s.id)}
              style={{
                padding: '8px 10px', marginBottom: 4, borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${s.id === activeId ? C.green : C.border}`,
                background: s.id === activeId ? C.surface : 'transparent',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: C.bright, marginBottom: 2 }}>
                {s.title || 'Untitled'}
              </div>
              <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted }}>
                {new Date(s.created).toLocaleDateString()}
              </div>
              <span style={{
                display: 'inline-block', fontSize: 10, fontFamily: MONO, padding: '2px 8px',
                borderRadius: 4, marginTop: 4, letterSpacing: 0.5,
                background: `${categoryColor(s.category)}18`, color: categoryColor(s.category),
              }}>
                {s.status === 'published' ? 'PUBLISHED' : s.status === 'draft' ? 'DRAFT' : s.category.toUpperCase()}
              </span>
            </div>
          ))}
          <button type="button" onClick={addSeed} style={{
            width: '100%', padding: '12px 16px', background: 'transparent',
            border: `1px dashed ${C.border}`, borderRadius: 4,
            color: C.dim, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            minHeight: '48px',
            minWidth: '48px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            + New Seed
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', textShadow: `0 0 4px ${C.green}22` }}>
            Framework Library
          </div>
          {DEFAULT_FRAMEWORKS.map(fw => (
            <div
              key={fw.id}
              onClick={() => insertFramework(fw)}
              style={{
                padding: '6px 10px', marginBottom: 4, borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: C.bright }}>{fw.title}</div>
              <span style={{
                fontSize: 10, fontFamily: MONO, color: categoryColor(fw.category),
              }}>
                {fw.category.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', flexWrap: 'wrap',
          borderBottom: `1px solid ${C.border}`, background: C.voidUp,
        }}>
          {['## ', '### ', '> ', '- '].map((prefix, i) => (
            <button key={i} type="button" onClick={() => {
              if (!bodyRef.current) return;
              const el = bodyRef.current;
              const pos = el.selectionStart;
              const newBody = (active?.body || '').slice(0, pos) + prefix + (active?.body || '').slice(pos);
              updateActive('body', newBody);
              setTimeout(() => { el.selectionStart = el.selectionEnd = pos + prefix.length; el.focus(); }, 20);
            }} style={{
              padding: '3px 8px', background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 3, color: C.muted, fontSize: 10, fontFamily: MONO, cursor: 'pointer',
            }}>
              {['H2', 'H3', 'Q', 'List'][i]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted }}>
            {wc} words &middot; {readMin} min read
          </div>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          value={active?.title || ''}
          onChange={e => updateActive('title', e.target.value)}
          placeholder="Post title..."
          style={{
            width: '100%', padding: '14px 20px 6px', background: 'transparent',
            border: 'none', outline: '2px solid transparent', color: C.bright,
            fontSize: 22, fontWeight: 600, fontFamily: 'inherit',
          }}
        />
        {/* Subtitle */}
        <input
          value={active?.subtitle || ''}
          onChange={e => updateActive('subtitle', e.target.value)}
          placeholder="Subtitle — the hook..."
          style={{
            width: '100%', padding: '0 20px 10px', background: 'transparent',
            border: 'none', outline: '2px solid transparent', color: C.muted,
            fontSize: 14, fontWeight: 300, fontFamily: 'inherit',
          }}
        />
        {/* Body */}
        <textarea
          ref={bodyRef}
          value={active?.body || ''}
          onChange={e => updateActive('body', e.target.value)}
          placeholder="Start writing..."
          style={{
            flex: 1, padding: '10px 20px 24px', background: 'transparent',
            border: 'none', outline: '2px solid transparent', color: C.text,
            fontSize: 13, lineHeight: 1.8, resize: 'none', overflow: 'auto',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Right panel */}
      <div style={{ borderLeft: `1px solid ${C.border}`, overflowY: 'auto', overflowX: 'hidden', background: C.voidUp, minHeight: 0 }}>
        {/* Post settings */}
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', textShadow: `0 0 4px ${C.green}22` }}>
            Post Settings
          </div>
          <select
            value={active?.status || 'seed'}
            onChange={e => updateActive('status', e.target.value)}
            aria-label="Post status"
            style={{
              width: '100%', padding: 6, marginBottom: 6, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 3, color: C.muted, fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            <option value="seed">Seed</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
          </select>
          <select
            value={active?.category || 'framework'}
            onChange={e => updateActive('category', e.target.value)}
            aria-label="Post category"
            style={{
              width: '100%', padding: 6, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 3, color: C.muted, fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            <option value="framework">Framework</option>
            <option value="personal">Personal</option>
            <option value="technical">Technical</option>
            <option value="research">Research</option>
          </select>
        </div>

        {/* Checklist */}
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', textShadow: `0 0 4px ${C.green}22` }}>
            Publishing Checklist
          </div>
          {CHECKLIST.map((item, i) => (
            <label key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0',
              fontSize: 11, cursor: 'pointer',
              color: checks[i] ? C.green : C.muted,
              textDecoration: checks[i] ? 'line-through' : 'none',
            }}>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => setChecks(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                style={{ marginTop: 2, accentColor: C.green }}
              />
              {item}
            </label>
          ))}
        </div>

        {/* Cross-links */}
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', textShadow: `0 0 4px ${C.green}22` }}>
            Cross-Link Ecosystem
          </div>
          {[
            { label: 'phosphorus31.org', href: 'https://phosphorus31.org' },
            { label: 'p31ca.org', href: 'https://p31ca.org' },
            { label: 'github.com/trimtab-signal', href: 'https://github.com/trimtab-signal' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '8px 12px', margin: '4px 0',
                border: `1px solid ${C.border}`, borderRadius: 6,
                fontSize: 12, color: C.cyan, fontFamily: MONO,
                textDecoration: 'none',
                textShadow: `0 0 4px ${C.cyan}33`,
                minHeight: '40px',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', textShadow: `0 0 4px ${C.green}22` }}>
            Actions
          </div>
          <button type="button" onClick={copyMarkdown} style={{
            width: '100%', padding: 12, marginBottom: 6, borderRadius: 6,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.green, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            minHeight: '48px', textShadow: `0 0 4px ${C.green}33`,
          }}>
            Copy as Markdown
          </button>
          <button type="button" onClick={exportAll} style={{
            width: '100%', padding: 12, marginBottom: 6, borderRadius: 6,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.green, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            minHeight: '48px', textShadow: `0 0 4px ${C.green}33`,
          }}>
            Export All Seeds (JSON)
          </button>
          <button type="button" onClick={deleteSeed} style={{
            width: '100%', padding: 12, borderRadius: 6,
            background: 'transparent', border: `1px solid #4a1a1a`,
            color: '#cc4444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            minHeight: '48px',
          }}>
            Delete Current Seed
          </button>
        </div>
      </div>
    </div>
  );
}
