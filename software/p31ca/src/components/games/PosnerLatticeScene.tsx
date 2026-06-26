export function PosnerLatticeScene({
  initialDecoherence = 0.5,
  particleCount = 3000



    const mesh = meshRef.current;
    const time = performance.now() / 1000;
    const mat = mesh.material as THREE.MeshPhysicalMaterial;

    // Emissive hue: cyan (~0.5) → amber (~0.12) → coral (~0.05)
    const hue = Math.max(0.05, 0.5 - decoherence * 0.5);
    mat.emissive.setHSL(hue, 0.9, 0.6);



      // Scale: thermodynamic expansion metaphor
      const scale = 0.6 + (1 - decoherence) * 0.6;


    <primitive
      object={new THREE.InstancedMesh(geometry, material, particleCount)}
}
