/**
 * @file DeltaMesh.tsx — Tetrahedron K4 Mesh 3D Visualizer
 *
 * Renders the K4 complete graph (4 nodes, 6 edges) in 3D space.
 * Visualizes the Delta topology for systemic resilience awareness.
 *
 * Section 1.2: Tetrahedron Protocol - K4 Complete Graph
 * Mathematical Foundation: Isostatic rigidity, 57.7% capacity at single-node loss
 *
 * Features:
 * - 4-node tetrahedron with floating animation
 * - Edge rendering (6 equidistant edges)
 * - Ollivier-Ricci curvature proxy (κ) calculation
 * - Discrete Ricci Flow Graph Embedding (dRfge) scale oscillation
 *
 * CWP-JITTERBUG-15: Delta Topology Visualizer
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { EquilibriumState } from '../../hooks/useEquilibrium';
import { getStageColor, type GrowthStage } from '../../lib/theme/stageColors';

export interface DeltaMeshNode {
  id: string;
  position: THREE.Vector3;
  label: string;
  isGateway?: boolean;
}

export interface DeltaMeshEdge {
  from: number;
  to: number;
}

/**
 * Generate K4 complete graph node positions (regular tetrahedron)
 * Vertices of a regular tetrahedron inscribed in a sphere of radius 1
 */
export function generateK4Nodes(): DeltaMeshNode[] {
  // Regular tetrahedron vertices (normalized)
  const positions = [
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-0.9428, -0.3333, 0),
    new THREE.Vector3(0.4714, -0.3333, 0.8165),
    new THREE.Vector3(0.4714, -0.3333, -0.8165),
  ];

  return positions.map((pos, i) => ({
    id: `node_${i}`,
    position: pos.multiplyScalar(1.5), // Scale up for visibility
    label: i === 0 ? 'GATEWAY' : `NODE_0${i}`,
    isGateway: i === 0,
  }));
}

/**
 * K4 complete graph edges (all pairs connected)
 */
export function generateK4Edges(): DeltaMeshEdge[] {
  const edges: DeltaMeshEdge[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      edges.push({ from: i, to: j });
    }
  }
  return edges;
}

/**
 * Calculate Ollivier-Ricci Curvature proxy (κ)
 * Based on local edge stress and network noise
 *
 * @param time - Current time for oscillation
 * @param networkStress - Optional stress factor from mesh
 * @returns κ value 0-2 (1 = optimal, <1 bottleneck, >1 expansive)
 */
export function calculateRicciCurvature(time: number, networkStress: number = 0): number {
  // Simulate Ricci flow adaptation: subtle oscillation around 1.0
  const baseCurvature = 1.0;
  const dRfgeOscillation = Math.sin(time * 0.5) * 0.2; // Slow breathing
  const stressImpact = networkStress * 0.3;

  return Math.max(0.2, Math.min(2.0, baseCurvature + dRfgeOscillation + stressImpact));
}

/**
 * Calculate 57.7% resilience threshold display value
 */
export function calculateResilienceThreshold(lostNodes: number): number {
  if (lostNodes === 0) return 100;
  if (lostNodes === 1) return 57.7; // Single node loss resilience
  if (lostNodes === 2) return 0;    // Collapse
  return 0;
}

interface DeltaMeshProps {
  showLabels?: boolean;
  scale?: number;
  equilibrium?: EquilibriumState;
}

export function DeltaMesh({
  showLabels = true,
  scale = 6,
  equilibrium,
}: DeltaMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  const nodes = useMemo(() => generateK4Nodes(), []);
  const edges = useMemo(() => generateK4Edges(), []);

  const stage = equilibrium?.stage ?? 'VOID';
  const baseColor = getStageColor(stage as GrowthStage);
  const rotationSpeed = equilibrium ? 0.1 + equilibrium.entropy * 0.3 : 0.15;
  const nodeScale = equilibrium ? 0.8 + (equilibrium.spoon / 10) * 0.4 : 1;

  useFrame(({ clock }, delta) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const pulse = 1 + Math.sin(t * (1 + (equilibrium?.entropy || 1))) * 0.03 * (equilibrium?.entropy || 1);
      groupRef.current.scale.setScalar(pulse);
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.rotation.x += delta * rotationSpeed * 0.3;
    }
  });

  const gatewayColor = '#00FF88';
  const nodeColor = baseColor;
  const edgeColor = '#7A27FF';
  const emissiveIntensity = 0.3 + (equilibrium?.entropy || 0.5) * 0.5;

  const edgeEntries = useMemo(() => edges.map((edge) => {
    const startNode = nodes[edge.from];
    const endNode = nodes[edge.to];
    return {
      key: `edge_${edge.from}_${edge.to}`,
      start: [startNode.position.x, startNode.position.y, startNode.position.z] as [number, number, number],
      end: [endNode.position.x, endNode.position.y, endNode.position.z] as [number, number, number],
    };
  }), [edges, nodes]);

  return (
    <group scale={scale}>
    <group ref={groupRef}>
      {/* Render Nodes */}
      {nodes.map((node, index) => (
        <Float
          key={node.id}
          speed={2}
          rotationIntensity={0.3}
          floatIntensity={0.4}
        >
          <mesh position={node.position}>
            <sphereGeometry args={[0.12 * nodeScale, 32, 32]} />
            <meshStandardMaterial
              color={node.isGateway ? gatewayColor : nodeColor}
              emissive={node.isGateway ? gatewayColor : nodeColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.2}
              metalness={0.5}
            />
          </mesh>

          {/* Node Label */}
          {showLabels && (
            <Text
              position={[node.position.x, node.position.y + 0.25, node.position.z]}
              fontSize={0.08}
              color="#E8ECF4"
              anchorX="center"
              anchorY="middle"
              font={`${import.meta.env.BASE_URL}fonts/JetBrainsMono-Bold.ttf`}
            >
              {node.label}
            </Text>
          )}
        </Float>
      ))}

      {/* Render Edges (K4 = 6 edges) */}
      {edgeEntries.map(({ key, start, end }) => (
        <Line
          key={key}
          points={[start, end]}
          color={edgeColor}
          lineWidth={0.02}
          transparent
          opacity={0.6}
        />
      ))}

      {/* Central stress indicator (shows network health) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08 * nodeScale, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
    </group>
  );
}

export default DeltaMesh;
