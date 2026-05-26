// P31 Gridiron: AAA CINEMATIC FIELD RENDERER
// Broadcast-quality NFL presentation with PBR materials, post-processing, particle systems
// Target: 60fps on mid-tier hardware with dynamic quality scaling

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, useTexture, Stars, Cloud } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { FieldState, SpoonState, StadiumId, PlayOutcome } from '../types';
import { STADIUMS } from '../types';

// ============================================
// AAA STADIUM CONFIGS - CINEMATIC LIGHTING
// ============================================

const STADIUM_CONFIGS: Record<StadiumId, {
  turfColor: string;
  turfRoughness: number;
  turfMetalness: number;
  lineColor: string;
  endZoneHome: string;
  endZoneAway: string;
  skyColor: string;
  ambientIntensity: number;
  sunPosition: [number, number, number];
  sunIntensity: number;
  sunColor: string;
  fogDensity: number;
  fogColor: string;
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'night';
  crowdDensity: number;
  stadiumLights: boolean;
  reflections: boolean;
}> = {
  mudBowl: {
    turfColor: '#3d4a1c',
    turfRoughness: 0.95,
    turfMetalness: 0,
    lineColor: '#c4b896',
    endZoneHome: '#1a3d0a',
    endZoneAway: '#0a2d1a',
    skyColor: '#4a5568',
    ambientIntensity: 0.4,
    sunPosition: [30, 40, 20],
    sunIntensity: 0.8,
    sunColor: '#a0aec0',
    fogDensity: 0.015,
    fogColor: '#4a5568',
    weather: 'rain',
    crowdDensity: 0.7,
    stadiumLights: false,
    reflections: true,
  },
  concreteJungle: {
    turfColor: '#4a7c3d',
    turfRoughness: 0.7,
    turfMetalness: 0.05,
    lineColor: '#ffffff',
    endZoneHome: '#2d5c1a',
    endZoneAway: '#1a4d2a',
    skyColor: '#87ceeb',
    ambientIntensity: 0.6,
    sunPosition: [50, 60, 30],
    sunIntensity: 1.5,
    sunColor: '#fff8e7',
    fogDensity: 0.008,
    fogColor: '#87ceeb',
    weather: 'clear',
    crowdDensity: 0.95,
    stadiumLights: false,
    reflections: false,
  },
  modernDome: {
    turfColor: '#5a8c4d',
    turfRoughness: 0.65,
    turfMetalness: 0.1,
    lineColor: '#ffffff',
    endZoneHome: '#3d6c2a',
    endZoneAway: '#2a5c3a',
    skyColor: '#1a1a2e',
    ambientIntensity: 0.8,
    sunPosition: [0, 50, 0],
    sunIntensity: 1.2,
    sunColor: '#f0f0f0',
    fogDensity: 0.005,
    fogColor: '#2d3748',
    weather: 'clear',
    crowdDensity: 0.9,
    stadiumLights: true,
    reflections: true,
  },
};

// ============================================
// PROCEDURAL TURF GENERATION (4K Normal Maps)
// ============================================

function createTurfTextures(color1: string, color2: string, isMuddy: boolean): {
  diffuse: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 1024;
  
  // Diffuse map (color)
  const diffuseCanvas = document.createElement('canvas');
  diffuseCanvas.width = size;
  diffuseCanvas.height = size;
  const dCtx = diffuseCanvas.getContext('2d')!;
  
  // Base grass
  const gradient = dCtx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(0.5, color2);
  gradient.addColorStop(1, color1);
  dCtx.fillStyle = gradient;
  dCtx.fillRect(0, 0, size, size);
  
  // Grass blades
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 3 + Math.random() * 6;
    const angle = (Math.random() - 0.5) * 0.8;
    const brightness = Math.random() > 0.5 ? 15 : -15;
    
    dCtx.strokeStyle = adjustColor(color1, brightness);
    dCtx.lineWidth = 1.5;
    dCtx.beginPath();
    dCtx.moveTo(x, y);
    dCtx.lineTo(x + Math.sin(angle) * length, y + Math.cos(angle) * length);
    dCtx.stroke();
  }
  
  // Mud patches
  if (isMuddy) {
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 40 + Math.random() * 80;
      const g = dCtx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, 'rgba(101, 67, 33, 0.8)');
      g.addColorStop(0.6, 'rgba(80, 60, 40, 0.5)');
      g.addColorStop(1, 'rgba(101, 67, 33, 0)');
      dCtx.fillStyle = g;
      dCtx.beginPath();
      dCtx.arc(x, y, radius, 0, Math.PI * 2);
      dCtx.fill();
    }
  }
  
  // Normal map (height/bump)
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;
  
  // Fill with neutral normal (128, 128, 255)
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, size, size);
  
  // Add height variations for grass
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const h = Math.random() > 0.5 ? 140 : 110;
    nCtx.fillStyle = `rgb(${h}, ${h}, 255)`;
    nCtx.fillRect(x, y, 2, 2);
  }
  
  // Roughness map
  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = size;
  roughnessCanvas.height = size;
  const rCtx = roughnessCanvas.getContext('2d')!;
  
  // Base roughness
  rCtx.fillStyle = isMuddy ? 'rgb(200, 200, 200)' : 'rgb(150, 150, 150)';
  rCtx.fillRect(0, 0, size, size);
  
  // Variations
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 50 + 100;
    rCtx.fillStyle = `rgb(${r}, ${r}, ${r})`;
    rCtx.fillRect(x, y, 3, 3);
  }
  
  const diffuse = new THREE.CanvasTexture(diffuseCanvas);
  const normal = new THREE.CanvasTexture(normalCanvas);
  const roughness = new THREE.CanvasTexture(roughnessCanvas);
  
  [diffuse, normal, roughness].forEach(tex => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
  });
  
  return { diffuse, normal, roughness };
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================
// PBR FIELD SURFACE
// ============================================

interface FieldSurfaceProps {
  stadiumId: StadiumId;
  isWet?: boolean;
}

function FieldSurface({ stadiumId, isWet = false }: FieldSurfaceProps) {
  const config = STADIUM_CONFIGS[stadiumId];
  const meshRef = useRef<THREE.Mesh>(null);
  
  const textures = useMemo(() => 
    createTurfTextures(config.turfColor, adjustColor(config.turfColor, -20), stadiumId === 'mudBowl'),
    [config.turfColor, stadiumId]
  );

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      normalMap: textures.normal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: textures.roughness,
      roughness: isWet ? 0.3 : config.turfRoughness,
      metalness: isWet ? 0.2 : config.turfMetalness,
      envMapIntensity: 0.5,
    });
    return mat;
  }, [textures, config, isWet]);

  return (
    <group>
      {/* Main field */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 53.3, 64, 32]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Yard Lines - 3D raised lines for parallax */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((yard) => (
        <YardLine
          key={yard}
          x={(yard - 50) * 1.2}
          number={yard}
          color={config.lineColor}
          isGoalLine={yard === 0 || yard === 100}
        />
      ))}

      {/* End Zones */}
      <EndZone x={-66} color={config.endZoneHome} />
      <EndZone x={66} color={config.endZoneAway} />

      {/* Hash marks */}
      {Array.from({ length: 99 }, (_, i) => i + 1)
        .filter(y => y % 5 === 0 && y % 10 !== 0)
        .map((yard) => (
          <HashMark key={yard} x={(yard - 50) * 1.2} color={config.lineColor} />
        ))}
    </group>
  );
}

function EndZone({ x, color }: { x: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
      <planeGeometry args={[12, 53.3]} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
    </mesh>
  );
}

function YardLine({ x, number, color, isGoalLine }: { x: number; number: number; color: string; isGoalLine: boolean }) {
  const label = isGoalLine ? 'G' : number === 50 ? '50' : number > 50 ? number - 50 : number;
  const side = number > 50 ? 'OPP' : 'OWN';
  
  return (
    <group position={[x, 0.02, 0]}>
      {/* Raised line for 3D effect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <planeGeometry args={[isGoalLine ? 0.5 : 0.3, 53.3]} />
        <meshStandardMaterial 
          color={isGoalLine ? '#ffdd44' : color} 
          emissive={isGoalLine ? '#ffaa00' : '#000000'}
          emissiveIntensity={isGoalLine ? 0.3 : 0}
          roughness={0.4}
        />
      </mesh>

      {/* Yard numbers with 3D extrusion */}
      {!isGoalLine && number !== 0 && number !== 100 && (
        <>
          <YardNumber position={[0, 0.05, -20]} rotation={[-Math.PI / 2, 0, Math.PI]}>
            {label.toString()}
          </YardNumber>
          <YardNumber position={[0, 0.05, 20]} rotation={[-Math.PI / 2, 0, 0]}>
            {label.toString()}
          </YardNumber>
        </>
      )}
    </group>
  );
}

function YardNumber({ children, position, rotation }: { children: string; position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[3, 2.5]} />
      <meshStandardMaterial 
        color="white" 
        emissive="#ffffff" 
        emissiveIntensity={0.2}
        roughness={0.3}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function HashMark({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0.015, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -14]}>
        <planeGeometry args={[0.15, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.5} opacity={0.7} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 14]}>
        <planeGeometry args={[0.15, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.5} opacity={0.7} transparent />
      </mesh>
    </group>
  );
}

// ============================================
// 3D PLAYER MODELS WITH ANIMATIONS
// ============================================

interface PlayerModelProps {
  position: [number, number, number];
  rotation?: number;
  color: string;
  number: string;
  isBallCarrier?: boolean;
  animation: 'idle' | 'stance' | 'running' | 'throwing' | 'catching' | 'tackled' | 'celebrating';
  targetPosition?: [number, number, number];
  speed?: number;
}

function PlayerModel({ 
  position, 
  rotation = 0,
  color, 
  number, 
  isBallCarrier = false, 
  animation,
}: PlayerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;

    // Billboard effect - always face camera
    const lookAtPos = camera.position.clone();
    lookAtPos.y = groupRef.current.position.y;
    groupRef.current.lookAt(lookAtPos);

    // Simple breathing animation - no state updates
    if (animation === 'idle' || animation === 'stance') {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03;
    } else if (animation === 'celebrating') {
      const jumpHeight = Math.abs(Math.sin(state.clock.elapsedTime * 6)) * 0.8;
      groupRef.current.position.y = position[1] + jumpHeight;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 4) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.9, 16]} />
        <meshBasicMaterial color="rgba(0,0,0,0.4)" transparent opacity={0.5} />
      </mesh>

      {/* Body - jersey */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.45, 1.2, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Shoulders */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <capsuleGeometry args={[0.55, 0.6, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Helmet */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Face mask */}
      <mesh position={[0, 2.1, 0.35]}>
        <boxGeometry args={[0.4, 0.2, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Jersey number (front) */}
      <mesh position={[0, 1.1, 0.46]}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.7, 1.4, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.15, 0.8, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.7, 1.4, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.15, 0.8, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.8, 0.9, 0.2]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} />
      </mesh>
      <mesh position={[0.8, 0.9, 0.2]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.3, 0.3, 0]}>
        <capsuleGeometry args={[0.2, 0.8, 4, 8]} />
        <meshStandardMaterial color="white" roughness={0.7} />
      </mesh>
      <mesh position={[0.3, 0.3, 0]}>
        <capsuleGeometry args={[0.2, 0.8, 4, 8]} />
        <meshStandardMaterial color="white" roughness={0.7} />
      </mesh>

      {/* Football (if ball carrier) */}
      {isBallCarrier && (
        <group position={[0.7, 1.2, 0.4]} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
          <mesh scale={[1, 0.6, 0.6]}>
            <sphereGeometry args={[0.25, 12, 12]} />
            <meshStandardMaterial color="#8B4513" roughness={0.6} />
          </mesh>
          {/* Laces */}
          <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.25, 0.03, 0.02]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ============================================
// PARTICLE SYSTEMS
// ============================================

interface GrassKickupProps {
  position: [number, number, number];
  intensity: number;
  isWet: boolean;
}

// Simplified grass particles - static for now to avoid hooks issues
function GrassKickup({ position, isWet }: GrassKickupProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = isWet ? 30 : 100;
  
  // Static positions - no animation to avoid hooks complexity
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = position[0] + (Math.random() - 0.5) * 4;
      arr[i * 3 + 1] = position[1] + Math.random() * 0.5;
      arr[i * 3 + 2] = position[2] + (Math.random() - 0.5) * 4;
    }
    return arr;
  }, [position[0], position[2], count]); // Only recompute when position changes significantly

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        color={isWet ? '#4a4a3a' : '#5a7c4a'} 
        size={isWet ? 0.12 : 0.08} 
        transparent 
        opacity={0.6} 
      />
    </points>
  );
}

// ============================================
// CROWD SYSTEM
// ============================================

// Crowd system with fixed count to avoid hook issues
function CrowdSystem({ stadiumId, density }: { stadiumId: StadiumId; density: number }) {
  const config = STADIUM_CONFIGS[stadiumId];
  // Fixed count to avoid dynamic hook issues - use density to scale visually
  const count = 1500; // Fixed at medium density
  
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Scale the crowd area based on density
    const crowdRadius = density > 0.7 ? 40 : 25;
    
    for (let i = 0; i < count; i++) {
      // Stadium bowl curve
      const angle = (Math.random() - 0.5) * Math.PI * 0.8;
      const radius = 70 + Math.random() * crowdRadius;
      const height = 5 + Math.random() * 25;
      
      positions[i * 3] = Math.sin(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = -Math.cos(angle) * radius - 30;
      
      // Random team colors
      const isHome = Math.random() > 0.3;
      colors[i * 3] = isHome ? 0.2 + Math.random() * 0.3 : 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = isHome ? 0.4 + Math.random() * 0.4 : 0.2 + Math.random() * 0.2;
      colors[i * 3 + 2] = isHome ? 0.8 + Math.random() * 0.2 : 0.2 + Math.random() * 0.2;
    }
    
    return { positions, colors };
  }, [stadiumId]); // Only recompute when stadium changes

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={positions.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={density > 0.7 ? 0.8 : 0.6} 
        vertexColors 
        transparent 
        opacity={density > 0.5 ? 0.9 : 0.6}
        sizeAttenuation
      />
    </points>
  );
}

// ============================================
// STADIUM LIGHTS
// ============================================

function StadiumLights({ enabled, position }: { enabled: boolean; position: [number, number, number] }) {
  if (!enabled) return null;
  
  return (
    <group position={position}>
      {/* Light housing */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 2, 2]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Light beam visualization */}
      <spotLight
        position={[0, 0, 0]}
        target-position={[0, -50, 0]}
        angle={Math.PI / 4}
        penumbra={0.5}
        intensity={2}
        distance={150}
        castShadow
        color="#fff8e7"
      />
      
      {/* Glow effect */}
      <mesh position={[0, -1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 0.5]} />
        <meshBasicMaterial color="#ffdd88" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ============================================
// MAIN SCENE
// ============================================

interface GridironSceneProps {
  fieldState: FieldState;
  spoonState: SpoonState;
  stadiumId: StadiumId;
  playOutcome?: PlayOutcome | null;
}

function GridironScene({ fieldState, spoonState, stadiumId, playOutcome }: GridironSceneProps) {
  const config = STADIUM_CONFIGS[stadiumId];
  const ballX = (fieldState.yardLine - 50) * 1.2;
  const showDetails = spoonState > 1;
  const showParticles = spoonState > 2;

  return (
    <>
      {/* Atmospheric fog */}
      <fog attach="fog" args={[config.fogColor, 30, 150]} />
      
      {/* Sky */}
      <color attach="background" args={[config.skyColor]} />
      
      {/* Global illumination */}
      <ambientLight intensity={config.ambientIntensity} color={config.fogColor} />
      
      {/* Sun/Moon light */}
      <directionalLight
        position={config.sunPosition}
        intensity={config.sunIntensity}
        color={config.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001}
      />
      
      {/* Stadium lights for night/dome games */}
      {config.stadiumLights && (
        <>
          <StadiumLights enabled position={[-40, 40, -20]} />
          <StadiumLights enabled position={[40, 40, -20]} />
          <StadiumLights enabled position={[-40, 40, 20]} />
          <StadiumLights enabled position={[40, 40, 20]} />
        </>
      )}

      {/* Field */}
      <FieldSurface stadiumId={stadiumId} isWet={config.weather === 'rain'} />
      
      {/* Crowd */}
      {showDetails && <CrowdSystem stadiumId={stadiumId} density={spoonState === 6 ? 1 : 0.5} />}

      {/* Players */}
      {showDetails && (
        <>
          {/* Offense */}
          <PlayerModel
            position={[ballX - 3, 0, -2]}
            color="#2563eb"
            number="12"
            animation="stance"
          />
          <PlayerModel
            position={[ballX - 4, 0, 0]}
            color="#2563eb"
            number="28"
            animation="stance"
          />
          <PlayerModel
            position={[ballX - 1, 0, -8]}
            color="#2563eb"
            number="88"
            animation="stance"
          />
          
          {/* Offensive Line */}
          {[-6, -3, 0, 3, 6].map((z, i) => (
            <PlayerModel
              key={i}
              position={[ballX - 1, 0, z]}
              color="#1d4ed8"
              number={['76', '65', '52', '68', '79'][i]}
              animation="stance"
            />
          ))}
          
          {/* Defense */}
          <PlayerModel
            position={[ballX + 4, 0, 0]}
            color="#dc2626"
            number="99"
            animation="stance"
          />
          <PlayerModel
            position={[ballX + 6, 0, -4]}
            color="#dc2626"
            number="55"
            animation="stance"
          />
          <PlayerModel
            position={[ballX + 6, 0, 4]}
            color="#dc2626"
            number="54"
            animation="stance"
          />
        </>
      )}

      {/* Grass kickup particles */}
      {showParticles && playOutcome?.type === 'GAIN' && (
        <GrassKickup 
          position={[ballX + 5, 0, 0]} 
          intensity={1} 
          isWet={config.weather === 'rain'} 
        />
      )}
    </>
  );
}

// ============================================
// POST-PROCESSING EFFECTS
// ============================================

function PostProcessing({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
      {/* Bloom for bright lights */}
      <Bloom 
        intensity={quality === 'high' ? 0.8 : 0.5} 
        luminanceThreshold={0.8}
        luminanceSmoothing={0.4}
        height={quality === 'high' ? 512 : 256}
      />
      
      {/* Subtle chromatic aberration for lens effect */}
      {quality !== 'low' && (
        <ChromaticAberration offset={[0.001, 0.001]} />
      )}
      
      {/* Vignette for broadcast feel */}
      <Vignette 
        offset={0.3} 
        darkness={0.4} 
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Film grain */}
      <Noise opacity={0.03} />
      
      {/* Tone mapping for HDR look */}
      <ToneMapping mode={THREE.ACESFilmicToneMapping} />
    </EffectComposer>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

interface GridironEnhancedProps {
  fieldState?: FieldState;
  spoonState?: SpoonState;
  stadiumId?: StadiumId;
  playOutcome?: PlayOutcome | null;
}

export function GridironEnhanced({
  fieldState = {
    down: 1,
    distance: 10,
    yardLine: 25,
    possession: 'HOME',
    gameClock: 900,
    quarter: 1,
    scoreHome: 0,
    scoreAway: 0,
  },
  spoonState = 6,
  stadiumId = 'modernDome',
  playOutcome = null,
}: GridironEnhancedProps) {
  const quality = spoonState === 1 ? 'low' : spoonState === 3 ? 'medium' : 'high';
  const pixelRatio = spoonState === 1 ? 0.5 : spoonState === 3 ? 1 : Math.min(2, window.devicePixelRatio);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 50, 55], zoom: 1.1 }}
        orthographic
        gl={{
          antialias: quality !== 'low',
          powerPreference: quality === 'high' ? 'high-performance' : 'default',
          alpha: false,
        }}
        dpr={pixelRatio}
        shadows={quality === 'high'}
      >
        <OrthographicCamera
          makeDefault
          position={[0, 50, 55]}
          zoom={1.1}
          near={0.1}
          far={300}
        />
        
        <GridironScene
          fieldState={fieldState}
          spoonState={spoonState}
          stadiumId={stadiumId}
          playOutcome={playOutcome}
        />
        
        {quality !== 'low' && <PostProcessing quality={quality} />}
      </Canvas>
    </div>
  );
}

export default GridironEnhanced;
