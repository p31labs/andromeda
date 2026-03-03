// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// VoxelAtom: WCD-15 → WCD-17 → WCD-18 → WCD-19 — Smoky Orbs
//
// Two-part mesh per atom:
//   1. Shell: meshStandardMaterial + Fresnel rim + inner wash
//      via onBeforeCompile. Sharp bright edges, soft diffuse
//      center glow — volumetric glass illusion.
//   2. Core: meshBasicMaterial + NormalBlending + smoothstep fade
//      via onBeforeCompile. Dense smoky center, transparent
//      edges — volumetric "contained matter" look.
//   3. Label: drei Text — element symbol.
//
// Breathing, rotation drift, personality hints, and
// excitement modulation all preserved.
// ═══════════════════════════════════════════════════════

import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, Float, Text } from '@react-three/drei';
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

// Shared geometries — allocated once, reused by all atoms.
// WCD-18: SphereGeometry for smooth normals (required for plasma fade shader).
const SHELL_GEOMETRY = new THREE.SphereGeometry(0.5, 32, 32);
const CORE_GEOMETRY = new THREE.SphereGeometry(0.5, 32, 32);

export const VoxelAtom = memo(function VoxelAtom({
  element,
  position,
  onClick,
  isHighlighted,
  excitement = 0,
  personalityHint,
}: VoxelAtomProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const breathing = useGameStore((s) => s.breathing);

  // WCD-18: Ambient Glass Shell — Fresnel rim + soft inner wash.
  // Memoized so the material doesn't recompile every render.
  const shellCompile = useMemo(() => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vViewPos;
           varying vec3 vWorldNormal;`,
        )
        .replace(
          '#include <fog_vertex>',
          `#include <fog_vertex>
           vWorldNormal = normalize(transformedNormal);
           vViewPos = -mvPosition.xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vViewPos;
           varying vec3 vWorldNormal;`,
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           vec3 sn = normalize(vWorldNormal);
           vec3 sv = normalize(vViewPos);
           float rimIntensity = 1.0 - max(dot(sv, sn), 0.0);
           float rim = pow(rimIntensity, 3.0);
           float innerWash = pow(max(dot(sv, sn), 0.0), 1.5) * 0.35;
           gl_FragColor.a *= max(rim, innerWash);
           gl_FragColor.rgb += gl_FragColor.rgb * rim * 2.0;
           gl_FragColor.rgb += gl_FragColor.rgb * innerWash;`,
        );
    };
  }, []);

  // WCD-19: Smoky Core — dense center, transparent edges via smoothstep.
  // NormalBlending makes it look like contained matter, not pure light.
  const coreCompile = useMemo(() => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vCoreNormal;
           varying vec3 vCoreViewPos;`,
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
           vCoreNormal = normalize(normalMatrix * normal);
           vCoreViewPos = -mvPosition.xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vCoreNormal;
           varying vec3 vCoreViewPos;`,
        )
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `vec3 cn = normalize(vCoreNormal);
           vec3 cv = normalize(vCoreViewPos);
           float smoke = smoothstep(0.0, 1.0, max(dot(cn, cv), 0.0));
           vec4 diffuseColor = vec4( diffuse, opacity * smoke );`,
        );
    };
  }, []);

  // Deterministic per-atom phase from position — pure, no Math.random()
  const phaseOffset =
    (position[0] * 127.1 + position[1] * 311.7 + position[2] * 523.3) %
    (Math.PI * 2);

  const pHint = personalityHint;

  // WCD-19: Cap visual size so largest atoms (Ca, Cl, S) are max ~2.5x H.
  // Original sizes range 0.25 (H) → 1.26 (S). Clamped to [0.25, 0.65].
  const clampedSize = Math.min(0.65, element.size);

  useFrame((state) => {
    if (!groupRef.current) return;
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
      scale = breathScale * clampedSize;
      breathe = (breathScale - 1.0) / 0.1; // normalize to 0-1
    } else {
      // Normal asymmetric breathing: 45% inhale, 55% exhale
      breathe = Math.pow(Math.sin(t * 0.8) * 0.5 + 0.5, 0.85);
      const baseScale = 0.95 + breathe * 0.05; // ±2.5%
      const pScale = pHint ? pHint.scale : 1.0;
      scale = (baseScale + excitement * 0.1) * clampedSize * pScale;
    }
    groupRef.current.scale.setScalar(scale);

    // Gentle rotation drift
    groupRef.current.rotation.y += 0.002 + excitement * 0.005;

    // WCD-19: Core color modulation — NormalBlending, smoke volume.
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      const emissiveBase = 0.8 + breathe * 0.4;
      const pulseBoost = pHint?.pulse ? 0.3 + Math.sin(t * 3.0) * 0.2 : 0;
      const intensity = isHighlighted
        ? 1.5
        : emissiveBase * (1.0 + excitement * 0.5) + pulseBoost;
      mat.color.set(element.emissive).multiplyScalar(intensity);

      // Personality vibrate: rapid core oscillation
      if (pHint?.vibrate) {
        coreRef.current.scale.setScalar(0.95 + Math.sin(t * 20) * 0.02);
      }
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    playAtomNote(element.frequency);
    if (onClick) onClick();
  };

  return (
    <Float
      speed={1.2 + excitement * 0.8}
      rotationIntensity={0.15}
      floatIntensity={0.2}
    >
      <group
        ref={groupRef}
        position={position}
        onPointerDown={handlePointerDown}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {/* WCD-18: Ambient Glass Shell — Fresnel rim + inner wash.
            Sharp bright edges, soft diffuse center glow. */}
        <mesh geometry={SHELL_GEOMETRY}>
          <meshStandardMaterial
            transparent
            opacity={0.8}
            depthWrite={false}
            roughness={0.1}
            metalness={0.8}
            color={element.color}
            blending={THREE.AdditiveBlending}
            onBeforeCompile={shellCompile}
          />
        </mesh>

        {/* WCD-19 revised: Smoky Core — scale 0.95 fills the shell.
            AdditiveBlending restored for glow + visible breathing/pulse.
            smoothstep shader softens edges into volumetric cloud. */}
        <mesh ref={coreRef} geometry={CORE_GEOMETRY} scale={0.95}>
          <meshBasicMaterial
            color={element.emissive}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            onBeforeCompile={coreCompile}
          />
        </mesh>

        {/* WCD-11 + WCD-28: Element label — billboarded to always face camera */}
        <Billboard follow position={[0, 0, 0.35]}>
          <Text
            fontSize={0.22}
            color="white"
            anchorX="center"
            anchorY="middle"
            renderOrder={10}
            outlineWidth={0.02}
            outlineColor="black"
          >
            {element.symbol}
          </Text>
        </Billboard>
      </group>
    </Float>
  );
});
