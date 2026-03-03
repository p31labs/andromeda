// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// BondBeam: WCD-13 → WCD-19 — Tensegrity Bonds
//
// Glowing cylinder connecting two bonded atoms.
// Color is blended 50/50 from the emissive colors of
// both connected elements.
//
// WCD-13: Idle sine-wave pulse on emissiveIntensity.
// New bonds get a rapid 1-second flash before settling
// into the idle pulse.
//
// WCD-19: Bond length clipped to shell surfaces.
// Cylinder no longer pierces through the glass shell.
// ═══════════════════════════════════════════════════════

import { useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ElementSymbol } from '../types';
import { ELEMENTS } from '../data/elements';

interface BondBeamProps {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  fromElement: ElementSymbol;
  toElement: ElementSymbol;
}

export const BondBeam = memo(function BondBeam({ start, end, fromElement, toElement }: BondBeamProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const birthTime = useRef<number | null>(null);

  const { position, quaternion, length, color } = useMemo(() => {
    const s = new THREE.Vector3(start.x, start.y, start.z);
    const e = new THREE.Vector3(end.x, end.y, end.z);
    const dir = e.clone().sub(s).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );
    const c1 = new THREE.Color(ELEMENTS[fromElement].emissive);
    const c2 = new THREE.Color(ELEMENTS[toElement].emissive);
    const blended = c1.lerp(c2, 0.5);

    // WCD-19 + WCD-30: Clip bond to shell surfaces.
    // Visual radius = 0.5 * clamped size (matching VoxelAtom's Math.min(0.65, size)).
    const fromRadius = 0.5 * Math.min(0.65, ELEMENTS[fromElement].size);
    const toRadius = 0.5 * Math.min(0.65, ELEMENTS[toElement].size);
    const overlap = 0.05; // embed slightly into glass to prevent 1-pixel gaps
    const surfaceFrom = s.clone().add(dir.clone().multiplyScalar(fromRadius - overlap));
    const surfaceTo = e.clone().sub(dir.clone().multiplyScalar(toRadius - overlap));
    const bondMid = surfaceFrom.clone().add(surfaceTo).multiplyScalar(0.5);
    const clippedLength = Math.max(0.1, surfaceFrom.distanceTo(surfaceTo));

    return { position: bondMid, quaternion: q, length: clippedLength, color: blended };
  }, [start.x, start.y, start.z, end.x, end.y, end.z, fromElement, toElement]);

  // WCD-13: Sine-wave pulse + birth flash
  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;

    // Record birth time on first frame
    if (birthTime.current === null) {
      birthTime.current = t;
    }

    const age = t - birthTime.current;

    // Birth flash: rapid 1-second flare then settle
    const flashBoost = age < 1.0
      ? 2.0 * (1.0 - age)  // decays from 2.0 → 0 over 1 second
      : 0;

    // Idle pulse: gentle sine wave between 0.2 and 0.8
    const idlePulse = 0.5 + Math.sin(t * 2.0) * 0.3;

    matRef.current.emissiveIntensity = idlePulse + flashBoost;
  });

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.6}
        toneMapped={false}
      />
    </mesh>
  );
});
