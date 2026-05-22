import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CyberneticBonsaiScene: PID-controlled bonsai tree.
 * Tree health/shape dictated by PID gains (P, I, D).
 * For now, renders a simple wireframe branching structure.
 */
export function CyberneticBonsaiScene() {
  const treeRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (treeRef.current) {
      // Gentle rotation to show 3D structure
      treeRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  // Build a simple branching tree using cylinders
  const branches = useRef<THREE.Mesh[]>([]);
  
  // Recursive function to create branches
  const createBranch = (depth: number, length: number, angle: number, parent: THREE.Object3D) => {
    if (depth <= 0) return;
    
    const geometry = new THREE.CylinderGeometry(0.02, 0.05, length, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xcda852, // Amber from QMU palette
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    
    const branch = new THREE.Mesh(geometry, material);
    branch.position.y = length / 2;
    branch.rotation.x = angle;
    
    parent.add(branch);
    branches.current.push(branch);
    
    // Create sub-branches
    const subLength = length * 0.7;
    const subAngle = Math.PI / 6;
    
    createBranch(depth - 1, subLength, subAngle, branch);
    createBranch(depth - 1, subLength, -subAngle, branch);
    
    // Third sub-branch for more complexity
    createBranch(depth - 1, subLength * 0.8, 0, branch);
  };

  // Build the tree in a useMemo-like pattern (during render)
  const buildTree = () => {
    const group = new THREE.Group();
    branches.current = [];
    
    // Trunk
    createBranch(4, 1.0, 0, group);
    
    // Add a subtle glow using emissive material on the last branch
    return group;
  };

  const tree = buildTree();

  useFrame(() => {
    if (treeRef.current) {
      // Leaves/wireframe pulse effect
      branches.current.forEach((branch, idx) => {
        const pulse = 0.6 + 0.2 * Math.sin(Date.now() / 1000 + idx * 0.5);
        (branch.material as THREE.MeshBasicMaterial).opacity = pulse;
      });
    }
  });

  return <group ref={treeRef}>{tree}</group>;
}

export default CyberneticBonsaiScene;