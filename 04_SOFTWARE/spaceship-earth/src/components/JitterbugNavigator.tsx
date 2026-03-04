import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { jitterbugVertices, jitterbugEdges } from './JitterbugGeometry';
import type { JitterbugVertex } from '../types/navigator.types';

interface Props {
  vertices: JitterbugVertex[];
  spoonLevel: number; // 0-1, drives tetra↔cubocta morph
  scale?: number;
}

export function JitterbugNavigator({ vertices, spoonLevel, scale = 1.5 }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  // Slow organic rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.x += delta * 0.05;
    }
  });

  const positions = useMemo(
    () => jitterbugVertices(spoonLevel),
    [spoonLevel]
  );

  const activeCount = spoonLevel < 0.3 ? 4 : Math.min(vertices.length, positions.length);
  const edges = useMemo(
    () => jitterbugEdges(activeCount),
    [activeCount]
  );

  return (
    <group ref={groupRef} scale={scale}>
      {/* Vertex points */}
      {positions.slice(0, activeCount).map((pos, i) => {
        const vertex = vertices[i];
        if (!vertex) return null;
        const brightness = 0.3 + vertex.value * 0.7;
        return (
          <mesh key={vertex.id} position={pos}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial
              color={vertex.color}
              emissive={vertex.color}
              emissiveIntensity={brightness}
            />
          </mesh>
        );
      })}

      {/* Edges as lines */}
      {edges.map(([a, b], i) => {
        if (a >= positions.length || b >= positions.length) return null;
        const points = [positions[a], positions[b]];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <lineSegments key={`edge-${i}`} geometry={geometry}>
            <lineBasicMaterial color="#334155" opacity={0.5} transparent />
          </lineSegments>
        );
      })}
    </group>
  );
}
