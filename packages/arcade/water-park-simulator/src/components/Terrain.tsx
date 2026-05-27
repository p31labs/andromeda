import React from 'react';
import * as THREE from 'three';

const Terrain = () => {
  // Create a simple ground plane for the water park
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={[0.2, 0.8, 0.2]} /> // Green grass
    </mesh>
  );
};

export default Terrain;