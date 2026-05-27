import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Water from './components/Water'
import Terrain from './components/Terrain'
import Slide from './components/Slide'
import Environment from './components/Environment'

function App() {
  return (
    <Canvas
      camera={{ position: [0, 10, 20], fov: 75 }}
      gl={{ antialias: true }}
      background={[0.53, 0.81, 0.92]} // Sky blue
    >
      {/* Lights and environment */}
      <Environment />
      
      {/* Controls for debugging */}
      <OrbitControls />
      
      {/* Water park elements */}
      <Terrain />
      <Water position={[0, 0, 0]} rotation={[ -Math.PI / 2, 0, 0 ]} />
      <Slide />
    </Canvas>
  );
}

export default App;