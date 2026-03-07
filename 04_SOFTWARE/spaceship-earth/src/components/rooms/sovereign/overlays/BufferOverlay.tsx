// BufferOverlay — Full-screen voltage/fawn/chaos processing overlay.

import { BufferRoom } from '../../BufferRoom';

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

export function BufferOverlay() {
  return (
    <div style={fullScreen}>
      <BufferRoom />
    </div>
  );
}
