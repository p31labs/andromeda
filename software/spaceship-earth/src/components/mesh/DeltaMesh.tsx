 *
 * Renders the K4 complete graph (4 nodes, 6 edges) in 3D space.
 * Visualizes the Delta topology for systemic resilience awareness.
 *
 * Section 1.2: Tetrahedron Protocol - K4 Complete Graph
 * Mathematical Foundation: Isostatic rigidity, 57.7% capacity at single-node loss
 *
 *
import { Float, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { EquilibriumState } from '../../hooks/useEquilibrium';
import { getStageColor, type GrowthStage } from '../../lib/theme/stageColors';

 *

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

  const gatewayColor = 'var(--color-phosphor)';
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
            <sphereGeometry args={[0.12 * nodeScale, 32, 32]} />
            <meshStandardMaterial
              color={node.isGateway ? gatewayColor : nodeColor}
              emissive={node.isGateway ? gatewayColor : nodeColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.2}
              metalness={0.5}
            />
          </mesh>

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
    </group>
  );
}

export default DeltaMesh;
