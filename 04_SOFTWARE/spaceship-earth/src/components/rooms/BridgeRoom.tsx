// spaceship-earth/src/components/rooms/BridgeRoom.tsx
import React from 'react';
import { useNode } from '../../contexts/NodeContext';

interface Props {
  love: number;
  spoons: number;
  maxSpoons: number;
  tier: string;
}

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

export function BridgeRoom({ love, spoons, maxSpoons, tier }: Props) {
  const { protocolWallet, vesting, protocolTxCount } = useNode();

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
    }}>
      <h1 style={{
        fontSize: 22, fontWeight: 300, letterSpacing: 6,
        background: 'linear-gradient(90deg, #c9b1ff, #4ecdc4)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>THE BRIDGE</h1>
      <div style={{ fontSize: 9, color: '#3a5a6a', letterSpacing: 2 }}>HONORING HUMAN LIMITS</div>

      {/* Game LOVE */}
      <div style={ACCENT_PANEL('#c9b1ff')}>
        <div style={{ fontSize: 10, color: '#c9b1ff', letterSpacing: 1, textShadow: '0 0 8px rgba(201,177,255,0.3)' }}>GAME LOVE</div>
        <div style={{ fontSize: 28, fontWeight: 300, color: '#e8ecf2', marginTop: 4 }}>{love.toLocaleString()}</div>
        <div style={{ fontSize: 9, color: '#3a4a5a', marginTop: 4 }}>from BONDING (molecule building)</div>
      </div>

      {/* Protocol LOVE */}
      <div style={ACCENT_PANEL('#4ecdc4')}>
        <div style={{ fontSize: 10, color: '#4ecdc4', letterSpacing: 1 }}>PROTOCOL LOVE</div>
        <div style={{ fontSize: 24, fontWeight: 300, color: '#e8ecf2', marginTop: 4 }}>
          {(protocolWallet?.totalEarned ?? 0).toFixed(1)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, fontSize: 10 }}>
          <div><span style={{ color: '#3a4a5a' }}>sovereignty</span><br /><span style={{ color: '#c9b1ff' }}>{(protocolWallet?.sovereigntyPool ?? 0).toFixed(1)}</span></div>
          <div><span style={{ color: '#3a4a5a' }}>available</span><br /><span style={{ color: '#4ecdc4' }}>{(protocolWallet?.availableBalance ?? 0).toFixed(1)}</span></div>
          <div><span style={{ color: '#3a4a5a' }}>care score</span><br /><span style={{ color: '#f7dc6f' }}>{((protocolWallet?.careScore ?? 0) * 100).toFixed(0)}%</span></div>
          <div><span style={{ color: '#3a4a5a' }}>spent</span><br /><span style={{ color: '#ff9944' }}>{((protocolWallet?.totalEarned ?? 0) - (protocolWallet?.availableBalance ?? 0) - (protocolWallet?.sovereigntyPool ?? 0)).toFixed(1)}</span></div>
        </div>
      </div>

      {/* Spend LOVE */}
      <div style={ACCENT_PANEL('#ff9944')}>
        <div style={{ fontSize: 10, color: '#ff9944', letterSpacing: 1 }}>SPEND LOVE</div>
        <div style={{ marginTop: 8, fontSize: 10 }}>
          {[
            { label: 'Unlock Panel', desc: 'Reveal Observatory Axis', cost: 5 },
            { label: 'Gift to S.J.', desc: 'Increase vesting', cost: 10 },
            { label: 'Boost Spoons', desc: '+2 temporary spoons', cost: 3 },
            { label: 'Donate', desc: 'Send to P31 Labs', cost: 1 },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(40,60,80,0.12)', color: '#5a6a7a' }}>
              <div>
                <div style={{ color: '#8a9aaa' }}>{item.label}</div>
                <div style={{ fontSize: 8, color: '#3a4a5a' }}>{item.desc}</div>
              </div>
              <span style={{ color: '#ff9944' }}>{item.cost} 💜</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vesting */}
      <div style={ACCENT_PANEL('#44aaff')}>
        <div style={{ fontSize: 10, color: '#44aaff', letterSpacing: 1 }}>VESTING</div>
        <div style={{ marginTop: 8 }}>
          {vesting.map((v) => (
            <div key={v.node.initials} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span>{v.node.initials}</span>
                <span style={{ color: '#4ecdc4' }}>{v.vestedPercent}%</span>
              </div>
              <div style={{ fontSize: 9, color: '#2a3a4a' }}>
                age {v.ageYears} — {v.vestedAmount.toFixed(1)} vested
                {v.nextMilestone && (
                  <span> — next at {v.nextMilestone.ageYears} ({v.daysUntilNext?.toLocaleString()}d)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status */}
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#2a3a4a' }}>
        <span>{spoons}/{maxSpoons} spoons</span>
        <span style={{ color: tier === 'REFLEX' ? '#ff6b6b' : tier === 'PATTERN' ? '#f7dc6f' : '#4ecdc4', fontWeight: 600 }}>{tier}</span>
      </div>
    </div>
  );
}
