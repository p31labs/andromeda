// ColliderOverlay — Full-screen Particle Collider / Organic Forge overlay.

import { ColliderRoom } from '../../ColliderRoom';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

export function ColliderOverlay() {
  return (
    <div style={fullScreen}>
      <ColliderRoom />
    </div>
  );
}
