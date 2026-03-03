// spaceship-earth/src/components/rooms/BridgeRoom.tsx
import React from 'react';

interface Props {
  love: number;
  spoons: number;
  maxSpoons: number;
}

export function BridgeRoom({ love, spoons, maxSpoons }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      gap: 24,
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: 4 }}>THE BRIDGE</h1>
      <div style={{ fontSize: 48 }}>💜 {love.toLocaleString()}</div>
      <div style={{ color: '#94a3b8', fontSize: 14 }}>
        L.O.V.E. — Ledger of Ontological Volume and Entropy
      </div>
      <div style={{ color: '#64748b', fontSize: 13, marginTop: 16 }}>
        🥄 {spoons}/{maxSpoons} spoons remaining
      </div>
    </div>
  );
}
