// spaceship-earth/src/components/hud/SpoonGauge.tsx
import { memo, useMemo } from 'react';

interface Props {
  spoons: number;
  maxSpoons: number;
  love: number;
  tier: string;
}

export const SpoonGauge = memo(function SpoonGauge({ spoons, maxSpoons, love, tier }: Props) {
  const tierColor = tier === 'REFLEX' ? '#ff6b6b' : tier === 'PATTERN' ? '#f7dc6f' : '#4ecdc4';
  const pct = useMemo(() => `${Math.round((spoons / maxSpoons) * 100)}%`, [spoons, maxSpoons]);
  const loveStr = useMemo(() => love.toLocaleString(), [love]);

  return (
    <div className="glass-card spoon-gauge">
      <div className="spoon-gauge-row">
        <span className="spoon-gauge-label">spoons</span>
        <span className="spoon-gauge-value">{spoons}/{maxSpoons}</span>
        <span className="spoon-gauge-tier" style={{ color: tierColor, textShadow: `0 0 8px ${tierColor}44` }}>
          {tier}
        </span>
      </div>
      <div className="progress-track spoon-gauge-track">
        <div className="progress-fill" style={{
          background: `linear-gradient(90deg, ${tierColor}, ${tierColor}88)`,
          width: pct,
        }} />
      </div>
      <div className="spoon-gauge-love">
        <span className="spoon-gauge-love-label">LOVE</span>
        <span className="spoon-gauge-love-value">{loveStr}</span>
      </div>
    </div>
  );
});
