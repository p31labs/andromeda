import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useBioStore } from '../stores/bioStore';

function Tetrahedron() {
  const meshRef = useRef<THREE.Group>(null);
  const { spoons } = useBioStore();
  
  // Rotation speed based on spoons (slower when low)
  const rotationSpeed = spoons * 0.005;
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
      meshRef.current.rotation.x += rotationSpeed * 0.5;
    }
  });

  const vertices = useMemo(() => [
    new THREE.Vector3(0, 1.5, 0),      // Top - Self
    new THREE.Vector3(1.2, -0.8, 0.7),  // Work
    new THREE.Vector3(-1.2, -0.8, 0.7), // Family
    new THREE.Vector3(0, -0.8, -1.4)    // Health
  ], []);

  const edges = useMemo(() => [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]
  ], []);

  return (
    <group ref={meshRef}>
      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                ...vertices[a].toArray(),
                ...vertices[b].toArray()
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color={i < 3 ? '#5DCAA5' : '#00d4ff'} 
            linewidth={2} 
          />
        </line>
      ))}
      
      {/* Vertices */}
      {vertices.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial 
            color={['#5DCAA5', '#00d4ff', '#a78bfa', '#fbbf24'][i]} 
            emissive={['#5DCAA5', '#00d4ff', '#a78bfa', '#fbbf24'][i]}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      
      {/* Labels */}
      <Text position={[0, 2, 0]} fontSize={0.3} color="#5DCAA5" anchorX="center">
        SELF
      </Text>
      <Text position={[1.5, -0.8, 0.7]} fontSize={0.25} color="#00d4ff" anchorX="center">
        WORK
      </Text>
      <Text position={[-1.5, -0.8, 0.7]} fontSize={0.25} color="#a78bfa" anchorX="center">
        FAMILY
      </Text>
      <Text position={[0, -0.8, -1.8]} fontSize={0.25} color="#fbbf24" anchorX="center">
        HEALTH
      </Text>
    </group>
  );
}

export function TetrahedronView() {
  return (
    <div className="h-[400px] w-full glass rounded-xl overflow-hidden">
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Tetrahedron />
        <OrbitControls enableZoom={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}
