// spaceship-earth/src/components/hud/CockpitHUD.tsx
import React from 'react';
import { SpoonGauge } from './SpoonGauge';

interface Props {
  spoons: number;
  maxSpoons: number;
  love: number;
}

/**
 * Cockpit HUD — glassmorphism panels overlaying the R3F canvas.
 * z-index doctrine from WCD-08:
 *   Canvas: z-1
 *   HUD Container: z-10 (pointer-events: none — passthrough)
 *   HUD Panels: z-11 (pointer-events: auto — per panel)
 *   Toasts: z-50
 *   Modals: z-60
 */
export function CockpitHUD({ spoons, maxSpoons, love }: Props) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 10,
      pointerEvents: 'none',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* Top-right: Spoon Gauge */}
      <div style={{ alignSelf: 'flex-end' }}>
        <SpoonGauge spoons={spoons} maxSpoons={maxSpoons} love={love} />
      </div>

      {/* Bottom panels will go here in future WCDs */}
    </div>
  );
}
