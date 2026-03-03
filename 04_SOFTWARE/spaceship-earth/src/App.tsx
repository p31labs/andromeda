// spaceship-earth/src/App.tsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { JitterbugNavigator } from './components/JitterbugNavigator';
import { CockpitHUD } from './components/hud/CockpitHUD';
import { DEFAULT_VERTICES } from './types/navigator.types';

export default function App() {
  const [spoons] = useState(12);
  const [maxSpoons] = useState(20);
  const [love] = useState(577); // matches what's showing in BONDING screenshots
  const spoonLevel = spoons / maxSpoons;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#050505',
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <JitterbugNavigator vertices={DEFAULT_VERTICES} spoonLevel={spoonLevel} />
      </Canvas>

      <CockpitHUD spoons={spoons} maxSpoons={maxSpoons} love={love} />
    </div>
  );
}
