import React from 'react';
import * as THREE from 'three';

const Environment = () => {
  // Ground
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={0.8} 
        castShadow 
      />
      {/* Add some simple park elements */}
      <mesh position={[-30, 0, -20]}>
        <cylinderGeometry args={[5, 5, 20]} />
        <meshStandardMaterial color={[0.8, 0.2, 0.2]} /> // Red pole
      </mesh>
      <mesh position={[30, 0, 20]}>
        <cylinderGeometry args={[5, 5, 20]} />
        <meshStandardMaterial color={[0.2, 0.2, 0.8]} /> // Blue pole
      </mesh>
    </>
  );
};

export default Environment;