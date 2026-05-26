import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { GravityPhysics, HeavyBody } from '../../engine/GravityPhysics';
import Starfield from '../../components/Starfield';

const LowEnergyView: React.FC = () => {
  const prngSeed = 1234;
  const gravityPhysics = useMemo(() => {
    const physics = new GravityPhysics(prngSeed);
    // Example initial heavy bodies for observation
    physics.addHeavyBody({ id: 1, mass: 1000, x: -5, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    physics.addHeavyBody({ id: 2, mass: 800, x: 5, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    return physics;
  }, [prngSeed]);

  return (
    <div className="p-4 bg-void text-white min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4 text-cyan">Low Energy View (1 Spoon)</h1>
      <p className="mb-4 text-phos">Mechanic: Observatory. Watch deterministic planetary bodies and 10,000 dust particles orbit a central binary star system based on saved gravity_events. No user input.</p>
      <div className="flex-grow" style={{ background: '#05050A' }}>
        <Canvas camera={{ position: [0, 10, 30], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 0]} intensity={1} color={0x00f5ff} /> {/* Cyan star */}
          <pointLight position={[0, 0, 0]} intensity={1} color={0x39ff14} /> {/* Phos star */}
          <Starfield prngSeed={prngSeed} gravityPhysics={gravityPhysics} />
        </Canvas>
      </div>
    </div>
  );
};

export default LowEnergyView;
