import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { FluidPhysics, type ParticleType } from '../engine/FluidPhysics';
import { generateBloomTexture } from '../utils/bloomTexture';

interface FluidCanvasProps {
  sessionId: string;
  seed: number;
  mode: 'gallery' | 'guided' | 'active';
  events?: Array<{
    event_type: string;
    event_time_ms: number;
    payload: Record<string, unknown>;
  }>;
  onLogEvent?: (type: string, payload: Record<string, unknown>) => void;
}

// Custom shader material for particle glow
const ParticleMaterial: React.FC = () => {
  const bloomTexture = useMemo(() => generateBloomTexture(128, 1.0), []);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: bloomTexture },
        time: { value: 0 },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vColor = color;
          
          // Size attenuation based on distance
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          
          gl_Position = projectionMatrix * mvPosition;
          
          // Fade particles below floor
          vAlpha = position.y > -9.0 ? 1.0 : 0.3;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vAlpha * 0.9);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }, [bloomTexture]);

  return <primitive object={shaderMaterial} attach="material" />;
};

// Fluid Scene Component
const FluidScene: React.FC<FluidCanvasProps> = ({
  seed,
  mode,
  events,
  onLogEvent,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const physicsRef = useRef<FluidPhysics | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const lastForceTimeRef = useRef(0);
  const simulationTimeRef = useRef(0);

  // Initialize physics
  useEffect(() => {
    physicsRef.current = new FluidPhysics(seed, {
      particleCount: 10000,
      gravity: -0.008,
      drag: 0.985,
      bounce: 0.3,
    });

    // Apply initial pour events if in gallery mode
    if (mode === 'gallery' && events) {
      for (const event of events) {
        if (event.event_type === 'POUR' && physicsRef.current) {
          const payload = event.payload as {
            x?: number;
            y?: number;
            z?: number;
            count?: number;
            type?: number;
          };
          physicsRef.current.pour(
            payload.x || 0,
            payload.y || 10,
            payload.z || 0,
            payload.count || 100,
            (payload.type || 0) as ParticleType
          );
        }
      }
    }

    return () => {
      physicsRef.current = null;
    };
  }, [seed, mode, events]);

  // Apply scheduled events (for gallery playback)
  useEffect(() => {
    if (!events || !physicsRef.current || mode !== 'gallery') return;

    const interval = setInterval(() => {
      simulationTimeRef.current += 100;

      // Find events that should trigger now
      const upcomingEvents = events.filter(
        e => e.event_time_ms <= simulationTimeRef.current &&
             e.event_time_ms > simulationTimeRef.current - 100
      );

      for (const event of upcomingEvents) {
        if (event.event_type === 'TRIGGER_VORTEX') {
          physicsRef.current?.triggerVortex(0, 0, 1.0);
        } else if (event.event_type === 'STOP_VORTEX') {
          physicsRef.current?.stopVortex();
        } else if (event.event_type === 'DRAG_FORCE') {
          const payload = event.payload as { x?: number; y?: number; radius?: number; strength?: number };
          physicsRef.current?.applyForce({
            x: payload.x || 0,
            y: payload.y || 0,
            z: 0,
            radius: payload.radius || 8,
            strength: payload.strength || 2,
            timeMs: event.event_time_ms,
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [events, mode]);

  // Mouse handlers for active sculpting
  const handlePointerMove = useCallback((event: THREE.Event) => {
    if (mode !== 'active') return;

    const native = event as unknown as { point?: THREE.Vector3 };
    if (!native.point || !physicsRef.current) return;

    mouseRef.current.x = native.point.x;
    mouseRef.current.y = native.point.y;

    if (mouseRef.current.isDown) {
      const now = Date.now();
      if (now - lastForceTimeRef.current > 100) {
        physicsRef.current.applyForce({
          x: native.point.x,
          y: native.point.y,
          z: 0,
          radius: 6,
          strength: 3,
          timeMs: now,
        });

        onLogEvent?.('DRAG_FORCE', {
          x: native.point.x,
          y: native.point.y,
          radius: 6,
          strength: 3,
        });

        lastForceTimeRef.current = now;
      }
    }
  }, [mode, onLogEvent]);

  const handlePointerDown = useCallback((event: THREE.Event) => {
    if (mode !== 'active') return;
    mouseRef.current.isDown = true;

    const native = event as unknown as { point?: THREE.Vector3 };
    if (native.point && physicsRef.current) {
      physicsRef.current.applyForce({
        x: native.point.x,
        y: native.point.y,
        z: 0,
        radius: 8,
        strength: 5,
        timeMs: Date.now(),
      });
    }
  }, [mode]);

  const handlePointerUp = useCallback(() => {
    mouseRef.current.isDown = false;
  }, []);

  // Main simulation loop
  useFrame((state, delta) => {
    if (!physicsRef.current || !pointsRef.current) return;

    const physics = physicsRef.current;
    const geometry = pointsRef.current.geometry;

    // Step physics
    physics.step(delta * 1000);

    // Update geometry attributes from physics arrays
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;

    // Copy physics arrays to geometry
    positions.set(physics.positions);
    colors.set(physics.colors);

    // Notify Three.js of updates
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    // Update size attribute based on particle type
    const sizes = geometry.attributes.size.array as Float32Array;
    for (let i = 0; i < physics.count; i++) {
      const type = physics.properties[i];
      // Orchid particles (mixed) are larger
      sizes[i] = type === 2 ? 25 : 15;
    }
    geometry.attributes.size.needsUpdate = true;
  });

  // Initialize geometry
  const { geometry, bloomTexture } = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Initial empty arrays (will be filled by physics)
    const count = 10000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return { geometry: geo, bloomTexture: generateBloomTexture(128, 1.0) };
  }, []);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: bloomTexture },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = position.y > -9.0 ? 1.0 : 0.3;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vAlpha * 0.9);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
  }, [bloomTexture]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#feca57" />
      <pointLight position={[-10, 5, 5]} intensity={0.3} color="#00f5ff" />
      <pointLight position={[10, 5, 5]} intensity={0.3} color="#39ff14" />

      {/* Floor plane for interaction */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -9, 0]}
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial />
      </mesh>

      {/* Particle points */}
      <points ref={pointsRef} geometry={geometry} material={material} />

      {/* Visible floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -9.1, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#010103"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Grid helper for orientation */}
      <gridHelper args={[40, 40, '#1a1a2e', '#0d0d15']} position={[0, -9, 0]} />

      {/* Orbit controls (only in gallery mode) */}
      {mode === 'gallery' && <OrbitControls enablePan={true} enableZoom={true} />}
    </>
  );
};

// Loading fallback
const CanvasLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-cyan border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-white/50">Initializing Fluid Simulation...</p>
      <p className="text-xs text-white/30">10,000 particles ready</p>
    </div>
  </div>
);

// Main exported component
export const FluidCanvas: React.FC<FluidCanvasProps> = (props) => {
  return (
    <div className="w-full h-full">
      <React.Suspense fallback={<CanvasLoader />}>
        <Canvas
          camera={{ position: [0, 15, 25], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 1.5]} // Limit pixel ratio for performance
        >
          <FluidScene {...props} />
        </Canvas>
      </React.Suspense>
    </div>
  );
};
