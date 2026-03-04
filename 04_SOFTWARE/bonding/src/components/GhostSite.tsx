// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// GhostSite — Holographic ring invitations
//
// Big enough to see, bright enough to beckon.
// Outer ring + inner dot so each site reads clearly
// even at distance. Rotates, breathes, pulses.
// When snapped: expands, goes green, unmissable.
// ═══════════════════════════════════════════════════════

import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GhostSiteProps {
  position: [number, number, number];
  color: string;
  isSnapped?: boolean;
}

// Ring sized to be clearly visible next to atoms (0.5 scale)
const RING_GEOMETRY = new THREE.TorusGeometry(0.25, 0.02, 8, 32);
// Small dot at center so the site reads even head-on
const DOT_GEOMETRY = new THREE.SphereGeometry(0.06, 12, 12);

export const GhostSite = memo(function GhostSite({ position, color, isSnapped }: GhostSiteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current || !ringRef.current || !dotRef.current) return;
    const t = state.clock.elapsedTime;

    // Rotation: ring slowly spins + gentle wobble
    ringRef.current.rotation.y += 0.025;
    ringRef.current.rotation.x = Math.sin(t * 0.6) * 0.4;

    // Scale: expand when snapped, breathe when idle
    const breathe = 1.0 + Math.sin(t * 2.5) * 0.12;
    const targetScale = isSnapped ? 1.8 : breathe;
    const current = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(current + (targetScale - current) * 0.12);

    // Ring opacity: clearly visible idle, bright when snapped
    const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
    const pulse = 0.3 + Math.sin(t * 3) * 0.12;
    ringMat.opacity = isSnapped ? 0.7 + Math.sin(t * 4) * 0.15 : pulse;

    // Dot opacity: synced but slightly offset
    const dotMat = dotRef.current.material as THREE.MeshBasicMaterial;
    const dotPulse = 0.35 + Math.sin(t * 3 + 1) * 0.15;
    dotMat.opacity = isSnapped ? 0.9 : dotPulse;
  });

  const ringColor = isSnapped ? '#4ade80' : color;

  return (
    <group ref={groupRef} position={position}>
      {/* Outer ring */}
      <mesh ref={ringRef} geometry={RING_GEOMETRY}>
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Center dot */}
      <mesh ref={dotRef} geometry={DOT_GEOMETRY}>
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});
