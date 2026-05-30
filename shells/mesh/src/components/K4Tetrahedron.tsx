import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';

type K4Node = {
  id: string;
  label: string;
  color: string;
  position: [number, number, number];
};

const k4Nodes: K4Node[] = [
  { id: 'will', label: 'Will', color: '#5DCAA5', position: [0, 1.2, 0] },
  { id: 'sj', label: 'S.J.', color: '#00d4ff', position: [-1.1, -0.4, 0.8] },
  { id: 'wj', label: 'W.J.', color: '#a78bfa', position: [1.1, -0.4, 0.8] },
  { id: 'infra', label: 'Infra', color: '#fbbf24', position: [0, -0.4, -1.3] },
];

const edges: [number, number][] = [
  [0, 1], [0, 2], [0, 3],
  [1, 2], [1, 3], [2, 3],
];

function NodeSphere({ node, isSelected, onClick }: { node: K4Node; isSelected: boolean; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={node.position}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isSelected ? 0.6 : 0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <Text
        position={[0, -0.35, 0]}
        fontSize={0.15}
        color="#e8e8e8"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {node.label}
      </Text>
    </group>
  );
}

function EdgeLine({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
  const lineRef = useRef<THREE.Line>(null);
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);

  useFrame((state) => {
    if (lineRef.current) {
      const opacity = 0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
      (lineRef.current.material as THREE.LineBasicMaterial).opacity = opacity;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={0.4}
    />
  );
}

function FloatingParticles() {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      ] as [number, number, number],
      speed: 0.2 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      const t = state.clock.elapsedTime * p.speed + p.offset;
      dummy.position.set(
        p.position[0] + Math.sin(t) * 0.15,
        p.position[1] + Math.cos(t * 0.7) * 0.15,
        p.position[2] + Math.sin(t * 0.5) * 0.15
      );
      dummy.scale.setScalar(0.015 + Math.sin(t * 2) * 0.005);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#5DCAA5" emissive="#5DCAA5" emissiveIntensity={0.5} transparent opacity={0.4} />
    </instancedMesh>
  );
}

function Scene({ selectedNode, onSelectNode }: { selectedNode: string | null; onSelectNode: (id: string) => void }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={0.8} color="#5DCAA5" />
      <pointLight position={[-3, -2, 2]} intensity={0.4} color="#00d4ff" />
      <pointLight position={[0, 3, -3]} intensity={0.3} color="#a78bfa" />

      <group ref={groupRef}>
        {k4Nodes.map((node) => (
          <NodeSphere
            key={node.id}
            node={node}
            isSelected={selectedNode === node.id}
            onClick={() => onSelectNode(node.id)}
          />
        ))}

        {edges.map(([a, b], i) => (
          <EdgeLine
            key={i}
            start={k4Nodes[a].position}
            end={k4Nodes[b].position}
            color="rgba(93, 202, 165, 0.5)"
          />
        ))}
      </group>

      <FloatingParticles />
    </>
  );
}

type K4TetrahedronProps = {
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
};

export const K4Tetrahedron: React.FC<K4TetrahedronProps> = ({ selectedNode, onSelectNode }) => {
  return (
    <div className="w-full h-80 rounded-lg overflow-hidden bg-white/[0.02] border border-white/5">
      <Canvas camera={{ position: [0, 0.5, 3.5], fov: 50 }}>
        <Scene selectedNode={selectedNode} onSelectNode={onSelectNode} />
      </Canvas>
    </div>
  );
};
