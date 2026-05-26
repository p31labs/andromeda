import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import type { HeavyBody } from '../../engine/GravityPhysics';
import { GravityPhysics } from '../../engine/GravityPhysics';
import Starfield from '../../components/Starfield';
import * as THREE from 'three';

const SLINGSHOT_STRENGTH_MULTIPLIER = 0.0005;

const SlingshotOverlay: React.FC<{ onLaunch: (velocity: THREE.Vector3) => void }> = ({
  onLaunch,
}) => {
  const { viewport } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<THREE.Vector2 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector2 | null>(null);

  const handlePointerDown = useCallback((event: any) => {
    setIsDragging(true);
    setStartPoint(new THREE.Vector2(event.clientX, event.clientY));
    setCurrentPoint(new THREE.Vector2(event.clientX, event.clientY));
    event.stopPropagation();
  }, []);

  const handlePointerMove = useCallback((event: any) => {
    if (isDragging && startPoint) {
      setCurrentPoint(new THREE.Vector2(event.clientX, event.clientY));
    }
  }, [isDragging, startPoint]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    if (startPoint && currentPoint) {
      const dragVector = new THREE.Vector2().subVectors(startPoint, currentPoint);
      const velocity = new THREE.Vector3(
        (dragVector.x / viewport.width) * viewport.factor * SLINGSHOT_STRENGTH_MULTIPLIER, 
        0, 
        (dragVector.y / viewport.height) * viewport.factor * SLINGSHOT_STRENGTH_MULTIPLIER
      ); 
      onLaunch(velocity);
    }
    setStartPoint(null);
    setCurrentPoint(null);
  }, [startPoint, currentPoint, viewport, onLaunch]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 1000,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // End drag if mouse leaves window
    >
      {isDragging && startPoint && currentPoint && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={currentPoint.x}
            y2={currentPoint.y}
            stroke="#da70d6" // Orchid color
            strokeWidth="3"
          />
        </svg>
      )}
    </div>
  );
};

const MediumEnergyView: React.FC = () => {
  const prngSeed = 5678;
  const gravityPhysics = useMemo(() => {
    const physics = new GravityPhysics(prngSeed);
    physics.addHeavyBody({ id: 1, mass: 1500, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    return physics;
  }, [prngSeed]);

  const handleCometLaunch = useCallback((velocity: THREE.Vector3) => {
    const newComet: HeavyBody = {
      id: gravityPhysics.heavies.length + 1,
      mass: 50, // Small mass for a comet
      x: 0, y: 0, z: 0,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
    };
    gravityPhysics.addHeavyBody(newComet);
    console.log("Comet launched!", newComet);
  }, [gravityPhysics]);

  return (
    <div className="p-4 bg-void text-white min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4 text-cyan">Medium Energy View (3 Spoons)</h1>
      <p className="mb-4 text-phos">Mechanic: Slingshot Trajectory. Drag back like a slingshot to launch a single comet. The goal is to achieve the longest orbit duration without crashing into a heavy body.</p>
      <div className="flex-grow" style={{ background: '#05050A' }}>
        <Canvas camera={{ position: [0, 20, 0], rotation: [-Math.PI / 2, 0, 0], fov: 60 }}>
          <OrthographicCamera makeDefault position={[0, 20, 0]} zoom={20} />
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 0]} intensity={1} color={0x00f5ff} />
          <Starfield prngSeed={prngSeed} gravityPhysics={gravityPhysics} />
        </Canvas>
      </div>
      <SlingshotOverlay onLaunch={handleCometLaunch} />
    </div>
  );
};

export default MediumEnergyView;
