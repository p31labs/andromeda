// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// VoxelAtom: living breathing atoms
//
// Each atom is an IcosahedronGeometry(0.5, 2) with
// MeshDistortMaterial from drei. The "living" effect
// comes from three layers:
//   1. Asymmetric breathing (scale oscillation)
//   2. Gentle rotation drift
//   3. Excitement-driven distortion (0.15 calm → 0.5 excited)
//
// Emissive intensity >1.0 with toneMapped=false triggers
// selective bloom via the postprocessing EffectComposer.
// ═══════════════════════════════════════════════════════

import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { ElementData } from '../types';
import { playAtomNote } from '../engine/sound';
import { useGameStore } from '../store/gameStore';

export interface PersonalityAnimationHint {
  speed: number;      // 0–1
  pulse: boolean;
  vibrate: boolean;
  scale: number;      // 0.8–1.5
}

interface VoxelAtomProps {
  element: ElementData;
  position: [number, number, number];
  onClick?: () => void;
  isHighlighted?: boolean;
  excitement?: number; // 0–1, driven by game state
  personalityHint?: PersonalityAnimationHint | null;
}

// Shared geometry — icosahedron detail 2 = 320 faces
const ATOM_GEOMETRY = new THREE.IcosahedronGeometry(0.5, 2);

export const VoxelAtom = memo(function VoxelAtom({
  element,
  position,
  onClick,
  isHighlighted,
  excitement = 0,
  personalityHint,
}: VoxelAtomProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const breathing = useGameStore((s) => s.breathing);

  // Deterministic per-atom phase from position — pure, no Math.random()
  const phaseOffset =
    (position[0] * 127.1 + position[1] * 311.7 + position[2] * 523.3) %
    (Math.PI * 2);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime + phaseOffset;

    let scale: number;
    let breathe: number;

    if (breathing) {
      // 4-4-6 breathing pacer: 14s cycle
      const cycle = 14;
      const bt = state.clock.elapsedTime % cycle;
      let breathScale = 1.0;
      if (bt < 4) {
        breathScale = 1.0 + 0.1 * (bt / 4);              // inhale
      } else if (bt < 8) {
        breathScale = 1.1;                                  // hold
      } else {
        breathScale = 1.1 - 0.1 * ((bt - 8) / 6);        // exhale
      }
      scale = breathScale * element.size;
      breathe = (breathScale - 1.0) / 0.1; // normalize to 0-1 for emissive
    } else {
      // Normal asymmetric breathing: 45% inhale, 55% exhale
      breathe = Math.pow(Math.sin(t * 0.8) * 0.5 + 0.5, 0.85);
      const baseScale = 0.95 + breathe * 0.05; // ±2.5%
      const pScale = pHint ? pHint.scale : 1.0;
      scale = (baseScale + excitement * 0.1) * element.size * pScale;
    }
    meshRef.current.scale.setScalar(scale);

    // Gentle rotation drift
    meshRef.current.rotation.y += 0.002 + excitement * 0.005;

    // Emissive pulse — intensity >1.0 triggers selective bloom
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const emissiveBase = 1.4 + breathe * 0.6;
      const pulseBoost = pHint?.pulse ? 1.0 + Math.sin(t * 3.0) * 0.5 : 0;
      mat.emissiveIntensity = isHighlighted
        ? 3.0
        : emissiveBase * (1.0 + excitement * 1.5) + pulseBoost;
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    playAtomNote(element.frequency);
    if (onClick) onClick();
  };

  // Excitement → distort parameters, personality overrides on completion
  const pHint = personalityHint;
  const distort = pHint
    ? 0.15 + pHint.speed * 0.5 + (pHint.vibrate ? 0.2 : 0)
    : 0.15 + excitement * 0.35;
  const speed = pHint
    ? 2.0 + pHint.speed * 6.0
    : 1.5 + excitement * 3.5;

  return (
    <Float
      speed={1.2 + excitement * 0.8}
      rotationIntensity={0.15}
      floatIntensity={0.2}
    >
      <mesh
        ref={meshRef}
        position={position}
        geometry={ATOM_GEOMETRY}
        onPointerDown={handlePointerDown}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <MeshDistortMaterial
          color={element.color}
          emissive={element.emissive}
          emissiveIntensity={1.4}
          toneMapped={false}
          distort={distort}
          speed={speed}
          roughness={0.3}
          metalness={0.1}
          flatShading
        />
      </mesh>
    </Float>
  );
});
