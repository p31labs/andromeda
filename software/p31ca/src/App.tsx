import './App.css';
import { Canvas } from '@react-three/fiber';
<<<<<<< HEAD
import { Tetrahedron } from './Tetrahedron';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export default function App() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Fixed: Moved useFrame inside Canvas component via custom controller
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Animation logic here
      meshRef.current.rotation.x += 0.01 * delta;
      meshRef.current.rotation.y += 0.01 * delta;
    }
  });

  return (
    <Canvas 
      ref={meshRef}
=======
import * as THREE from 'three';

export default function App() {
  return (
    <Canvas
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      camera={{ position: [0, 0, 5] }}
      style={{ height: '100vh', width: '100vw' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
<<<<<<< HEAD
      <Tetrahedron />
=======
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    </Canvas>
  );
}
