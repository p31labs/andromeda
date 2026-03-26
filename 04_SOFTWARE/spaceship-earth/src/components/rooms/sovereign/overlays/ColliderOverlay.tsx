// ColliderOverlay — Full-screen Particle Collider / Organic Forge overlay.
// Now includes GPS-based Wye/Delta topology mode via ColliderMode

import { useState } from 'react';
import { ColliderRoom } from '../../ColliderRoom';
import { ColliderMode } from '@p31/bonding';

// Target: Tony Robbin's Quasicrystal Sculpture (Jacksonville) 
// or Point Peter Landing (St. Marys). Default to Jacksonville.
const COLLIDER_ANCHOR = { lat: 30.3322, lon: -81.4700 };

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

const toggleStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 100,
  padding: '8px 16px',
  background: 'rgba(0, 212, 255, 0.2)',
  border: '1px solid #00D4FF',
  borderRadius: 8,
  color: '#E8ECF4',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'monospace',
};

export function ColliderOverlay() {
  const [gpsMode, setGpsMode] = useState(false);
  
  return (
    <div style={fullScreen}>
      <button 
        style={toggleStyle} 
        onClick={() => setGpsMode(!gpsMode)}
      >
        {gpsMode ? '[DELTA GPS]' : '[WYE PARTICLES]'}
      </button>
      {gpsMode ? (
        <ColliderMode 
          anchorLat={COLLIDER_ANCHOR.lat} 
          anchorLon={COLLIDER_ANCHOR.lon}
        />
      ) : (
        <ColliderRoom />
      )}
    </div>
  );
}
