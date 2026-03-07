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
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'rgba(255,255,255,0.06)' }}>
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
  telemetry: '#00FFFF',
  'love-ledger': '#BF5FFF',
  bonds: '#00FFFF',
  'game-state': '#f7dc6f',
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
  'game-state': 'accent-yellow',
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

  // Poll sync events for live updates
  useEffect(() => {
    const interval = setInterval(() => setSyncLogTick((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll sync log
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

  // ── Ed25519 Identity: Export JWK ──
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

  // ── Ed25519 Identity: Import JWK ──
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
    // Reset input
    if (importRef.current) importRef.current.value = '';
  }, []);

  // ── Engine selector ──
  const handleEngineChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setLlmEngine(v);
    try { localStorage.setItem('p31_llm_engine', v); } catch {}
  }, []);

  // ── Vault JSON Export (existing) ──
  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportProgress(0);

    const stages = [0.2, 0.5, 0.8, 1.0];
    for (const s of stages) {
      await new Promise(r => setTimeout(r, 300));
      setExportProgress(s);
    }

    try {
      const bundle = await exportVaultBundle();
      if (!bundle) {
        setExporting(false);
        setExportProgress(0);
        return;
      }

      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `p31-vault-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport(new Date().toISOString());
    } catch (err) {
      console.error('[VaultRoom] export failed:', err);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, [exportVaultBundle]);

  // ── Daubert Export: signed telemetry text file ──
  const handleDaubertExport = useCallback(async () => {
    try {
      const events = vaultSync?.syncEvents ?? [];
      const did = didKey !== 'UNINITIALIZED' ? didKey : 'NO_DID';
      const lines = [
        '=== P31-OS DAUBERT CHAIN-OF-CUSTODY EXPORT ===',
        `DID: ${did}`,
        `Exported: ${new Date().toISOString()}`,
        `Events: ${events.length}`,
        '---',
        ...events.map((ev) =>
          `[${ev.timestamp}] | ${ev.direction.toUpperCase()} | ${ev.serverHash}`
        ),
        '---',
        '',
      ];
      const payload = lines.join('\n');
      const payloadBytes = new TextEncoder().encode(payload);

      let signatureHex = 'UNSIGNED';
      try {
        const sigBytes = await genesis.sign(payloadBytes);
        signatureHex = genesis.toHex(sigBytes);
      } catch { /* identity not booted — export unsigned */ }

      const signedOutput = payload + `SIGNATURE: ${signatureHex}\n`;
      const blob = new Blob([signedOutput], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `p31-daubert-export-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[VaultRoom] Daubert export failed:', err);
    }
  }, [vaultSync, didKey]);

  const isReflex = tier === 'REFLEX';
  const didInitialized = didKey !== 'UNINITIALIZED';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', height: '100%', color: '#c8d0dc',
      fontFamily: "'JetBrains Mono', monospace", gap: 6,
      overflow: 'auto', padding: '10px 16px', background: 'transparent',
    }}>
      {/* Title */}
      <h1 className="title-gradient" style={{
        fontSize: 18, margin: 0,
        backgroundImage: 'linear-gradient(90deg, #ff4466, #ff9944)',
        animation: 'fadeInUp 0.4s ease-out both',
      }}>THE VAULT</h1>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 2, marginTop: -2, animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
        SOVEREIGN GROUND TRUTH
      </div>
      <div style={{
        fontSize: 9, color: 'rgba(0,255,255,0.15)', maxWidth: 300, textAlign: 'center', lineHeight: 1.4,
        animation: 'fadeInUp 0.4s ease-out 0.15s both',
      }}>
        Cryptographic identity, encrypted storage, Daubert-compliant chain of custody.
      </div>

      {/* ── SE19 Step 1: Cryptographic Identity Panel ── */}
      <div className="glass-card accent-teal" style={{
        padding: '8px 12px', width: '100%', maxWidth: 320,
        animation: 'fadeInUp 0.35s ease-out 0.2s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: didInitialized ? '#7DDFB6' : '#F08080',
              boxShadow: didInitialized ? '0 0 6px #7DDFB6' : '0 0 6px #F08080',
            }} />
            <span style={{ fontSize: 10, color: '#00FFFF', letterSpacing: 1, textShadow: '0 0 8px rgba(0,255,255,0.15)' }}>
              Ed25519 IDENTITY
            </span>
          </div>
          <button type="button" onClick={handleCopyDid} className="glass-btn" style={{
            padding: '2px 8px',
            color: didCopied ? '#00FFFF' : 'rgba(0,255,255,0.25)',
            fontSize: 8, letterSpacing: 0.5,
          }}>
            {didCopied ? 'COPIED' : 'COPY DID'}
          </button>
        </div>
        <div role="status" aria-label="DID key status" style={{
          fontSize: 10, color: '#00FFFF',
          wordBreak: 'break-all', lineHeight: 1.4,
          textShadow: '0 0 12px rgba(0,255,255,0.1)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 0.3, marginBottom: 8,
        }}>
          {didInitialized ? didKey : 'AWAITING BOOT...'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={handleExportJWK}
            disabled={!didInitialized}
            className="glass-btn"
            style={{
              flex: 1, padding: '5px 8px', fontSize: 9, letterSpacing: 1,
              color: didInitialized ? '#00FFFF' : 'rgba(0,255,255,0.2)',
              border: '1px solid rgba(0,255,255,0.1)',
              opacity: didInitialized ? 1 : 0.4,
            }}
          >
            EXPORT JWK
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="glass-btn"
            style={{
              flex: 1, padding: '5px 8px', fontSize: 9, letterSpacing: 1,
              color: '#FFAA00',
              border: '1px solid rgba(255,170,0,0.2)',
            }}
          >
            IMPORT JWK
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,.jwk"
            onChange={handleImportJWK}
            aria-label="Import identity file"
            style={{ display: 'none' }}
          />
        </div>
        {identityStatus && (
          <div role="status" style={{
            fontSize: 9, marginTop: 4,
            color: identityStatus.startsWith('Error') ? '#F08080' : '#7DDFB6',
          }}>
            {identityStatus}
          </div>
        )}
      </div>

      {/* Node identity — session hash */}
      <div className="glass-card accent-teal" style={{
        padding: '8px 12px', width: '100%', maxWidth: 320,
        animation: 'fadeInUp 0.35s ease-out 0.24s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: '#00FFFF', letterSpacing: 1, textShadow: '0 0 8px rgba(0,255,255,0.15)' }}>
            SESSION NODE
          </div>
          <button type="button" onClick={handleCopyId} className="glass-btn" style={{
            padding: '2px 8px',
            color: copied ? '#00FFFF' : 'rgba(0,255,255,0.25)',
            fontSize: 8, letterSpacing: 0.5,
          }}>
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <div role="status" aria-label="Session node hash" style={{
          fontSize: 11, color: '#00FFFF',
          wordBreak: 'break-all', lineHeight: 1.4,
          textShadow: '0 0 12px rgba(0,255,255,0.1)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 0.3,
        }}>
          {displayHash}
        </div>
      </div>

      {/* Vault status */}
      <div className="glass-card accent-amber" style={{
        padding: '8px 12px', width: '100%', maxWidth: 320,
        animation: 'fadeInUp 0.35s ease-out 0.28s both',
      }}>
        <div style={{ fontSize: 10, color: '#ff9944', marginBottom: 8, letterSpacing: 1, textShadow: '0 0 8px rgba(255,153,68,0.15)' }}>
          VAULT STATUS
        </div>
        <div role="status" aria-label="Vault statistics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 9 }}>layers</div>
            <div style={{ color: '#ff9944', fontWeight: 600 }}>{vaultLayerCount}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 9 }}>encryption</div>
            <div style={{ color: '#44ffaa', fontSize: 10, fontWeight: 600, textShadow: '0 0 8px rgba(68,255,170,0.15)' }}>
              AES-256-GCM
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 9 }}>protocol LOVE</div>
            <div style={{ color: '#BF5FFF', fontWeight: 600 }}>
              {protocolWallet ? protocolWallet.totalEarned.toFixed(1) : '0.0'}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 9 }}>transactions</div>
            <div style={{ color: '#00FFFF', fontWeight: 600 }}>{protocolTxCount}</div>
          </div>
        </div>
      </div>

      {/* ── SE19 Step 2: Centaur Engine Config ── */}
      <div className="glass-card accent-violet" style={{
        padding: '8px 12px', width: '100%', maxWidth: 320,
        animation: 'fadeInUp 0.35s ease-out 0.32s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: llmKey ? '#7DDFB6' : '#F08080',
              boxShadow: llmKey ? '0 0 6px #7DDFB6' : '0 0 6px #F08080',
            }} />
            <span style={{ fontSize: 10, color: '#BF5FFF', letterSpacing: 1, textShadow: '0 0 8px rgba(191,95,255,0.15)' }}>
              CENTAUR ENGINE
            </span>
          </div>
          <button type="button" onClick={() => setShowKey(v => !v)} className="glass-btn" aria-label={showKey ? 'Hide API key' : 'Show API key'} style={{
            padding: '2px 8px', color: 'rgba(255,255,255,0.12)', fontSize: 8, letterSpacing: 0.5,
          }}>
            {showKey ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        {/* Engine selector */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)', marginBottom: 3 }}>ENGINE</div>
          <select
            value={llmEngine}
            onChange={handleEngineChange}
            aria-label="AI engine selection"
            className="glass-input"
            style={{
              fontSize: 10, padding: '5px 8px', letterSpacing: 0.5,
              width: '100%', appearance: 'auto',
              background: 'rgba(255,255,255,0.015)',
              color: '#BF5FFF',
            }}
          >
            <option value="claude-sonnet">Claude 3.5 Sonnet</option>
            <option value="gemini-pro">Gemini 1.5 Pro</option>
          </select>
        </div>
        {/* API key input */}
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.12)', marginBottom: 3 }}>API KEY</div>
        <input
          type={showKey ? 'text' : 'password'}
          value={llmKey}
          onChange={(e) => {
            const v = e.target.value;
            setLlmKey(v);
            try { localStorage.setItem('p31_llm_key', v); } catch {}
          }}
          placeholder={llmEngine === 'claude-sonnet' ? 'sk-ant-...' : 'AI...'}
          aria-label="API key"
          className="glass-input"
          style={{ fontSize: 10, padding: '6px 8px', letterSpacing: 0.5 }}
          autoComplete="off"
          spellCheck={false}
        />
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.1)', marginTop: 4, lineHeight: 1.4 }}>
          Stored in localStorage. Never proxied.
        </div>
      </div>

      {/* ── SE19 Step 3: Genesis Sync Telemetry Log ── */}
      <div className="glass-card accent-blue" style={{
        padding: '8px 12px', width: '100%', maxWidth: 320,
        animation: 'fadeInUp 0.35s ease-out 0.36s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: genesisSyncStatus === 'synced' ? '#7DDFB6' : genesisSyncStatus === 'syncing' ? '#00FFFF' : '#F08080',
              boxShadow: `0 0 6px ${genesisSyncStatus === 'synced' ? '#7DDFB6' : '#00FFFF'}`,
              animation: genesisSyncStatus === 'syncing' ? 'lockPulse 1.5s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 10, color: '#00FFFF', letterSpacing: 1, textShadow: '0 0 8px rgba(0,255,255,0.15)' }}>
              GENESIS SYNC LOG
            </span>
          </div>
          <span role="status" aria-label="Sync event count" style={{ fontSize: 9, color: 'rgba(0,255,255,0.15)' }}>
            {syncEvents.length} events
          </span>
        </div>
        <div
          ref={syncLogRef}
          style={{
            maxHeight: 120, overflow: 'auto', fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: 6,
            border: '1px solid rgba(0,255,255,0.08)',
          }}
        >
          {syncEvents.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.08)', textAlign: 'center', padding: 8 }}>
              No sync events yet
            </div>
          ) : (
            syncEvents.map((ev, i) => {
              const ts = ev.timestamp.split('T')[1]?.split('.')[0] ?? ev.timestamp;
              const dirColor = ev.direction === 'push' ? '#7DDFB6' : '#FFAA00';
              const hashShort = ev.serverHash.length > 12 ? ev.serverHash.slice(0, 12) + '..' : ev.serverHash;
              return (
                <div key={`${ev.timestamp}-${i}`} style={{
                  display: 'flex', gap: 4, lineHeight: 1.6,
                  borderBottom: '1px solid rgba(255,255,255,0.015)',
                }}>
                  <span style={{ color: 'rgba(0,255,255,0.15)' }}>[{ts}]</span>
                  <span style={{ color: dirColor, fontWeight: 600 }}>{ev.direction.toUpperCase()}</span>
                  <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                  <span style={{ color: '#00FFFF' }}>{hashShort}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Encrypted layers */}
      <div className="glass-card accent-green" style={{
        padding: '8px 12px', width: '100%', maxWidth: 320,
        animation: 'fadeInUp 0.35s ease-out 0.4s both',
      }}>
        <div style={{ fontSize: 10, color: '#44ffaa', marginBottom: 8, letterSpacing: 1, textShadow: '0 0 8px rgba(68,255,170,0.15)' }}>
          ENCRYPTED LAYERS
        </div>
        {(['telemetry', 'love-ledger', 'bonds', 'game-state'] as const).map((layer, idx) => (
          <div key={layer} style={{
            animation: 'fadeInUp 0.3s ease-out',
            animationDelay: `${0.4 + idx * 0.08}s`,
            animationFillMode: 'both',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 11, padding: '5px 0',
              borderBottom: '1px solid rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LockIcon color={LAYER_COLORS[layer]} pulsing />
                <span style={{ color: 'rgba(0,255,255,0.25)' }}>{layer}</span>
              </div>
              <span style={{
                color: LAYER_COLORS[layer], fontSize: 9, letterSpacing: 1,
                textShadow: `0 0 8px ${LAYER_COLORS[layer]}33`,
                fontWeight: 600,
              }}>LOCKED</span>
            </div>
            {idx < 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <ChainLink
                  from={LAYER_ICONS[layer]}
                  to={LAYER_ICONS[(['telemetry', 'love-ledger', 'bonds', 'game-state'] as const)[idx + 1]]}
                  color={LAYER_COLORS[layer]}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── SE19 Step 4: Export buttons ── */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 6, animation: 'fadeInUp 0.35s ease-out 0.48s both' }}>
        {/* Vault JSON export */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || !nodeId}
          className="glass-card accent-red"
          style={{
            width: '100%',
            padding: '8px 12px',
            cursor: exporting || !nodeId ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            fontSize: 12,
            letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace",
            color: exporting ? 'rgba(0,255,255,0.15)' : '#ff4466',
            textShadow: exporting ? 'none' : '0 0 12px rgba(255,68,102,0.2)',
            transition: isReflex ? 'none' : 'all 0.2s',
            backgroundSize: '200% 100%',
            animation: exporting ? 'exportScan 1.5s linear infinite' : 'none',
          }}
        >
          {exporting ? 'EXPORTING...' : 'EXPORT FOR DISCLOSURE'}
        </button>
        {exporting && (
          <div className="progress-track" style={{ marginTop: -2 }}>
            <div className="progress-fill" style={{
              background: 'linear-gradient(90deg, #ff4466, #ff9944)',
              width: `${exportProgress * 100}%`,
            }} />
          </div>
        )}

        {/* Daubert signed export */}
        <button
          type="button"
          onClick={handleDaubertExport}
          className="glass-card accent-amber"
          style={{
            width: '100%',
            padding: '8px 12px',
            cursor: 'pointer',
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: 2,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#FFAA00',
            textShadow: '0 0 10px rgba(255,170,0,0.2)',
            transition: isReflex ? 'none' : 'all 0.2s',
          }}
        >
          GENERATE DAUBERT EXPORT
        </button>
      </div>

      {lastExport && (
        <div role="status" style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', animation: 'fadeInUp 0.3s ease-out' }}>
          Last exported: {new Date(lastExport).toLocaleString()}
        </div>
      )}
    </div>
  );
}
