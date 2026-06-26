import './App.css';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      style={{ height: '100vh', width: '100vw' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  );
}
