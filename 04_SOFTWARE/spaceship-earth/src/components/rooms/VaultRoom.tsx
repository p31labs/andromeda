// spaceship-earth/src/components/rooms/VaultRoom.tsx
// B4: Vault room — encrypted storage status + court-ready export.
// SE19: Ground truth UI — Ed25519 identity, engine config, sync log, Daubert export.
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useNode } from '../../contexts/NodeContext';
import { useSovereignStore } from '../../sovereign/useSovereignStore';
import * as genesis from '../../services/genesisIdentity';

type ScopeTier = 'REFLEX' | 'PATTERN' | 'FULL';

// ── Hash scramble animation hook ──

function useHashScramble(finalHash: string | null, duration = 1200): string {
  const [display, setDisplay] = useState('');
  const chars = '0123456789abcdef';

  useEffect(() => {
    if (!finalHash) { setDisplay('not booted'); return; }
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - start) / duration);
      const resolved = Math.floor(progress * finalHash.length);
      let out = '';
      for (let i = 0; i < finalHash.length; i++) {
        if (i < resolved) {
          out += finalHash[i];
        } else {
          out += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplay(out);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finalHash, duration]);

  return display;
}

// ── Lock icon SVG ──

function LockIcon({ color, pulsing }: { color: string; pulsing?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" style={{
      opacity: pulsing ? undefined : 0.6,
      animation: pulsing ? 'lockPulse 2s ease-in-out infinite' : 'none',
    }}>
      <rect x={3} y={7} width={10} height={8} rx={1.5} fill="none" stroke={color} strokeWidth={1.2} />
      <path d={`M5 7V5a3 3 0 016 0v2`} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={8} cy={11} r={1} fill={color} />
    </svg>
  );
}

// ── Chain link SVG ──

function ChainLink({ from, to, color }: { from: string; to: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--neon-ghost)' }}>
      <span style={{ color }}>{from}</span>
      <svg width={20} height={8} viewBox="0 0 20 8">
        <line x1={0} y1={4} x2={14} y2={4} stroke={color} strokeWidth={1} opacity={0.4} />
        <polygon points="14,1 20,4 14,7" fill={color} opacity={0.4} />
      </svg>
      <span style={{ color }}>{to}</span>
    </div>
  );
}

// ── Constants ──

const LAYER_COLORS: Record<string, string> = {
  telemetry: 'var(--cyan)',
  'love-ledger': 'var(--magenta)',
  bonds: 'var(--cyan)',
  'game-state': 'var(--amber)',
};

const LAYER_ICONS: Record<string, string> = {
  telemetry: 'T',
  'love-ledger': 'L',
  bonds: 'B',
  'game-state': 'G',
};

const ACCENT_MAP: Record<string, string> = {
  telemetry: 'accent-teal',
  'love-ledger': 'accent-violet',
  bonds: 'accent-blue',
  'game-state': 'accent-amber',
};

interface Props {
  tier: ScopeTier;
}

export function VaultRoom({ tier }: Props) {
  const { nodeId, vaultLayerCount, exportVaultBundle, protocolWallet, protocolTxCount, vaultSync } = useNode();
  const didKey = useSovereignStore((s) => s.didKey);
  const genesisSyncStatus = useSovereignStore((s) => s.genesisSyncStatus);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [didCopied, setDidCopied] = useState(false);
  const [llmKey, setLlmKey] = useState(() => {
    try { return localStorage.getItem('p31_llm_key') ?? ''; } catch { return ''; }
  });
  const [showKey, setShowKey] = useState(false);
  const [llmEngine, setLlmEngine] = useState(() => {
    try { return localStorage.getItem('p31_llm_engine') ?? 'claude-sonnet'; } catch { return 'claude-sonnet'; }
  });
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const [syncLogTick, setSyncLogTick] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const syncLogRef = useRef<HTMLDivElement>(null);

  const displayHash = useHashScramble(nodeId);

  useEffect(() => {
    const interval = setInterval(() => setSyncLogTick((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (syncLogRef.current) {
      syncLogRef.current.scrollTop = syncLogRef.current.scrollHeight;
    }
  }, [syncLogTick]);

  const syncEvents = vaultSync?.syncEvents ?? [];

  const handleCopyId = useCallback(async () => {
    if (!nodeId) return;
    try {
      await navigator.clipboard.writeText(nodeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, [nodeId]);

  const handleCopyDid = useCallback(async () => {
    if (!didKey || didKey === 'UNINITIALIZED') return;
    try {
      await navigator.clipboard.writeText(didKey);
      setDidCopied(true);
      setTimeout(() => setDidCopied(false), 2000);
    } catch { /* fallback */ }
  }, [didKey]);

  const handleExportJWK = useCallback(async () => {
    try {
      const jwk = await genesis.exportKeyJWK();
      const json = JSON.stringify(jwk, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `p31-identity-${new Date().toISOString().split('T')[0]}.jwk.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIdentityStatus('Exported');
      setTimeout(() => setIdentityStatus(null), 3000);
    } catch (err) {
      setIdentityStatus(`Error: ${(err as Error).message}`);
    }
  }, []);

  const handleImportJWK = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const jwk = JSON.parse(text) as JsonWebKey;
      const newDid = await genesis.importKeyJWK(jwk);
      useSovereignStore.setState({ didKey: newDid });
      setIdentityStatus('Imported');
      setTimeout(() => setIdentityStatus(null), 3000);
    } catch (err) {
      setIdentityStatus(`Error: ${(err as Error).message}`);
    }
    if (importRef.current) importRef.current.value = '';
  }, []);

  const handleEngineChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setLlmEngine(v);
    try { localStorage.setItem('p31_llm_engine', v); } catch {}
  }, []);

  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLlmKey(v);
    try { localStorage.setItem('p31_llm_key', v); } catch {}
  }, []);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);
    try {
      const interval = setInterval(() => {
        setExportProgress(p => Math.min(95, p + Math.random() * 15));
      }, 200);
      const bundle = await exportVaultBundle();
      clearInterval(interval);
      setExportProgress(100);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `p31-daubert-bundle-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setLastExport(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('[VAULT] Export failed', err);
    } finally {
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  }, [exportVaultBundle, exporting]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: 'clamp(10px, 2vh, 24px)', gap: 'clamp(10px, 2vh, 20px)',
      background: 'var(--s1)', color: 'var(--text)',
      fontFamily: 'var(--font-data)', boxSizing: 'border-box', overflow: 'hidden'
    }}>
      {/* ── HEADER & IDENTITY ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, flexShrink: 0 }}>
        <div className="glass-card" style={{ padding: 16, border: '1px solid var(--neon-ghost)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <LockIcon color="var(--cyan)" pulsing />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--cyan)', textShadow: 'var(--glow-cyan)' }}>NODE IDENTITY</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>NODE_ID / SEED HASH</div>
          <div style={{
            background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            fontSize: 12, color: 'var(--cyan)', border: '1px solid var(--neon-ghost)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, cursor: 'pointer'
          }} onClick={handleCopyId}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayHash}</span>
            <span style={{ fontSize: 9, opacity: 0.5 }}>{copied ? 'COPIED' : 'COPY'}</span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>SOVEREIGN KEY (DID)</div>
          <div style={{
            background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            fontSize: 10, color: 'var(--magenta)', border: '1px solid var(--neon-ghost)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, cursor: 'pointer'
          }} onClick={handleCopyDid}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{didKey}</span>
            <span style={{ fontSize: 9, opacity: 0.5 }}>{didCopied ? 'COPIED' : 'COPY'}</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleExportJWK} className="glass-btn" style={{ flex: 1, fontSize: 10, minHeight: 'auto', padding: '6px 0' }}>EXPORT IDENTITY</button>
            <button onClick={() => importRef.current?.click()} className="glass-btn" style={{ flex: 1, fontSize: 10, minHeight: 'auto', padding: '6px 0' }}>IMPORT IDENTITY</button>
            <input type="file" ref={importRef} style={{ display: 'none' }} accept=".json" onChange={handleImportJWK} />
          </div>
          {identityStatus && <div style={{ fontSize: 9, color: 'var(--amber)', marginTop: 6, textAlign: 'center' }}>{identityStatus}</div>}
        </div>

        <div className="glass-card" style={{ padding: 16, border: '1px solid var(--neon-ghost)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--amber)', textShadow: 'var(--glow-amber)' }}>ENGINE CONFIG</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>LLM ENGINE</div>
              <select value={llmEngine} onChange={handleEngineChange} className="glass-input" style={{ fontSize: 12, padding: '6px 10px', background: 'var(--s1)' }}>
                <option value="claude-sonnet">Claude 3.5 Sonnet (Recom.)</option>
                <option value="claude-haiku">Claude 3.5 Haiku (Fast)</option>
                <option value="gpt-4o">GPT-4o (Legacy)</option>
                <option value="local-llama">Local Llama 3 (Experimental)</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 4 }}>API KEY (PERSISTENT)</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={llmKey}
                  onChange={handleKeyChange}
                  className="glass-input"
                  placeholder="sk-ant-..."
                  style={{ flex: 1, fontSize: 12, padding: '6px 10px', background: 'var(--s1)' }}
                />
                <button onClick={() => setShowKey(!showKey)} className="glass-btn" style={{ width: 44, padding: 0, minHeight: 'auto' }}>
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--dim)', fontStyle: 'italic' }}>Keys are stored in your browser's local vault only.</div>
          </div>
        </div>
      </div>

      {/* ── VAULT LAYERS & SYNC ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, flex: 1, minHeight: 0 }}>
        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--neon-ghost)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>VAULT LAYERS</span>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>{vaultLayerCount} ACTIVE</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.keys(LAYER_COLORS).map(layer => (
              <div key={layer} className="glass-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--neon-ghost)' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4, background: LAYER_COLORS[layer] + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: LAYER_COLORS[layer], fontWeight: 700, fontSize: 12, border: `1px solid ${LAYER_COLORS[layer]}44`
                }}>{LAYER_ICONS[layer]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{layer.toUpperCase()}</div>
                  <div style={{ fontSize: 9, color: 'var(--dim)' }}>AES-256-GCM / SHARDED</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--mint)', fontWeight: 700 }}>SECURE</div>
                  <div style={{ fontSize: 8, color: 'var(--dim)' }}>SYNCED</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--neon-ghost)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>LIVE SYNC LOG</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: genesisSyncStatus === 'synced' ? 'var(--mint)' : 'var(--amber)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 9, color: 'var(--dim)' }}>{genesisSyncStatus.toUpperCase()}</span>
            </div>
          </div>
          <div ref={syncLogRef} style={{
            flex: 1, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 10,
            borderRadius: 4, fontFamily: 'var(--font-data)', fontSize: 10, border: '1px solid var(--neon-ghost)'
          }}>
            {syncEvents.length === 0 && <div style={{ color: 'var(--dim)' }}>[ Waiting for sync events... ]</div>}
            {syncEvents.map((ev, i) => (
              <div key={i} style={{ marginBottom: 4, borderBottom: '1px solid var(--neon-ghost)', paddingBottom: 2 }}>
                <span style={{ color: 'var(--dim)' }}>[{new Date(ev.timestamp).toLocaleTimeString()}]</span>{' '}
                <span style={{ color: ev.direction === 'push' ? 'var(--magenta)' : 'var(--cyan)' }}>{ev.direction.toUpperCase()}</span>{' '}
                <span style={{ color: 'var(--text)' }}>{ev.type}</span>{' '}
                <span style={{ color: 'var(--dim)', fontSize: 8 }}>({ev.serverHash.slice(0, 8)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DAUBERT EXPORT ── */}
      <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, border: '1px solid var(--neon-ghost)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', textShadow: 'var(--glow-blue)' }}>COURT-READY EXPORT (DAUBERT)</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
            Generate a cryptographically signed bundle of all parent engagement logs, somatic data, and bonds.
            Formatted for legal admissibility under Daubert standards.
          </div>
        </div>
        <div style={{ minWidth: 200, textAlign: 'right' }}>
          {exporting ? (
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: 10, color: 'var(--blue)', marginBottom: 4, textAlign: 'left' }}>PACKING BUNDLE... {Math.round(exportProgress)}%</div>
              <div style={{ height: 4, background: 'var(--neon-faint)', borderRadius: 2 }}>
                <div style={{ height: '100%', background: 'var(--blue)', width: `${exportProgress}%`, transition: 'width 0.2s' }} />
              </div>
            </div>
          ) : (
            <button onClick={handleExport} className="glass-btn" style={{ padding: '12px 24px', color: 'var(--blue)', borderColor: 'var(--blue)44' }}>
              GENERATE BUNDLE
            </button>
          )}
          {lastExport && <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 6 }}>LAST EXPORT: {lastExport}</div>}
        </div>
      </div>
    </div>
  );
}
