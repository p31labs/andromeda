// spaceship-earth/src/components/rooms/ObservatoryRoom.tsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { JitterbugNavigator } from '../JitterbugNavigator';
import { DEFAULT_VERTICES } from '../../types/navigator.types';

export function ObservatoryRoom() {
  const [spoonLevel] = useState(0.6);

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ touchAction: 'none' }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <JitterbugNavigator vertices={DEFAULT_VERTICES} spoonLevel={spoonLevel} />
    </Canvas>
  );
}
