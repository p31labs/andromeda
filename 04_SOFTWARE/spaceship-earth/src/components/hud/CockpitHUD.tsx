// spaceship-earth/src/components/hud/CockpitHUD.tsx
import { memo } from 'react';
import { SpoonGauge } from './SpoonGauge';

interface Props {
  spoons: number;
  maxSpoons: number;
  love: number;
  tier: string;
}

export const CockpitHUD = memo(function CockpitHUD({ spoons, maxSpoons, love, tier }: Props) {
  return (
    <div className="cockpit-hud">
      <SpoonGauge spoons={spoons} maxSpoons={maxSpoons} love={love} tier={tier} />
    </div>
  );
});
