// spaceship-earth/src/components/hud/SpoonGauge.tsx
import React from 'react';

interface Props {
  spoons: number;
  maxSpoons: number;
  love: number;
  tier: string;
}

export function SpoonGauge({ spoons, maxSpoons, love, tier }: Props) {
  const pct = Math.round((spoons / maxSpoons) * 100);
  const tierColor = tier === 'REFLEX' ? '#ff6b6b' : tier === 'PATTERN' ? '#f7dc6f' : '#4ecdc4';

  return (
    <div style={{
      background: 'rgba(2, 4, 6, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(40, 60, 80, 0.3)',
      borderRadius: 8,
      padding: '8px 12px',
      fontFamily: "'JetBrains Mono', monospace",
      color: '#c8d0dc',
      fontSize: 11,
      pointerEvents: 'auto',
      minWidth: 140,
      maxWidth: 200,
    }}>
      <div style={{ marginBottom: 4 }}>
        🥄 {spoons}/{maxSpoons} spoons
        <span style={{ color: tierColor, fontWeight: 600, marginLeft: 4, letterSpacing: 1 }}>
          {tier}
        </span>
      </div>
      <div style={{ color: '#c9b1ff', fontSize: 11 }}>
        💜 {love.toLocaleString()} L.O.V.E.
      </div>
    </div>
  );
}
