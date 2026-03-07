// ResonanceOverlay — Full-screen conversation-to-music engine overlay.

import { ResonanceRoom } from '../../ResonanceRoom';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

export function ResonanceOverlay() {
  return (
    <div style={fullScreen}>
      <ResonanceRoom />
    </div>
  );
}
