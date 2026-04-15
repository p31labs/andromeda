/**
 * @file PosnerMolecule.tsx — Posner Shield 3D Visualizer
 * Spoon-reactive distortion based on executive function state.
 * CWP-JITTERBUG-14: Post-Inertial Shield (Posner)
 */
import { useMemo } from 'react';
import { Stars, Icosahedron, MeshDistortMaterial } from '@react-three/drei';

interface PosnerMoleculeProps {
  spoons: number;
}

export function PosnerMolecule({ spoons }: PosnerMoleculeProps) {
  const color = spoons > 4 ? '#00D4FF' : '#EF4444';
  const distortAmount = spoons > 4 ? 0.3 : 0.5;
  const speed = spoons > 4 ? 2 : 5;

  return (
    <group>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Icosahedron args={[2, 1]}>
        <MeshDistortMaterial color={color} wireframe={true} distort={distortAmount} speed={speed} />
      </Icosahedron>
    </group>
  );
}

export default PosnerMolecule;