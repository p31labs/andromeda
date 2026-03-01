// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// BondBeam: glowing cylinder connecting two bonded atoms
//
// Color is blended 50/50 from the emissive colors of
// both connected elements. toneMapped=false means the
// emissive glow feeds into the bloom pass.
// ═══════════════════════════════════════════════════════

import { useMemo, memo } from 'react';
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
  const { position, quaternion, length, color } = useMemo(() => {
    const s = new THREE.Vector3(start.x, start.y, start.z);
    const e = new THREE.Vector3(end.x, end.y, end.z);
    const mid = s.clone().add(e).multiplyScalar(0.5);
    const dist = s.distanceTo(e);
    const dir = e.clone().sub(s).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );
    const c1 = new THREE.Color(ELEMENTS[fromElement].emissive);
    const c2 = new THREE.Color(ELEMENTS[toElement].emissive);
    const blended = c1.lerp(c2, 0.5);
    return { position: mid, quaternion: q, length: dist, color: blended };
  }, [start.x, start.y, start.z, end.x, end.y, end.z, fromElement, toElement]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        toneMapped={false}
      />
    </mesh>
  );
});
