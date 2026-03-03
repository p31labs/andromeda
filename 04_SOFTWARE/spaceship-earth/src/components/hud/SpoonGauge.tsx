// spaceship-earth/src/components/hud/SpoonGauge.tsx
import React from 'react';

interface Props {
  spoons: number;
  maxSpoons: number;
  love: number;
}

export function SpoonGauge({ spoons, maxSpoons, love }: Props) {
  const pct = Math.round((spoons / maxSpoons) * 100);

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      borderRadius: 12,
      padding: '12px 16px',
      fontFamily: 'monospace',
      color: '#e2e8f0',
      fontSize: 13,
      pointerEvents: 'auto',
      minWidth: 200,
    }}>
      <div style={{ marginBottom: 6 }}>
        🥄 {spoons}/{maxSpoons} spoons
        <div style={{
          height: 4,
          background: '#1e293b',
          borderRadius: 2,
          marginTop: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct > 50 ? '#4ecdc4' : pct > 25 ? '#f7dc6f' : '#ff6b6b',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
      <div style={{ color: '#c9b1ff' }}>
        💜 {love.toLocaleString()} L.O.V.E.
      </div>
    </div>
  );
}
