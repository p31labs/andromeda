import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh } from '@react-three/drei';
import type { HeavyBody } from '../engine/GravityPhysics';
import { GravityPhysics } from '../engine/GravityPhysics';
import { generateBloomTexture } from '../utils/bloomTexture';

const DUST_COUNT = 10000;

interface StarfieldProps {
  prngSeed: number;
  gravityPhysics: GravityPhysics; // The CPU physics engine instance
}

// Component for rendering the dust particles
const DustRing: React.FC<{ physics: GravityPhysics }> = ({ physics }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => physics.dustPositions, [physics]);

  // Procedural glow texture
  const particleTexture = useMemo(() => generateBloomTexture(), []);

  useFrame(() => {
    if (geometryRef.current) {
      geometryRef.current.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
          args={[positions.length]} 
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        map={particleTexture}
        size={0.5} // Adjust particle size
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        color={0x39ff14} // phos
      />
    </points>
  );
};

// Component for rendering heavy bodies
const HeavyBodies: React.FC<{ heavies: HeavyBody[] }> = ({ heavies }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    heavies.forEach((heavy, i) => {
      dummy.position.set(heavy.x, heavy.y, heavy.z);
      dummy.scale.setScalar(Math.cbrt(heavy.mass) * 0.1); // Scale based on mass
      dummy.rotation.setFromVector3(new THREE.Vector3(heavy.vx, heavy.vy, heavy.vz).normalize()); // Simple rotation based on velocity
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, heavies.length]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={0x00f5ff} /> {/* cyan */}
    </instancedMesh>
  );
};

const Starfield: React.FC<StarfieldProps> = ({ prngSeed, gravityPhysics }) => {

  useFrame((state, delta) => {
    // Ensure a reasonable delta time to avoid physics glitches on very fast/slow frames
    const physicsDelta = Math.min(delta, 1 / 30); // Cap delta at 30fps equivalent
    gravityPhysics.executeGravityTick(physicsDelta * 1000); // Scale delta to match typical physics expectations (e.g., ms)
  });

  return (
    <group>
      <HeavyBodies heavies={gravityPhysics.heavies} />
      <DustRing physics={gravityPhysics} />
    </group>
  );
};

export default Starfield;
