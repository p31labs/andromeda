import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { HeavyBody } from '../../engine/GravityPhysics';
import { GravityPhysics } from '../../engine/GravityPhysics';
import Starfield from '../../components/Starfield';
import * as THREE from 'three';
import { PGlite } from '@electric-sql/pglite';

const HighEnergyView: React.FC = () => {
  const prngSeed = 9876;
  const gravityPhysics = useMemo(() => {
    const physics = new GravityPhysics(prngSeed);
    // Initial heavy bodies for high energy view
    physics.addHeavyBody({ id: 1, mass: 2000, x: -10, y: 0, z: 0, vx: 0.001, vy: 0, vz: 0 });
    physics.addHeavyBody({ id: 2, mass: 1800, x: 10, y: 0, z: 0, vx: -0.001, vy: 0, vz: 0 });
    return physics;
  }, [prngSeed]);

  const lastEventTime = useRef(0);
  const pglite = useRef<PGlite | null>(null);

  useEffect(() => {
    if (!pglite.current) {
      pglite.current = new PGlite();
      // Additional setup like connecting and schema application would be here
    }
  }, []);

  const InteractionPlane: React.FC<{ onSpawnHeavy: (position: THREE.Vector3) => void }> = ({
    onSpawnHeavy,
  }) => {
    const { raycaster, camera, scene } = useThree();
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []); // Plane at Z=0
    const intersectPoint = useRef(new THREE.Vector3());

    const handlePointerDown = useCallback((event: any) => {
      event.stopPropagation();
      raycaster.setFromCamera(event.pointer, camera);
      raycaster.ray.intersectPlane(plane, intersectPoint.current);
      if (intersectPoint.current) {
        onSpawnHeavy(intersectPoint.current.clone());
      }
    }, [raycaster, camera, plane, onSpawnHeavy]);

    return (
      <mesh
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        visible={false} // Invisible interaction plane
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    );
  };

  const handleSpawnHeavy = useCallback(async (position: THREE.Vector3) => {
    const now = Date.now();
    if (now - lastEventTime.current > 500) { // Throttle heavy body spawning
      const newHeavy: HeavyBody = {
        id: gravityPhysics.heavies.length + 1,
        mass: Math.random() * 500 + 100, // Random mass
        x: position.x, y: position.y, z: position.z,
        vx: (Math.random() - 0.5) * 0.0005,
        vy: (Math.random() - 0.5) * 0.0005,
        vz: (Math.random() - 0.5) * 0.0005,
      };
      gravityPhysics.addHeavyBody(newHeavy);
      console.log("Spawned Heavy Body:", newHeavy);

      // Dispatch to PGLite
      if (pglite.current) {
        try {
          await pglite.current.query(
            `INSERT INTO gravity_events (session_id, sequence_id, event_type, event_time_ms, payload) VALUES ($1, $2, $3, $4, $5)`,
            [
              'test-session-high', // Example session ID
              Date.now(), // Using timestamp as sequence_id
              'SPAWN_HEAVY',
              now,
              JSON.stringify({ mass: newHeavy.mass, posX: newHeavy.x, posY: newHeavy.y, posZ: newHeavy.z, velX: newHeavy.vx, velY: newHeavy.vy, velZ: newHeavy.vz })
            ]
          );
          console.log(`SPAWN_HEAVY event logged for heavy body ${newHeavy.id}`);
        } catch (error) {
          console.error("Error logging SPAWN_HEAVY event to PGLite:", error);
        }
      }
      lastEventTime.current = now;
    }
  }, [gravityPhysics]);

  return (
    <div className="p-4 bg-void text-white min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4 text-orchid">High Energy View (6 Spoons)</h1>
      <p className="mb-4 text-phos">Mechanic: System Architect. Free-cam 3D environment. Click to spawn Heavy Bodies with specific masses. Watch the immediate, chaotic impact on the stardust rings as gravity wells rip through them. Co-op mode allows two users to balance the system's angular momentum.</p>
      <div className="flex-grow" style={{ background: '#05050A' }}>
        <Canvas camera={{ position: [0, 10, 30], fov: 60 }} dpr={[1, 2]}> {/* dpr for better quality */}
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 0]} intensity={1} color={0x00f5ff} />
          <pointLight position={[0, 0, 0]} intensity={1} color={0x39ff14} />
          <Starfield prngSeed={prngSeed} gravityPhysics={gravityPhysics} />
          <InteractionPlane onSpawnHeavy={handleSpawnHeavy} />
        </Canvas>
      </div>
    </div>
  );
};

export default HighEnergyView;
