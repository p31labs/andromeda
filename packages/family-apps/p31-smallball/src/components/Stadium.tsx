// React Three Fiber 2.5D Stadium Renderer
// Orthographic isometric view with billboard sprites

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Grid, Stats } from '@react-three/drei';
import * as THREE from 'three';
import type { Player, BillboardSprite, SpoonState } from '../types';

// ============================================
// FIELD GEOMETRY
// ============================================

// Standard baseball field dimensions (in feet)
const FIELD = {
  baseDistance: 90,
  moundDistance: 60.5,
  foulLine: 315, // minimum to outfield fence
  centerField: 400,
};

// Scale factor (feet to 3D units)
const SCALE = 0.1;

function FieldGeometry() {
  const bases = useMemo(() => {
    // Diamond formation
    const home = new THREE.Vector3(0, 0, 0);
    const first = new THREE.Vector3(FIELD.baseDistance * SCALE, 0, 0);
    const second = new THREE.Vector3(
      FIELD.baseDistance * SCALE,
      0,
      -FIELD.baseDistance * SCALE
    );
    const third = new THREE.Vector3(0, 0, -FIELD.baseDistance * SCALE);
    
    // Pitcher's mound
    const mound = new THREE.Vector3(
      FIELD.baseDistance * SCALE * 0.5,
      0.3, // slightly elevated
      -FIELD.baseDistance * SCALE * 0.5
    );
    
    return { home, first, second, third, mound };
  }, []);

  return (
    <group>
      {/* Infield dirt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIELD.baseDistance * SCALE * 0.5, -0.1, -FIELD.baseDistance * SCALE * 0.5]}>
        <circleGeometry args={[FIELD.baseDistance * SCALE * 1.2, 64]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>
      
      {/* Grass outfield */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIELD.baseDistance * SCALE * 0.5, -0.15, -FIELD.baseDistance * SCALE * 0.5]}>
        <circleGeometry args={[FIELD.centerField * SCALE, 64]} />
        <meshStandardMaterial color="#4A6741" />
      </mesh>
      
      {/* Foul lines */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              bases.home.x, bases.home.y, bases.home.z,
              bases.first.x + 50 * SCALE, bases.first.y, bases.first.z,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="white" linewidth={2} />
      </line>
      
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              bases.home.x, bases.home.y, bases.home.z,
              bases.third.x, bases.third.y, bases.third.z - 50 * SCALE,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="white" linewidth={2} />
      </line>
      
      {/* Bases */}
      {[bases.home, bases.first, bases.second, bases.third].map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[1.5 * SCALE, 0.2, 1.5 * SCALE]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
      
      {/* Pitcher's mound */}
      <mesh position={bases.mound}>
        <cylinderGeometry args={[2.5 * SCALE, 2.5 * SCALE, 0.3, 32]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>
      
      {/* Pitcher's rubber */}
      <mesh position={[bases.mound.x, bases.mound.y + 0.2, bases.mound.z]}>
        <boxGeometry args={[2 * SCALE, 0.1, 0.5 * SCALE]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}

// ============================================
// BILLBOARD SPRITE SYSTEM
// ============================================

interface PlayerSpriteProps {
  position: [number, number, number];
  animation: string;
  direction: 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK';
  spoonState: SpoonState;
  color?: string;
  number?: number;
}

function PlayerSprite({ position, animation, direction, spoonState, color = '#E8A87C', number = 0 }: PlayerSpriteProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();

  // Generate simple pixel-art texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Background (transparent)
    ctx.clearRect(0, 0, 64, 128);
    
    // Simple player silhouette based on direction
    ctx.fillStyle = color;
    
    if (direction === 'FRONT' || direction === 'BACK') {
      // Head
      ctx.fillRect(24, 8, 16, 16);
      // Body
      ctx.fillRect(20, 28, 24, 40);
      // Legs
      ctx.fillRect(20, 72, 10, 48);
      ctx.fillRect(34, 72, 10, 48);
    } else {
      // Side profile
      // Head
      ctx.fillRect(28, 8, 12, 16);
      // Body
      ctx.fillRect(24, 28, 16, 40);
      // Legs
      ctx.fillRect(24, 72, 7, 48);
      ctx.fillRect(33, 72, 7, 48);
    }
    
    // Jersey number
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(number.toString(), 32, 50);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Pixelated look
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }, [direction, color, number]);

  // Billboard effect: always face camera
  useFrame(() => {
    if (spriteRef.current) {
      spriteRef.current.lookAt(camera.position);
    }
  });

  // Animation frame rate based on spoon state
  const fps = spoonState === 1 ? 0 : spoonState === 3 ? 12 : 24;

  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[2 * SCALE * 10, 4 * SCALE * 10, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        alphaTest={0.1}
      />
    </sprite>
  );
}

// ============================================
// BALL PHYSICS
// ============================================

interface BallProps {
  trajectory: {
    startPosition: [number, number, number];
    velocity: [number, number, number];
    spin: [number, number, number];
  };
  spoonState: SpoonState;
}

function Ball({ trajectory, spoonState }: BallProps) {
  const ballRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  useFrame(() => {
    if (!ballRef.current || spoonState === 1) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const g = -9.8; // gravity

    // Simple projectile motion
    const x = trajectory.startPosition[0] + trajectory.velocity[0] * elapsed;
    const y = trajectory.startPosition[1] + trajectory.velocity[1] * elapsed + 0.5 * g * elapsed * elapsed;
    const z = trajectory.startPosition[2] + trajectory.velocity[2] * elapsed;

    ballRef.current.position.set(x, Math.max(0, y), z);

    // Rotation from spin
    ballRef.current.rotation.x += trajectory.spin[0] * elapsed * 0.1;
    ballRef.current.rotation.y += trajectory.spin[1] * elapsed * 0.1;
  });

  if (spoonState === 1) return null; // No ball animation in 1-spoon mode

  return (
    <mesh ref={ballRef} position={trajectory.startPosition}>
      <sphereGeometry args={[0.15 * SCALE * 10, 16, 16]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

// ============================================
// MAIN STADIUM SCENE
// ============================================

interface StadiumSceneProps {
  players: Player[];
  spoonState: SpoonState;
  showDebug?: boolean;
}

function StadiumScene({ players, spoonState, showDebug = false }: StadiumSceneProps) {
  // Position players on field
  const positionedPlayers = useMemo(() => {
    const positions: Array<{ player: Player; position: [number, number, number]; role: string }> = [];
    
    // Pitcher on mound
    if (players[0]) {
      positions.push({
        player: players[0],
        position: [FIELD.baseDistance * SCALE * 0.5, 0.5, -FIELD.baseDistance * SCALE * 0.5],
        role: 'P',
      });
    }
    
    // Catcher behind home
    if (players[1]) {
      positions.push({
        player: players[1],
        position: [0, 0.5, 8 * SCALE],
        role: 'C',
      });
    }
    
    // First baseman
    if (players[2]) {
      positions.push({
        player: players[2],
        position: [FIELD.baseDistance * SCALE + 8 * SCALE, 0.5, 0],
        role: '1B',
      });
    }
    
    // Second baseman
    if (players[3]) {
      positions.push({
        player: players[3],
        position: [FIELD.baseDistance * SCALE * 0.7, 0.5, -FIELD.baseDistance * SCALE * 0.7],
        role: '2B',
      });
    }
    
    // Third baseman
    if (players[4]) {
      positions.push({
        player: players[4],
        position: [-8 * SCALE, 0.5, -FIELD.baseDistance * SCALE],
        role: '3B',
      });
    }
    
    // Shortstop
    if (players[5]) {
      positions.push({
        player: players[5],
        position: [FIELD.baseDistance * SCALE * 0.3, 0.5, -FIELD.baseDistance * SCALE * 0.8],
        role: 'SS',
      });
    }
    
    // Outfielders
    if (players[6]) {
      positions.push({
        player: players[6],
        position: [-30 * SCALE, 0.5, -FIELD.baseDistance * SCALE * 1.5],
        role: 'LF',
      });
    }
    if (players[7]) {
      positions.push({
        player: players[7],
        position: [FIELD.baseDistance * SCALE * 0.5, 0.5, -FIELD.centerField * SCALE * 0.8],
        role: 'CF',
      });
    }
    if (players[8]) {
      positions.push({
        player: players[8],
        position: [FIELD.baseDistance * SCALE + 30 * SCALE, 0.5, -FIELD.baseDistance * SCALE * 1.5],
        role: 'RF',
      });
    }
    
    return positions;
  }, [players]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      
      {/* Field */}
      <FieldGeometry />
      
      {/* Players */}
      {positionedPlayers.map(({ player, position, role }) => (
        <PlayerSprite
          key={player.id}
          position={position}
          animation="IDLE"
          direction="FRONT"
          spoonState={spoonState}
          color={player.skinToneHex}
          number={player.jerseyNumber}
        />
      ))}
      
      {/* Example ball trajectory (for demo) */}
      {spoonState > 1 && (
        <Ball
          trajectory={{
            startPosition: [FIELD.baseDistance * SCALE * 0.5, 2, -FIELD.baseDistance * SCALE * 0.5],
            velocity: [10 * SCALE, 15, -20 * SCALE],
            spin: [1, 0, 0],
          }}
          spoonState={spoonState}
        />
      )}
      
      {/* Debug stats */}
      {showDebug && <Stats />}
    </>
  );
}

// ============================================
// MAIN STADIUM COMPONENT
// ============================================

interface StadiumProps {
  players?: Player[];
  spoonState?: SpoonState;
  showDebug?: boolean;
}

export function Stadium({ 
  players = [], 
  spoonState = 6,
  showDebug = false 
}: StadiumProps) {
  // Generate demo players if none provided
  const demoPlayers: Player[] = players.length > 0 ? players : [
    { id: '1', franchiseId: '1', firstName: 'Ace', lastName: 'Pitcher', skinToneHex: '#E8A87C', jerseyNumber: 21, baseStats: {} as any, crdtClock: 0n },
    { id: '2', franchiseId: '1', firstName: 'Catch', lastName: 'McGrab', skinToneHex: '#8D5524', jerseyNumber: 4, baseStats: {} as any, crdtClock: 0n },
    { id: '3', franchiseId: '1', firstName: 'First', lastName: 'Baseman', skinToneHex: '#E8A87C', jerseyNumber: 15, baseStats: {} as any, crdtClock: 0n },
    { id: '4', franchiseId: '1', firstName: 'Second', lastName: 'Baseman', skinToneHex: '#C68642', jerseyNumber: 7, baseStats: {} as any, crdtClock: 0n },
    { id: '5', franchiseId: '1', firstName: 'Third', lastName: 'Baseman', skinToneHex: '#E8A87C', jerseyNumber: 5, baseStats: {} as any, crdtClock: 0n },
    { id: '6', franchiseId: '1', firstName: 'Short', lastName: 'Stop', skinToneHex: '#8D5524', jerseyNumber: 6, baseStats: {} as any, crdtClock: 0n },
    { id: '7', franchiseId: '1', firstName: 'Left', lastName: 'Fielder', skinToneHex: '#E8A87C', jerseyNumber: 8, baseStats: {} as any, crdtClock: 0n },
    { id: '8', franchiseId: '1', firstName: 'Center', lastName: 'Fielder', skinToneHex: '#C68642', jerseyNumber: 20, baseStats: {} as any, crdtClock: 0n },
    { id: '9', franchiseId: '1', firstName: 'Right', lastName: 'Fielder', skinToneHex: '#E8A87C', jerseyNumber: 9, baseStats: {} as any, crdtClock: 0n },
  ];

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas
        frameloop={spoonState === 1 ? 'never' : 'demand'}
        gl={{ 
          antialias: spoonState === 6,
          powerPreference: spoonState === 3 ? 'low-power' : 'high-performance',
        }}
        dpr={spoonState === 1 ? 0.5 : spoonState === 3 ? 1 : [1, 2]}
      >
        <OrthographicCamera
          makeDefault
          position={[20, 20, 20]}
          zoom={40}
          near={0.1}
          far={1000}
        />
        <StadiumScene 
          players={demoPlayers} 
          spoonState={spoonState}
          showDebug={showDebug}
        />
      </Canvas>
    </div>
  );
}

export default Stadium;
