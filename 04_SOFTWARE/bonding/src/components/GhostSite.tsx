// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// GhostSite: pulsing indicators showing where atoms CAN snap
//
// These appear during drag. When the drag preview is near
// a ghost site, isSnapped becomes true and the ghost
// scales up + brightens — the "magnetic pull" effect.
// ═══════════════════════════════════════════════════════

import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GhostSiteProps {
  position: [number, number, number];
  color: string;
  isSnapped?: boolean;
}

// Lower detail icosahedron for ghost indicators
const GHOST_GEOMETRY = new THREE.IcosahedronGeometry(0.3, 1);

export const GhostSite = memo(function GhostSite({ position, color, isSnapped }: GhostSiteProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Pulse scale: larger when snapped (magnetic pull feel)
    const targetScale = isSnapped ? 1.4 : 1.0;
    const current = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(
      current + (targetScale - current) * 0.15,
    );

    // Pulse opacity
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const pulse = Math.sin(t * 3) * 0.5 + 0.5;
      mat.opacity = isSnapped ? 0.4 + pulse * 0.3 : 0.15 + pulse * 0.15;
      mat.emissiveIntensity = isSnapped ? 1.5 : 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={GHOST_GEOMETRY}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.2}
        toneMapped={false}
        flatShading
      />
    </mesh>
  );
});
