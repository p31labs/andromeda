// ForgeOverlay — Full-screen Content Forge / Substack pipeline overlay.

import { ForgeRoom } from '../../ForgeRoom';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

export function ForgeOverlay() {
  return (
    <div style={fullScreen}>
      <ForgeRoom />
    </div>
  );
}
