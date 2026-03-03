// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// GhostSite: WCD-30 — Ethereal bond indicators
//
// Small pulsing spheres showing where atoms CAN snap.
// Visible only during drag. When snapped, glows green.
// ═══════════════════════════════════════════════════════

import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GhostSiteProps {
  position: [number, number, number];
  color: string;
  isSnapped?: boolean;
}

// WCD-30: Small sphere (0.12 radius), not 0.3 icosahedron
const GHOST_GEOMETRY = new THREE.SphereGeometry(0.12, 16, 16);

export const GhostSite = memo(function GhostSite({ position, color, isSnapped }: GhostSiteProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Gentle scale pulse when snapped
    const targetScale = isSnapped ? 1.6 : 1.0;
    const current = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(
      current + (targetScale - current) * 0.15,
    );

    // WCD-30: Breathing opacity pulse (0.1–0.2 idle, 0.3–0.5 snapped)
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      const pulse = Math.sin(t * 2) * 0.5 + 0.5;
      mat.opacity = isSnapped ? 0.3 + pulse * 0.2 : 0.1 + pulse * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={GHOST_GEOMETRY}>
      <meshBasicMaterial
        color={isSnapped ? '#4ade80' : color}
        transparent
        opacity={0.15}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
});
