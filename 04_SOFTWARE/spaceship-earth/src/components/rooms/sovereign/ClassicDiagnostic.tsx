import { useState, useCallback, useRef, useEffect } from 'react';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import { useNode } from '../../../contexts/NodeContext';
import * as genesis from '../../../services/genesisIdentity';

export const ClassicDiagnosticUI = () => {
  const {
    didKey, ucanStatus, crdtVersion, telemetryHashes, bleStatus, loraNodes, pwaStatus, audioEnabled,
    activeRoom, initIdentity, connectBLE, appendTelemetry, initAudio, exportLedger,
    genesisSyncStatus,
  } = useSovereignStore();

  const { nodeId, vaultLayerCount, exportVaultBundle, protocolWallet, protocolTxCount, vaultSync } = useNode();

  const [llmKey, setLlmKey] = useState(() => {
    try { return localStorage.getItem('p31_llm_key') ?? ''; } catch { return ''; }
  });
  const [showKey, setShowKey] = useState(false);
  const [llmEngine, setLlmEngine] = useState(() => {
    try { return localStorage.getItem('p31_llm_engine') ?? 'claude-sonnet'; } catch { return 'claude-sonnet'; }
  });
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [syncLogTick, setSyncLogTick] = useState(0);
  const syncLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setSyncLogTick((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (syncLogRef.current) syncLogRef.current.scrollTop = syncLogRef.current.scrollHeight;
  }, [syncLogTick]);

  const syncEvents = vaultSync?.syncEvents ?? [];
  const bleConnected = bleStatus.includes('CONNECTED');
  const didInitialized = didKey !== 'UNINITIALIZED';

  const handleEngineChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setLlmEngine(v);
    try { localStorage.setItem('p31_llm_engine', v); } catch {}
  }, []);

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

  const handleVaultExport = useCallback(async () => {
    setExporting(true);
    try {
      const bundle = await exportVaultBundle();
      if (!bundle) { setExporting(false); return; }
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
      console.error('[DevMenu] vault export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [exportVaultBundle]);

  const handleDaubertExport = useCallback(async () => {
    try {
      const events = vaultSync?.syncEvents ?? [];
      const did = didInitialized ? didKey : 'NO_DID';
      const lines = [
        '=== P31-OS DAUBERT CHAIN-OF-CUSTODY EXPORT ===',
        `DID: ${did}`,
        `Exported: ${new Date().toISOString()}`,
        `Events: ${events.length}`,
        '---',
        ...events.map((ev) => `[${ev.timestamp}] | ${ev.direction.toUpperCase()} | ${ev.serverHash}`),
        '---', '',
      ];
      const payload = lines.join('\n');
      const payloadBytes = new TextEncoder().encode(payload);
      let signatureHex = 'UNSIGNED';
      try {
        const sigBytes = await genesis.sign(payloadBytes);
        signatureHex = genesis.toHex(sigBytes);
      } catch { /* unsigned */ }
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
      console.error('[DevMenu] Daubert export failed:', err);
    }
  }, [vaultSync, didKey, didInitialized]);

  // Shared micro-styles
  const dot = (on: boolean): React.CSSProperties => ({
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 6, flexShrink: 0,
    background: on ? '#7DDFB6' : '#F08080',
    boxShadow: on ? '0 0 6px #7DDFB6' : 'none',
  });
  const lbl: React.CSSProperties = { color: '#7878AA', fontSize: 'clamp(8px, 1.1vh, 10px)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 };
  const val = (c: string): React.CSSProperties => ({ color: c, fontWeight: 600, fontSize: 'clamp(10px, 1.3vh, 13px)' });
  const card: React.CSSProperties = {
    background: '#000000', borderRadius: 10, padding: 'clamp(8px, 1.4vh, 16px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
  };
  const cardHead = (c: string): React.CSSProperties => ({
    fontSize: 'clamp(11px, 1.5vh, 16px)', fontWeight: 600, color: c,
    borderBottom: `1px solid ${c}22`, paddingBottom: 'clamp(4px, 0.6vh, 8px)',
    marginBottom: 'clamp(4px, 0.8vh, 10px)', flexShrink: 0,
  });
  const btn = (c: string): React.CSSProperties => ({
    background: 'transparent', border: `1px solid ${c}`, color: c,
    fontWeight: 600, cursor: 'pointer', borderRadius: 6,
    fontSize: 'clamp(9px, 1.1vh, 12px)', padding: 'clamp(4px, 0.6vh, 8px) clamp(6px, 1vh, 12px)',
    letterSpacing: '0.03em', fontFamily: 'inherit', flexShrink: 0,
  });
  const infoBox: React.CSSProperties = {
    background: '#000000', borderRadius: 6, padding: 'clamp(4px, 0.6vh, 8px)',
    border: '1px solid rgba(0,255,255,0.08)',
  };

  const didShort = didKey.length > 32 ? didKey.slice(0, 16) + '...' + didKey.slice(-12) : didKey;
  const nodeShort = nodeId && nodeId.length > 24 ? nodeId.slice(0, 20) + '...' : nodeId;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: '#000000', color: '#d8ffd8',
      fontFamily: "'Oxanium', sans-serif",
      marginTop: 44,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      padding: 'clamp(6px, 1vh, 14px) clamp(8px, 1.2vw, 20px)',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(0,255,255,0.2)',
        paddingBottom: 'clamp(4px, 0.6vh, 10px)',
        marginBottom: 'clamp(4px, 0.8vh, 12px)',
        flexShrink: 0,
      }}>
        <div>
          <span style={{
            fontSize: 'clamp(14px, 2vh, 22px)', fontWeight: 700, letterSpacing: '0.04em',
            background: 'linear-gradient(135deg, #FF00FF, #BF5FFF, #00FFFF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          } as React.CSSProperties}>
            Dev Menu
          </span>
          <span style={{ fontSize: 'clamp(9px, 1.1vh, 12px)', color: '#7878AA', marginLeft: 12 }}>
            P31-OS &middot; {activeRoom}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={initAudio}
            disabled={audioEnabled}
            style={{ ...btn('#BF5FFF'), opacity: audioEnabled ? 0.4 : 1 }}
          >
            {audioEnabled ? 'Sound On' : 'Enable Sound'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'clamp(9px, 1.1vh, 11px)' }}>
            <span style={dot(pwaStatus.includes('ACTIVE'))} />
            <span style={{ color: pwaStatus.includes('ACTIVE') ? '#7DDFB6' : '#FFD700', fontWeight: 600 }}>
              {pwaStatus.includes('ACTIVE') ? 'Offline Ready' : pwaStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 3x2 grid fills remaining space */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr 1fr',
        gap: 'clamp(4px, 0.6vh, 10px)',
      }}>
        {/* ── 1. Centaur Engine ── */}
        <div style={{ ...card, border: '1px solid rgba(0,255,255,0.15)' }}>
          <div style={cardHead('#BF5FFF')}>Centaur Engine</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.5vh, 8px)', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={dot(!!llmKey)} />
              <span style={val(llmKey ? '#7DDFB6' : '#F08080')}>{llmKey ? 'Key Set' : 'No Key'}</span>
            </div>
            <div>
              <div style={lbl}>Engine</div>
              <select
                value={llmEngine}
                onChange={handleEngineChange}
                title="LLM Engine"
                style={{
                  width: '100%', padding: 'clamp(3px, 0.4vh, 6px) 6px',
                  fontSize: 'clamp(10px, 1.2vh, 12px)',
                  background: '#000000', color: '#BF5FFF',
                  border: '1px solid rgba(0,255,255,0.2)',
                  borderRadius: 5, fontFamily: 'inherit', appearance: 'auto',
                }}
              >
                <option value="claude-sonnet">Claude Sonnet 4</option>
                <option value="gemini-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={lbl}>API Key</span>
                <button type="button" onClick={() => setShowKey(v => !v)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#7878AA', fontSize: 'clamp(7px, 0.9vh, 9px)', letterSpacing: '0.06em',
                }}>{showKey ? 'HIDE' : 'SHOW'}</button>
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={llmKey}
                onChange={(e) => {
                  const v = e.target.value;
                  setLlmKey(v);
                  try { localStorage.setItem('p31_llm_key', v); } catch {}
                }}
                placeholder={llmEngine === 'claude-sonnet' ? 'sk-ant-...' : 'AI...'}
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%', padding: 'clamp(3px, 0.4vh, 6px) 6px',
                  fontSize: 'clamp(10px, 1.2vh, 12px)',
                  background: '#000000', color: '#d8ffd8',
                  border: '1px solid rgba(0,255,255,0.15)',
                  borderRadius: 5, fontFamily: "'Space Mono', monospace",
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 'clamp(7px, 0.8vh, 9px)', color: '#4A4A7A', marginTop: 2 }}>
                localStorage only. Never proxied.
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Identity ── */}
        <div style={{ ...card, border: '1px solid rgba(255,105,180,0.15)' }}>
          <div style={cardHead('#FF00FF')}>Identity</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 6px)', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={dot(didInitialized)} />
              <span style={val(didInitialized ? '#7DDFB6' : '#F08080')}>
                {didInitialized ? 'Booted' : 'Not Init'}
              </span>
              <span style={{ marginLeft: 'auto', ...val(didInitialized ? '#7DDFB6' : '#F08080'), fontSize: 'clamp(8px, 1vh, 10px)' }}>
                {ucanStatus}
              </span>
            </div>
            <div style={{ ...infoBox, flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={lbl}>DID Key</div>
              <div style={{ fontSize: 'clamp(8px, 1vh, 11px)', color: didInitialized ? '#BF5FFF' : '#554466', wordBreak: 'break-all', lineHeight: 1.3 }}>
                {didShort}
              </div>
              {nodeId && (
                <>
                  <div style={{ ...lbl, marginTop: 'clamp(2px, 0.3vh, 4px)' }}>Session</div>
                  <div style={{ fontSize: 'clamp(8px, 1vh, 11px)', color: '#4ecdc4' }}>{nodeShort}</div>
                </>
              )}
            </div>
            {identityStatus && (
              <div style={{ fontSize: 'clamp(8px, 1vh, 10px)', fontWeight: 600, color: identityStatus.startsWith('Error') ? '#F08080' : '#7DDFB6' }}>
                {identityStatus}
              </div>
            )}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button type="button" onClick={initIdentity} style={{ ...btn('#FF00FF'), flex: 1 }}>Create</button>
              <button type="button" onClick={handleExportJWK} disabled={!didInitialized} style={{ ...btn('#4ecdc4'), flex: 1, opacity: didInitialized ? 1 : 0.3 }}>Export</button>
              <button type="button" onClick={() => importRef.current?.click()} style={{ ...btn('#FFD700'), flex: 1 }}>Import</button>
              <input ref={importRef} type="file" accept=".json,.jwk" title="Import JWK identity file" onChange={handleImportJWK} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        {/* ── 3. Connections ── */}
        <div style={{ ...card, border: '1px solid rgba(0,229,255,0.15)' }}>
          <div style={cardHead('#00FFFF')}>Connections</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.5vh, 8px)', minHeight: 0 }}>
            <div style={infoBox}>
              <div style={lbl}>Bluetooth</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={dot(bleConnected)} />
                <span style={val(bleConnected ? '#7DDFB6' : '#FFD700')}>{bleConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            <div style={infoBox}>
              <div style={lbl}>Nearby Devices</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={dot(bleConnected)} />
                <span style={val(bleConnected ? '#00FFFF' : '#554466')}>
                  {bleConnected ? `${loraNodes} found` : 'Searching...'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={connectBLE} style={btn('#00FFFF')}>Connect Device</button>
          </div>
        </div>

        {/* ── 4. Vault ── */}
        <div style={{ ...card, border: '1px solid rgba(255,68,102,0.15)' }}>
          <div style={cardHead('#ff4466')}>Vault</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 6px)', minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(2px, 0.3vh, 6px)', fontSize: 'clamp(9px, 1.1vh, 11px)' }}>
              <div><span style={lbl}>Layers</span> <span style={val('#ff9944')}>{vaultLayerCount}</span></div>
              <div><span style={lbl}>Encryption</span> <span style={val('#44ffaa')}>AES-256</span></div>
              <div><span style={lbl}>LOVE</span> <span style={val('#BF5FFF')}>{protocolWallet ? protocolWallet.totalEarned.toFixed(1) : '0.0'}</span></div>
              <div><span style={lbl}>Tx</span> <span style={val('#44aaff')}>{protocolTxCount}</span></div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {(['telemetry', 'love-ledger', 'bonds', 'game-state'] as const).map((layer) => {
                const c: Record<string, string> = { telemetry: '#4ecdc4', 'love-ledger': '#c9b1ff', bonds: '#44aaff', 'game-state': '#f7dc6f' };
                return (
                  <div key={layer} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 'clamp(9px, 1vh, 11px)', padding: 'clamp(1px, 0.2vh, 3px) 0',
                    borderBottom: '1px solid rgba(0,255,255,0.04)',
                  }}>
                    <span style={{ color: '#7878AA' }}>{layer}</span>
                    <span style={{ color: c[layer], fontSize: 'clamp(7px, 0.9vh, 9px)', fontWeight: 600, letterSpacing: 1 }}>LOCKED</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button type="button" onClick={handleVaultExport} disabled={exporting || !nodeId} style={{ ...btn('#ff4466'), flex: 1, opacity: (exporting || !nodeId) ? 0.4 : 1 }}>
                {exporting ? 'Exporting...' : 'Disclosure'}
              </button>
              <button type="button" onClick={handleDaubertExport} style={{ ...btn('#FFD700'), flex: 1 }}>Daubert</button>
            </div>
            {lastExport && <div style={{ fontSize: 'clamp(7px, 0.8vh, 9px)', color: '#4A4A7A', textAlign: 'center' }}>Exported: {new Date(lastExport).toLocaleTimeString()}</div>}
          </div>
        </div>

        {/* ── 5. Data ── */}
        <div style={{ ...card, border: '1px solid rgba(255,170,0,0.15)' }}>
          <div style={cardHead('#FFD700')}>Data</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 6px)', minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 'clamp(9px, 1.1vh, 11px)' }}>
              <div><span style={lbl}>Engine</span> <span style={val('#BF5FFF')}>Automerge</span></div>
              <div><span style={lbl}>Storage</span> <span style={val('#BF5FFF')}>Local</span></div>
              <div><span style={lbl}>Version</span> <span style={val('#FFD700')}>v{crdtVersion}</span></div>
            </div>
            <div style={{ ...infoBox, flex: 1, minHeight: 0, overflow: 'auto' }}>
              <div style={lbl}>Activity Log</div>
              {telemetryHashes.length === 0 ? (
                <span style={{ color: '#4A4A7A', fontStyle: 'italic', fontSize: 'clamp(9px, 1vh, 11px)' }}>No activity yet</span>
              ) : (
                <div style={{ fontSize: 'clamp(9px, 1vh, 11px)' }}>
                  {telemetryHashes.map((hash: string, i: number) => (
                    <div key={i} style={{ color: i % 2 === 0 ? '#FFD700' : '#BF5FFF', opacity: 1 - (i * 0.15) }}>{hash}...</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button type="button" onClick={appendTelemetry} style={{ ...btn('#FFD700'), flex: 1 }}>Record</button>
              <button type="button" disabled={telemetryHashes.length === 0} onClick={exportLedger} style={{ ...btn('#BF5FFF'), flex: 1, opacity: telemetryHashes.length === 0 ? 0.3 : 1 }}>Export</button>
            </div>
          </div>
        </div>

        {/* ── 6. Genesis Sync ── */}
        <div style={{ ...card, border: '1px solid rgba(68,170,255,0.15)' }}>
          <div style={cardHead('#44aaff')}>Genesis Sync</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 6px)', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                ...dot(genesisSyncStatus === 'synced'),
                background: genesisSyncStatus === 'synced' ? '#7DDFB6' : genesisSyncStatus === 'syncing' ? '#44AAFF' : '#F08080',
                boxShadow: genesisSyncStatus === 'synced' ? '0 0 6px #7DDFB6' : genesisSyncStatus === 'syncing' ? '0 0 6px #44AAFF' : 'none',
              }} />
              <span style={{ ...val(genesisSyncStatus === 'synced' ? '#7DDFB6' : genesisSyncStatus === 'syncing' ? '#44AAFF' : '#F08080'), textTransform: 'capitalize' }}>
                {genesisSyncStatus}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 'clamp(8px, 1vh, 10px)', color: '#4A4A7A' }}>
                {syncEvents.length} events
              </span>
            </div>
            <div
              ref={syncLogRef}
              style={{
                flex: 1, minHeight: 0, overflow: 'auto',
                fontSize: 'clamp(8px, 1vh, 10px)',
                fontFamily: "'Space Mono', monospace",
                background: '#000000', borderRadius: 6, padding: 'clamp(4px, 0.5vh, 8px)',
                border: '1px solid rgba(68,170,255,0.1)',
              }}
            >
              {syncEvents.length === 0 ? (
                <span style={{ color: '#4A4A7A', fontStyle: 'italic' }}>No sync events yet</span>
              ) : (
                syncEvents.map((ev, i) => {
                  const ts = ev.timestamp.split('T')[1]?.split('.')[0] ?? ev.timestamp;
                  const dirColor = ev.direction === 'push' ? '#7DDFB6' : '#FFD700';
                  const hashShort = ev.serverHash.length > 12 ? ev.serverHash.slice(0, 12) + '..' : ev.serverHash;
                  return (
                    <div key={`${ev.timestamp}-${i}`} style={{
                      display: 'flex', gap: 4, lineHeight: 1.6,
                      borderBottom: '1px solid rgba(0,255,255,0.03)',
                    }}>
                      <span style={{ color: '#4A4A7A' }}>[{ts}]</span>
                      <span style={{ color: dirColor, fontWeight: 600 }}>{ev.direction.toUpperCase()}</span>
                      <span style={{ color: '#44aaff' }}>{hashShort}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
