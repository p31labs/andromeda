// spaceship-earth/src/components/rooms/VaultRoom.tsx
// B4: Vault room — encrypted storage status + court-ready export.
import React, { useCallback, useState } from 'react';
import { useNode } from '../../contexts/NodeContext';

type ScopeTier = 'REFLEX' | 'PATTERN' | 'FULL';

const PANEL = (accent: string): React.CSSProperties => ({
  background: 'linear-gradient(135deg, rgba(6,10,16,0.8), rgba(6,10,16,0.6))',
  border: '1px solid rgba(40, 60, 80, 0.25)',
  borderLeft: `3px solid ${accent}`,
  borderRadius: 6,
  padding: '12px 16px',
  width: 300,
});

const LAYER_COLORS: Record<string, string> = {
  telemetry: '#4ecdc4',
  'love-ledger': '#c9b1ff',
  bonds: '#44aaff',
  'game-state': '#f7dc6f',
};

interface Props {
  tier: ScopeTier;
}

export function VaultRoom({ tier }: Props) {
  const { nodeId, vaultLayerCount, exportVaultBundle, protocolWallet, protocolTxCount } = useNode();
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const bundle = await exportVaultBundle();
      if (!bundle) {
        setExporting(false);
        return;
      }

      // Download as JSON file
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
    }
  }, [exportVaultBundle]);

  const isReflex = tier === 'REFLEX';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#c8d0dc',
      fontFamily: "'JetBrains Mono', monospace",
      gap: 16,
      overflow: 'auto',
      padding: '24px 16px',
      background: 'transparent',
    }}>
      <h1 style={{
        fontSize: 22, fontWeight: 300, letterSpacing: 6,
        background: 'linear-gradient(90deg, #ff4466, #ff9944)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>THE VAULT</h1>
      <div style={{ fontSize: 9, color: '#3a4a5a', letterSpacing: 2, marginTop: -8 }}>
        VERIFIABLE PROOF OF CARE
      </div>
      <div style={{ fontSize: 10, color: '#4a5a6a', maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
        AES-256-GCM encrypted storage. Telemetry chains, LOVE ledger, bond records.
        Court-ready export.
      </div>

      {/* Node identity */}
      <div style={PANEL('#4ecdc4')}>
        <div style={{ fontSize: 10, color: '#3a7a74', marginBottom: 4, letterSpacing: 1 }}>
          NODE IDENTITY
        </div>
        <div style={{
          fontSize: 12,
          color: '#4ecdc4',
          wordBreak: 'break-all',
          lineHeight: 1.4,
          textShadow: '0 0 12px rgba(78,205,196,0.2)',
        }}>
          {nodeId ?? 'not booted'}
        </div>
      </div>

      {/* Vault status */}
      <div style={PANEL('#ff9944')}>
        <div style={{ fontSize: 10, color: '#8a6633', marginBottom: 8, letterSpacing: 1 }}>
          VAULT STATUS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontSize: 12,
        }}>
          <div>
            <div style={{ color: '#4a5a6a', fontSize: 10 }}>layers</div>
            <div style={{ color: '#ff9944' }}>{vaultLayerCount}</div>
          </div>
          <div>
            <div style={{ color: '#4a5a6a', fontSize: 10 }}>encryption</div>
            <div style={{ color: '#44ffaa' }}>AES-256-GCM</div>
          </div>
          <div>
            <div style={{ color: '#4a5a6a', fontSize: 10 }}>protocol LOVE</div>
            <div style={{ color: '#c9b1ff' }}>{protocolWallet ? protocolWallet.totalEarned.toFixed(1) : '0.0'}</div>
          </div>
          <div>
            <div style={{ color: '#4a5a6a', fontSize: 10 }}>transactions</div>
            <div style={{ color: '#44aaff' }}>{protocolTxCount}</div>
          </div>
        </div>
      </div>

      {/* Layer breakdown */}
      <div style={PANEL('#44ffaa')}>
        <div style={{ fontSize: 10, color: '#3a7a5a', marginBottom: 8, letterSpacing: 1 }}>
          ENCRYPTED LAYERS
        </div>
        {(['telemetry', 'love-ledger', 'bonds', 'game-state'] as const).map(layer => (
          <div key={layer} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            padding: '4px 0',
            borderBottom: '1px solid rgba(100, 116, 139, 0.08)',
          }}>
            <span style={{ color: '#7a8a9a' }}>{layer}</span>
            <span style={{
              color: LAYER_COLORS[layer],
              fontSize: 9,
              letterSpacing: 1,
              textShadow: `0 0 8px ${LAYER_COLORS[layer]}44`,
            }}>LOCKED</span>
          </div>
        ))}
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting || !nodeId}
        style={{
          ...PANEL('#ff4466'),
          cursor: exporting || !nodeId ? 'default' : 'pointer',
          textAlign: 'center',
          fontSize: 12,
          letterSpacing: 2,
          color: exporting ? '#64748b' : '#ff4466',
          border: `1px solid ${exporting ? 'rgba(100,116,139,0.2)' : 'rgba(255,68,102,0.4)'}`,
          borderLeft: `3px solid ${exporting ? '#3a4a5a' : '#ff4466'}`,
          background: exporting ? 'rgba(6,10,16,0.6)' : 'rgba(255,68,102,0.05)',
          transition: isReflex ? 'none' : 'all 0.2s',
          textShadow: exporting ? 'none' : '0 0 12px rgba(255,68,102,0.3)',
        }}
      >
        {exporting ? 'EXPORTING...' : 'EXPORT FOR DISCLOSURE'}
      </button>

      {lastExport && (
        <div style={{ fontSize: 10, color: '#4a5a6a' }}>
          Last exported: {new Date(lastExport).toLocaleString()}
        </div>
      )}
    </div>
  );
}
