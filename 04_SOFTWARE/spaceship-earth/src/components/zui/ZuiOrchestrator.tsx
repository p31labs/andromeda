import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Sphere, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useZoneStore } from '../../stores/zoneStore';
import { useBLEScannerStore } from '../../services/bleScanner';
import { VisitorMindsetModal } from './VisitorMindsetModal';

/**
 * WCD-SE02: ZUI Orchestrator
 * Bridges the backend WebGPU/Zustand logic built by Kwaipilot 
 * with the React Three Fiber spatial mesh.
 */
export const ZuiOrchestrator: React.FC = () => {
  const { camera } = useThree();
  const activeZoneId = useZoneStore((state) => state.activeZoneId);
  const isTransitioning = useZoneStore((state) => state.spatialState.isTransitioning);
  const { beacons } = useBLEScannerStore();
  
  // Get current zone details
  const currentZone = useZoneStore((state) => {
    const zone = state.zones.find(z => z.id === activeZoneId);
    return zone || null;
  });
  
  // Get detected devices count
  const detectedDevicesCount = beacons.size;
  
  // Level 0: Global Mesh Reference
  const globalMeshRef = useRef<THREE.InstancedMesh>(null);
  
  // Dummy data for the Sierpinski nodes
  const nodeCount = 64; 
  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);

  // Initialize the macro-mesh positions
  useEffect(() => {
    if (!globalMeshRef.current) return;
    for (let i = 0; i < nodeCount; i++) {
      // Procedural placement (placeholder for actual IVM coordinates)
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      dummyMatrix.setPosition(x, y, z);
      globalMeshRef.current.setMatrixAt(i, dummyMatrix);
    }
    globalMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummyMatrix]);

  // The ZUI Interpolation Engine
  useFrame((state, delta) => {
    // 1. Frustum & LOD Management goes here (Task A.2)
    
    // 2. Camera Z-Axis interpolation based on Zone State
    if (currentZone && !isTransitioning) {
      // Interpolate camera towards the active Zone Orb (Level 1 -> Level 2)
      const targetZ = 5; // Close up view
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 2 * delta);
      
      // Fade out global mesh
      if (globalMeshRef.current) {
        (globalMeshRef.current.material as THREE.Material).opacity = THREE.MathUtils.lerp(
          (globalMeshRef.current.material as THREE.Material).opacity, 
          0, 
          2 * delta
        );
      }
    } else {
      // Pull back to Level 0 (Global Starfield)
      const targetZ = 30; 
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 2 * delta);
      
      if (globalMeshRef.current) {
        (globalMeshRef.current.material as THREE.Material).opacity = THREE.MathUtils.lerp(
          (globalMeshRef.current.material as THREE.Material).opacity, 
          1, 
          2 * delta
        );
      }
    }
  });

  return (
    <group>
      {/* LEVEL 0: The Sierpinski Starfield */}
      <instancedMesh ref={globalMeshRef} args={[undefined, undefined, nodeCount]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="#334455" 
          wireframe 
          transparent 
          opacity={1} 
        />
      </instancedMesh>

      {/* LEVEL 1: Active Zone Orb (Only renders if a zone is detected via BLE) */}
      {currentZone && (
        <group position={[0, 0, 0]}>
          <Sphere args={[2, 32, 32]}>
            <MeshTransmissionMaterial 
              thickness={0.5} 
              roughness={0.1} 
              transmission={1} 
              ior={1.5} 
              color={currentZone.color || "#00ff88"} 
            />
          </Sphere>
          
          {/* LEVEL 2: Creator Context Face (UI Overlay) */}
          <Html position={[0, 0, 2.5]} center transform>
            <div className="w-64 p-4 bg-black/80 text-white rounded-lg border border-white/20 backdrop-blur-md">
              <h2 className="text-xl font-bold font-mono">{currentZone.name}</h2>
              <div className="mt-2 text-sm text-gray-300">
                Element: {currentZone.elemental}
              </div>
              <div className="mt-2 text-xs text-green-400">
                BLE Devices: {detectedDevicesCount}
              </div>
              {/* Help Board / FWP triggers go here */}
            </div>
          </Html>
        </group>
      )}

      {/* VECTOR 3: The Interruption Modal (Rendered in standard DOM, triggered by Z-Index) */}
      {isTransitioning && <VisitorMindsetModal />}
      
    </group>
  );
};