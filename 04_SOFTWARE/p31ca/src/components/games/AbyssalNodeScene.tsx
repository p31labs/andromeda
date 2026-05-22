import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * AbyssalNodeScene: reaction-diffusion mycelial network.
 * Uses a ping-pong framebuffer approach (to be implemented).
 * For now, renders a placeholder violet plane to validate routing.
 */
export function AbyssalNodeScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xa78bfa, // Lavender from QMU palette
    wireframe: true,
    transparent: true,
    opacity: 0.6,
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

export default AbyssalNodeScene;