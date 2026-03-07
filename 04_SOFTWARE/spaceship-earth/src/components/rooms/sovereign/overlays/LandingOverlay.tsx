// LandingOverlay — Full-screen P31 landing / showcase page overlay.

import { LandingRoom } from '../../LandingRoom';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
};

export function LandingOverlay() {
  return (
    <div style={fullScreen}>
      <LandingRoom />
    </div>
  );
}
