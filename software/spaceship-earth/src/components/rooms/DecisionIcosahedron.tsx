/**
 * @file DecisionIcosahedron.tsx — Quantum 8-Ball Icosahedron
 *
 * 3D glass icosahedron that visualizes the current decision stage
 * from the Quantum Magic 8 Ball engine.
 *
 * Stage mapping (jitterbug → visual):
 *  - VOID      -> dark, slow rotation, dim glow  (idle)
 *  - SEED      -> faint pulse, very slow
 *  - SPROUT    -> brighter, moderate rotation
 *  - SAPLING   -> active glow, faster rotation
 *  - BLOOM     -> bright pulse, inviting click
 *  - FRUIT     -> solid glow, steady (action ready / executed)
 *
 * Click runs a short "roll" animation and emits the current
 * recommendation via onRollComplete.
 */
import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Text } from '@react-three/drei';
import { getStageColor } from '../../lib/theme/stageColors';

export interface DecisionIcosahedronProps {
  stage: 'VOID' | 'SEED' | 'SPROUT' | 'SAPLING' | 'BLOOM' | 'FRUIT';
  confidence: number;
  topLabel?: string;
  topScore?: number;
  onClick?: () => void;
  scale?: number | [number, number, number];
  position?: [number, number, number];
}

export function DecisionIcosahedron({
  stage,
  confidence,
  topLabel = 'awaiting evaluation',
  topScore,
  onClick,
  position = [0, 0, 0],
  scale = 6,
}: DecisionIcosahedronProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rollRef = useRef<{ speed: number; t: number }>({ speed: 0, t: 0 });
  const isRolling = useRef(false);

  const color = useMemo(() => getStageColor(stage), [stage]);
  const glowIntensity = useMemo(() => {
    const map: Record<string, number> = { VOID: 0.05, SEED: 0.15, SPROUT: 0.35, SAPLING: 0.6, BLOOM: 0.9, FRUIT: 0.7 };
    return map[stage] ?? 0.1;
  }, [stage]);
  const baseRotationSpeed = useMemo(() => {
    const map: Record<string, number> = { VOID: 0.05, SEED: 0.1, SPROUT: 0.25, SAPLING: 0.45, BLOOM: 0.7, FRUIT: 0.55 };
    return map[stage] ?? 0.1;
  }, [stage]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isRolling.current) {
      rollRef.current.t += delta;
      groupRef.current.rotation.y += delta * 8;
      groupRef.current.rotation.x += delta * 2.5;
      if (rollRef.current.t > 0.9) {
        isRolling.current = false;
        rollRef.current.t = 0;
      }
    } else {
      const speed = baseRotationSpeed;
      groupRef.current.rotation.y += delta * speed;
      groupRef.current.rotation.x += delta * speed * 0.4;
    }
  });

  const handleClick = () => {
    if (isRolling.current) return;
    isRolling.current = true;
    rollRef.current.t = 0;
    onClick?.();
  };

  return (
    <group position={position} scale={scale}>
      <Float speed={baseRotationSpeed * 1.3} floatIntensity={glowIntensity * 0.6}>
        <group ref={groupRef} onClick={handleClick}>
        {/* Glass icosahedron */}
        <mesh>
          <icosahedronGeometry args={[1.15, 0]} />
          <MeshTransmissionMaterial
            backside
            thickness={0.55}
            roughness={0.08}
            transmission={0.85}
            ior={1.35}
            chromaticAberration={0.25}
            color={color}
            transparent
          />
        </mesh>
        {/* Inner glow wireframe */}
        <mesh>
          <icosahedronGeometry args={[1.05, 0]} />
          <meshBasicMaterial
            color={color}
            wireframe
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.15 + glowIntensity * 0.35}
          />
        </mesh>
        {/* Label floating inside */}
        <Text
          position={[0, 0, 0]}
          fontSize={0.22}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.4}
          lineHeight={1.1}
        >
          {topLabel}
          {typeof topScore === 'number' ? `\n${topScore}` : ''}
        </Text>
      </group>
    </Float>
  </group>
  );
}

export default DecisionIcosahedron;
