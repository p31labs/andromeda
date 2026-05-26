// P31 Gridiron 2.5D Field Renderer
// Isometric football field with yard lines

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { SpoonState, FieldState } from '../types';

// Field dimensions (yards)
const FIELD = {
  length: 120, // 100 + 2 end zones
  width: 53.3,
  yardLines: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], // 0 and 100 are goal lines
  hashMarks: true,
};

// Colors
const COLORS = {
  turf: '#3d7c3d',
  turfDark: '#2d5c2d',
  lines: '#ffffff',
  endZone: '#1a4d1a',
  goalPost: '#ffcc00',
};

function YardLine({ x, number }: { x: number; number?: number }) {
  const isGoalLine = x === 0 || x === 100;
  const isFifty = x === 50;
  
  return (
    <group position={[x - 50, 0, 0]}>
      {/* The line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.5, FIELD.width]} />
        <meshBasicMaterial 
          color={isGoalLine ? '#ffdd44' : COLORS.lines} 
          transparent={!isGoalLine}
          opacity={isGoalLine ? 1 : 0.8}
        />
      </mesh>
      
      {/* Yard number */}
      {number && (
        <>
          {/* North side number */}
          <mesh position={[0, 0.1, -FIELD.width/2 + 5]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[4, 3]} />
            <meshBasicMaterial color={COLORS.lines} transparent opacity={0.9} />
          </mesh>
          {/* South side number (mirrored) */}
          <mesh position={[0, 0.1, FIELD.width/2 - 5]}>
            <planeGeometry args={[4, 3]} />
            <meshBasicMaterial color={COLORS.lines} transparent opacity={0.9} />
          </mesh>
        </>
      )}
      
      {/* Hash marks */}
      {!isGoalLine && (
        <>
          <mesh position={[0, 0.01, -FIELD.width/4]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.3, 1]} />
            <meshBasicMaterial color={COLORS.lines} />
          </mesh>
          <mesh position={[0, 0.01, FIELD.width/4]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.3, 1]} />
            <meshBasicMaterial color={COLORS.lines} />
          </mesh>
        </>
      )}
    </group>
  );
}

function FieldSurface() {
  return (
    <group>
      {/* Main field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FIELD.length, FIELD.width]} />
        <meshStandardMaterial color={COLORS.turf} />
      </mesh>
      
      {/* End zones */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-55, 0.01, 0]}>
        <planeGeometry args={[10, FIELD.width]} />
        <meshStandardMaterial color={COLORS.endZone} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[55, 0.01, 0]}>
        <planeGeometry args={[10, FIELD.width]} />
        <meshStandardMaterial color={COLORS.endZone} />
      </mesh>
      
      {/* Yard lines */}
      {FIELD.yardLines.map((yard) => (
        <YardLine 
          key={yard} 
          x={yard} 
          number={yard % 10 === 0 && yard !== 0 && yard !== 100 ? yard : undefined}
        />
      ))}
      
      {/* 50-yard line (thicker) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[1, FIELD.width]} />
        <meshBasicMaterial color={COLORS.lines} />
      </mesh>
      
      {/* Goal posts */}
      <GoalPost side="left" />
      <GoalPost side="right" />
    </group>
  );
}

function GoalPost({ side }: { side: 'left' | 'right' }) {
  const x = side === 'left' ? -60 : 60;
  
  return (
    <group position={[x, 0, 0]}>
      {/* Base */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 6]} />
        <meshStandardMaterial color={COLORS.goalPost} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[side === 'left' ? 2 : -2, 3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 18]} />
        <meshStandardMaterial color={COLORS.goalPost} />
      </mesh>
      {/* Uprights */}
      <mesh position={[side === 'left' ? 11 : -11, 6.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 7]} />
        <meshStandardMaterial color={COLORS.goalPost} />
      </mesh>
      <mesh position={[side === 'left' ? -7 : 7, 6.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 7]} />
        <meshStandardMaterial color={COLORS.goalPost} />
      </mesh>
    </group>
  );
}

function PlayerDot({ position, color, label }: { position: [number, number, number], color: string, label?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (ref.current) {
      ref.current.lookAt(camera.position);
    }
  });
  
  return (
    <group position={position}>
      <mesh ref={ref} position={[0, 0.3, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && (
        <mesh position={[0, 1.2, 0]}>
          <planeGeometry args={[1.5, 0.5]} />
          <meshBasicMaterial color="black" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function Ball({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[Math.PI / 4, 0, 0]} scale={[1, 1.6, 1]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color="#8B4513" />
    </mesh>
  );
}

interface GridironSceneProps {
  fieldState: FieldState;
  spoonState: SpoonState;
  showPlayers?: boolean;
}

function GridironScene({ fieldState, spoonState, showPlayers = true }: GridironSceneProps) {
  // Position ball based on yard line
  const ballPosition: [number, number, number] = [
    fieldState.yardLine - 50, // Center at 50
    0.3,
    0
  ];
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 30, 20]} intensity={1} castShadow />
      
      <FieldSurface />
      
      {showPlayers && spoonState > 1 && (
        <>
          {/* Offense */}
          <PlayerDot position={[ballPosition[0] - 2, 0, -5]} color="#3b82f6" label="QB" />
          <PlayerDot position={[ballPosition[0] - 3, 0, -2]} color="#3b82f6" label="RB" />
          <PlayerDot position={[ballPosition[0] - 1, 0, -8]} color="#3b82f6" label="WR" />
          <PlayerDot position={[ballPosition[0] - 1, 0, 8]} color="#3b82f6" label="WR" />
          
          {/* Defense */}
          <PlayerDot position={[ballPosition[0] + 3, 0, 0]} color="#ef4444" label="DL" />
          <PlayerDot position={[ballPosition[0] + 5, 0, -3]} color="#ef4444" label="LB" />
          <PlayerDot position={[ballPosition[0] + 6, 0, -6]} color="#ef4444" label="CB" />
          <PlayerDot position={[ballPosition[0] + 6, 0, 6]} color="#ef4444" label="CB" />
        </>
      )}
      
      <Ball position={ballPosition} />
    </>
  );
}

interface GridironProps {
  fieldState?: FieldState;
  spoonState?: SpoonState;
  showPlayers?: boolean;
}

export function Gridiron({ 
  fieldState = { down: 1, distance: 10, yardLine: 25, possession: 'HOME', gameClock: 900, quarter: 1, scoreHome: 0, scoreAway: 0 },
  spoonState = 6,
  showPlayers = true
}: GridironProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        frameloop={spoonState === 1 ? 'never' : 'demand'}
        camera={{ position: [0, 40, 40], zoom: 1.5 }}
        orthographic
        gl={{ antialias: spoonState === 6 }}
        dpr={spoonState === 1 ? 0.5 : spoonState === 3 ? 1 : [1, 2]}
      >
        <OrthographicCamera
          makeDefault
          position={[0, 60, 60]}
          zoom={2}
          near={0.1}
          far={1000}
        />
        <GridironScene 
          fieldState={fieldState} 
          spoonState={spoonState}
          showPlayers={showPlayers}
        />
      </Canvas>
    </div>
  );
}

export default Gridiron;
