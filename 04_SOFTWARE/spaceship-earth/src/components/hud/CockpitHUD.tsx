// spaceship-earth/src/components/hud/CockpitHUD.tsx
import React from 'react';
import { SpoonGauge } from './SpoonGauge';

interface Props {
  spoons: number;
  maxSpoons: number;
  love: number;
  tier: string;
}

export function CockpitHUD({ spoons, maxSpoons, love, tier }: Props) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 10,
      pointerEvents: 'none',
      padding: 8,
    }}>
      <SpoonGauge spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
    </div>
  );
}
