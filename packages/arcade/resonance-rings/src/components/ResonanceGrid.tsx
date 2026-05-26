import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpringPhysics, type Node, type NodeType } from '../engine/SpringPhysics';

interface ResonanceGridProps {
  physics: SpringPhysics;
  coopMode?: boolean;
  onNodeClick?: (nodeId: number, nodeType: NodeType) => void;
}

// InstancedMesh for nodes - CRITICAL for 60fps performance
const NodeInstancedMesh: React.FC<{ nodes: Node[]; onNodeClick?: (id: number, type: NodeType) => void }> = ({
  nodes,
  onNodeClick,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Raycasting for node selection
  const handleClick = (event: THREE.Event) => {
    if (!onNodeClick || !meshRef.current) return;
    
    const instanceId = (event as any).instanceId;
    if (instanceId !== undefined && instanceId >= 0 && instanceId < nodes.length) {
      const node = nodes[instanceId];
      onNodeClick(node.id, node.type);
    }
  };

  useFrame(() => {
    if (!meshRef.current) return;

    nodes.forEach((node, i) => {
      // Position based on physics Y (displacement)
      dummy.position.set(node.x, node.y, node.z);
      
      // Scale based on amplitude (visual breathing effect)
      const scale = 1.0 + (node.amplitude * 0.15);
      dummy.scale.setScalar(scale);
      
      // Visual phase rotation
      const velocity = node.y - node.oldY;
      dummy.rotation.x = Math.PI / 2 + velocity * 0.5;
      dummy.rotation.z = node.phase + velocity * 0.3;
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color based on type and amplitude
      if (node.type === 'SJ') {
        color.setHex(0x00f5ff); // Cyan
      } else if (node.type === 'WJ') {
        color.setHex(0x39ff14); // Phos
      } else if (node.amplitude > 1.8) {
        // Constructive interference - blend to Orchid
        const intensity = Math.min((node.amplitude - 1.8) * 0.5, 1.0);
        color.setHex(0x1a2233).lerp(new THREE.Color(0xda70d6), intensity);
      } else {
        // Resting color
        color.setHex(0x1a2233);
      }
      
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 37]}
      onClick={handleClick}
    >
      {/* Torus geometry for ring-like nodes */}
      <torusGeometry args={[0.6, 0.2, 12, 24]} />
      <meshPhongMaterial
        color={0xffffff}
        shininess={100}
        flatShading={false}
        emissive={0x000000}
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
};

// LineSegments for springs - single buffer geometry for all edges
const SpringLines: React.FC<{ nodes: Node[]; edges: { a: number; b: number }[] }> = ({
  nodes,
  edges,
}) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const positionsRef = useRef<Float32Array>(new Float32Array(edges.length * 6)); // 2 points × 3 coords per edge

  useFrame(() => {
    if (!lineRef.current) return;

    const positions = positionsRef.current;
    let idx = 0;

    // Update line positions from node positions
    for (const edge of edges) {
      const n1 = nodes[edge.a];
      const n2 = nodes[edge.b];

      // Line start
      positions[idx++] = n1.x;
      positions[idx++] = n1.y;
      positions[idx++] = n1.z;

      // Line end
      positions[idx++] = n2.x;
      positions[idx++] = n2.y;
      positions[idx++] = n2.z;
    }

    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Initialize geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(edges.length * 6);
    
    // Initial positions
    let idx = 0;
    for (const edge of edges) {
      const n1 = nodes[edge.a];
      const n2 = nodes[edge.b];
      positions[idx++] = n1.x; positions[idx++] = n1.y; positions[idx++] = n1.z;
      positions[idx++] = n2.x; positions[idx++] = n2.y; positions[idx++] = n2.z;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [edges, nodes]);

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0x3a4a66,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    });
  }, []);

  return (
    <lineSegments ref={lineRef} geometry={geometry} material={material} />
  );
};

// Emitter visualization (glow rings around driven nodes)
const EmitterRings: React.FC<{ nodes: Node[]; coopMode: boolean; time: number }> = ({
  nodes,
  coopMode,
  time,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Get emitter nodes
  const emitters = useMemo(() => {
    return nodes.filter(n => n.type === 'SJ' || n.type === 'WJ');
  }, [nodes]);

  return (
    <group ref={groupRef}>
      {emitters.map((node, i) => {
        const color = node.type === 'SJ' ? 0x00f5ff : 0x39ff14;
        const pulseScale = coopMode 
          ? 1 + Math.sin(time * 6 + (node.type === 'SJ' ? 0 : Math.PI)) * 0.3
          : 1;

        return (
          <mesh
            key={`emitter-${node.id}`}
            position={[node.x, node.y, node.z]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[1.2 * pulseScale, 1.4 * pulseScale, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Constructive interference visualization (center glow)
const HarmonyGlow: React.FC<{ resonance: { constructiveCount: number; average: number } }> = ({
  resonance,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    // Pulse based on resonance
    const intensity = Math.min(resonance.constructiveCount / 10, 1);
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1 * intensity;
    
    meshRef.current.scale.setScalar(scale);
    
    // Update material opacity
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.5;
  });

  if (resonance.constructiveCount < 3) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3, 32]} />
      <meshBasicMaterial
        color={0xda70d6}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Main scene component
const ResonanceScene: React.FC<ResonanceGridProps> = ({
  physics,
  coopMode = false,
  onNodeClick,
}) => {
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;

    // Step physics
    physics.step(delta * 1000);
  });

  // Get nodes and edges
  const nodes = physics.nodes;
  const edges = physics.edges;

  // Calculate resonance for visualization
  const resonance = useMemo(() => physics.getHarmonicResonance(), [nodes]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 10, 0]} intensity={0.8} color={0xffffff} />
      <pointLight position={[-10, 5, 5]} intensity={0.4} color={0x00f5ff} />
      <pointLight position={[10, 5, 5]} intensity={0.4} color={0x39ff14} />

      {/* Grid floor */}
      <gridHelper args={[40, 40, 0x1a2233, 0x0a0f1a]} position={[0, -5, 0]} />

      {/* Main components - using InstancedMesh for performance */}
      <NodeInstancedMesh nodes={nodes} onNodeClick={onNodeClick} />
      <SpringLines nodes={nodes} edges={edges} />
      <EmitterRings nodes={nodes} coopMode={coopMode} time={timeRef.current} />
      <HarmonyGlow resonance={resonance} />

      {/* Camera positioned for optimal view */}
      <perspectiveCamera position={[0, 25, 25]} fov={45} />
    </>
  );
};

// Loading fallback
const CanvasLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-orchid border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-white/50">Initializing Resonance Grid...</p>
      <p className="text-xs text-white/30">37 nodes • Verlet integration</p>
    </div>
  </div>
);

// Main exported component
export const ResonanceGrid: React.FC<{
  physics: SpringPhysics;
  coopMode?: boolean;
  onNodeClick?: (nodeId: number, nodeType: NodeType) => void;
}> = (props) => {
  return (
    <div className="w-full h-full">
      <React.Suspense fallback={<CanvasLoader />}>
        <React.ThreeFiber.Canvas
          camera={{ position: [0, 25, 25], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          <ResonanceScene {...props} />
        </React.ThreeFiber.Canvas>
      </React.Suspense>
    </div>
  );
};

// Re-export for convenience
export { NodeInstancedMesh, SpringLines };
