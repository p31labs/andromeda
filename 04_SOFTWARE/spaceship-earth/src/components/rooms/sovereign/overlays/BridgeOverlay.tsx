// BridgeOverlay — Full-screen LOVE economy dashboard overlay.

import { BridgeRoom } from '../../BridgeRoom';
import { useSovereignStore } from '../../../../sovereign/useSovereignStore';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

export function BridgeOverlay() {
  const { love, spoons, maxSpoons, tier } = useSovereignStore();
  return (
    <div style={fullScreen}>
      <BridgeRoom love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />
    </div>
  );
}
