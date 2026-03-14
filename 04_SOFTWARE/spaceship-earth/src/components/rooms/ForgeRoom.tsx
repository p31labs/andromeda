// ForgeRoom — Content Forge / Substack pipeline.
// Seed bank + framework library + editor + publishing checklist.
// All data persisted to localStorage.

import { useState, useEffect, useCallback, useRef } from 'react';
import { theme } from '../../lib/theme';

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
    case 'framework': return 'var(--mint)';
    case 'personal': return 'var(--amber)';
    case 'technical': return 'var(--cyan)';
    case 'research': return 'var(--violet)';
    default: return 'var(--dim)';
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
      display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr minmax(220px, 260px)', gridTemplateRows: 'auto 1fr',
      fontFamily: "var(--font-display)", color: 'var(--text)', background: 'var(--void)',
      fontSize: 13, overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="glass-card" style={{
        gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', border: 'none', borderBottom: `1px solid var(--neon-ghost)`,
        background: 'var(--s1)', borderRadius: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--mint)', textShadow: 'var(--glow-cyan)' }}>
            <span style={{ color: 'var(--mint)' }}>&#9650;</span> Content Forge
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-data)' }}>
            The Geodesic Self &middot; Substack Pipeline
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, fontFamily: 'var(--font-data)', color: saveFlash ? 'var(--mint)' : 'var(--dim)' }}>
          {saveFlash || 'Auto-saved'}
        </div>
      </div>

      {/* Sidebar — seed list + frameworks */}
      <div style={{ borderRight: `1px solid var(--neon-ghost)`, overflowY: 'auto', background: 'var(--s1)', minHeight: 0 }}>
        <div style={{ padding: 12, borderBottom: `1px solid var(--neon-ghost)` }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
            Content Seeds
          </div>
          {seeds.map(s => (
            <div
              key={s.id}
              onClick={() => selectSeed(s.id)}
              className="glass-card"
              style={{
                padding: '8px 10px', marginBottom: 6, cursor: 'pointer',
                borderColor: s.id === activeId ? 'var(--mint)' : 'var(--neon-ghost)',
                background: s.id === activeId ? 'var(--s2)' : 'transparent',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                {s.title || 'Untitled'}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)' }}>
                {new Date(s.created).toLocaleDateString()}
              </div>
              <span style={{
                display: 'inline-block', fontSize: 9, fontFamily: 'var(--font-data)', padding: '1px 6px',
                borderRadius: 4, marginTop: 4, letterSpacing: 0.5,
                background: `${categoryColor(s.category)}18`, color: categoryColor(s.category),
                border: `1px solid ${categoryColor(s.category)}33`
              }}>
                {s.status === 'published' ? 'PUBLISHED' : s.status === 'draft' ? 'DRAFT' : s.category.toUpperCase()}
              </span>
            </div>
          ))}
          <button type="button" onClick={addSeed} className="glass-btn" style={{
            width: '100%', padding: '10px', borderStyle: 'dashed',
            color: 'var(--dim)', fontSize: 11, minHeight: 'auto'
          }}>
            + New Seed
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
            Framework Library
          </div>
          {DEFAULT_FRAMEWORKS.map(fw => (
            <div
              key={fw.id}
              onClick={() => insertFramework(fw)}
              className="glass-card"
              style={{
                padding: '6px 10px', marginBottom: 6, cursor: 'pointer',
                borderColor: 'var(--neon-ghost)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)' }}>{fw.title}</div>
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-data)', color: categoryColor(fw.category),
              }}>
                {fw.category.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--void)' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
          borderBottom: `1px solid var(--neon-ghost)`, background: 'var(--s1)',
        }}>
          {['## ', '### ', '> ', '- '].map((prefix, i) => (
            <button key={i} type="button" onClick={() => {
              if (!bodyRef.current) return;
              const el = bodyRef.current;
              const pos = el.selectionStart;
              const newBody = (active?.body || '').slice(0, pos) + prefix + (active?.body || '').slice(pos);
              updateActive('body', newBody);
              setTimeout(() => { el.selectionStart = el.selectionEnd = pos + prefix.length; el.focus(); }, 20);
            }} className="glass-btn" style={{
              padding: '3px 8px', minHeight: 'auto', minWidth: 'auto',
              fontSize: 9, fontFamily: 'var(--font-data)', color: 'var(--dim)'
            }}>
              {['H2', 'H3', 'Q', 'List'][i]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)' }}>
            {wc} words &middot; {readMin} min
          </div>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          value={active?.title || ''}
          onChange={e => updateActive('title', e.target.value)}
          placeholder="Post title..."
          className="glass-input"
          style={{
            width: '100%', padding: '16px 20px 8px', background: 'transparent',
            border: 'none', borderRadius: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)'
          }}
        />
        {/* Subtitle */}
        <input
          value={active?.subtitle || ''}
          onChange={e => updateActive('subtitle', e.target.value)}
          placeholder="Subtitle — the hook..."
          className="glass-input"
          style={{
            width: '100%', padding: '0 20px 12px', background: 'transparent',
            border: 'none', borderRadius: 0, fontSize: 14, fontWeight: 300, color: 'var(--dim)',
            borderBottom: '1px solid var(--neon-ghost)'
          }}
        />
        {/* Body */}
        <textarea
          ref={bodyRef}
          value={active?.body || ''}
          onChange={e => updateActive('body', e.target.value)}
          placeholder="Start writing..."
          className="glass-input"
          style={{
            flex: 1, padding: '16px 20px 32px', background: 'transparent',
            border: 'none', borderRadius: 0, fontSize: 13, lineHeight: 1.8,
            resize: 'none', overflow: 'auto', color: 'var(--text)'
          }}
        />
      </div>

      {/* Right panel */}
      <div style={{ borderLeft: `1px solid var(--neon-ghost)`, overflowY: 'auto', background: 'var(--s1)', minHeight: 0 }}>
        {/* Post settings */}
        <div style={{ padding: 12, borderBottom: `1px solid var(--neon-ghost)` }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
            Post Settings
          </div>
          <select
            value={active?.status || 'seed'}
            onChange={e => updateActive('status', e.target.value)}
            className="glass-input"
            aria-label="Post status"
            style={{ width: '100%', padding: 6, marginBottom: 6, fontSize: 11, background: 'var(--s1)' }}
          >
            <option value="seed">Seed</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
          </select>
          <select
            value={active?.category || 'framework'}
            onChange={e => updateActive('category', e.target.value)}
            className="glass-input"
            aria-label="Post category"
            style={{ width: '100%', padding: 6, fontSize: 11, background: 'var(--s1)' }}
          >
            <option value="framework">Framework</option>
            <option value="personal">Personal</option>
            <option value="technical">Technical</option>
            <option value="research">Research</option>
          </select>
        </div>

        {/* Checklist */}
        <div style={{ padding: 12, borderBottom: `1px solid var(--neon-ghost)` }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
            Publishing Checklist
          </div>
          {CHECKLIST.map((item, i) => (
            <label key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0',
              fontSize: 11, cursor: 'pointer',
              color: checks[i] ? 'var(--mint)' : 'var(--dim)',
              textDecoration: checks[i] ? 'line-through' : 'none',
            }}>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => setChecks(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                style={{ marginTop: 2, accentColor: 'var(--mint)' }}
              />
              {item}
            </label>
          ))}
        </div>

        {/* Cross-links */}
        <div style={{ padding: 12, borderBottom: `1px solid var(--neon-ghost)` }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
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
              className="glass-btn"
              style={{
                display: 'block', padding: '8px 12px', margin: '4px 0',
                fontSize: 11, color: 'var(--cyan)', textDecoration: 'none',
                minHeight: 'auto', textAlign: 'center'
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--dim)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
            Actions
          </div>
          <button type="button" onClick={copyMarkdown} className="glass-btn" style={{
            width: '100%', marginBottom: 6, color: 'var(--mint)', borderColor: 'var(--mint)44', fontSize: 12
          }}>
            Copy Markdown
          </button>
          <button type="button" onClick={exportAll} className="glass-btn" style={{
            width: '100%', marginBottom: 6, color: 'var(--mint)', borderColor: 'var(--mint)44', fontSize: 12
          }}>
            Export (JSON)
          </button>
          <button type="button" onClick={deleteSeed} className="glass-btn" style={{
            width: '100%', color: 'var(--coral)', borderColor: 'var(--coral)44', fontSize: 12
          }}>
            Delete Seed
          </button>
        </div>
      </div>
    </div>
  );
}
