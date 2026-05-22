import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PosnerLatticeSceneProps {
  decoherence?: number; // 0 = perfect order, 1 = chaos
  particleCount?: number;
}

/**
 * PosnerLatticeScene: Instanced lattice simulating quantum coherence.
 * Uses Perlin-like noise for Brownian motion jitter.
 * Material shifts emissive color from cyan (cool) to coral (hot) based on decoherence.
 */
export function PosnerLatticeScene({ 
  decoherence = 0.5, 
  particleCount = 3000 
}: PosnerLatticeSceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;
  
  // Lazy-create geometry and material
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.04, 8, 8);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x4db8a8,
      emissive: 0x4db8a8,
      emissiveIntensity: 1.5,
      transmission: 0.3,
      thickness: 0.5,
      roughness: 0.1,
      metalness: 0.2,
      clearcoat: 0.5,
    });
    return { geometry: geo, material: mat };
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const mesh = meshRef.current;
    const time = meshRef.current?.__self?.clock?.elapsedTime || performance.now() / 1000;
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    
    // Update emissive color based on decoherence: cyan -> amber -> coral
    const hue = 0.5 - decoherence * 0.35; // ~0.5 (cyan) down to ~0.05 (coral)
    const color = new THREE.Color().setHSL(hue, 0.9, 0.6);
    mat.emissive.copy(color);
    
    let instanceIdx = 0;
    for (let i = 0; i < particleCount; i++) {
      // Base position grid (icosahedral-like distribution)
      const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.0;
      
      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      let z = r * Math.cos(phi);
      
      // Add Perlin-like noise offset scaled by decoherence
      const noiseScale = decoherence * 0.4;
      const nx = Math.sin(time * 0.5 + i * 0.13) * noiseScale;
      const ny = Math.cos(time * 0.37 + i * 0.17) * noiseScale;
      const nz = Math.sin(time * 0.61 + i * 0.23) * noiseScale;
      
      x += nx; y += ny; z += nz;
      
      // Scale shrinks as decoherence increases (thermal expansion metaphor)
      const scale = 0.8 + (1 - decoherence) * 0.4;
      
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      mesh.setMatrixAt(instanceIdx++, dummy.matrix);
    }
    
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <primitive 
      object={new THREE.InstancedMesh(geometry, material, particleCount)} 
      ref={meshRef}
      frustumCulled={false}
    />
  );
}

export default PosnerLatticeScene;