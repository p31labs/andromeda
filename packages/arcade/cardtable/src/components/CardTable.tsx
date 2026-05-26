import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { SpotLight, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { generateTableTexture, getCachedCardTexture, getCachedCardBack } from '../utils/textureGenerator';

// Card dimensions (3D units)
const CARD_WIDTH = 2.5;
const CARD_HEIGHT = 3.5;
const CARD_THICKNESS = 0.02;

// Table dimensions
const TABLE_WIDTH = 40;
const TABLE_DEPTH = 24;

interface CardState {
  id: string;
  value: string;
  suit: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  isFaceUp: boolean;
  owner?: string;
}

interface ChipState {
  id: string;
  color: string;
  value: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

// Table Lighting Component
const TableLighting: React.FC = () => {
  return (
    <>
      {/* Ambient base */}
      <ambientLight intensity={0.3} color="#ffffff" />

      {/* Main spot light for dramatic shadows */}
      <SpotLight
        position={[-15, 25, 10]}
        angle={Math.PI / 4}
        penumbra={0.8}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        color="#ffffff"
      />

      {/* Fill light from opposite side */}
      <SpotLight
        position={[15, 20, -5]}
        angle={Math.PI / 3}
        penumbra={1}
        intensity={0.5}
        color="#00f5ff"
      />

      {/* Warm accent from behind */}
      <pointLight
        position={[0, 15, -15]}
        intensity={0.3}
        color="#feca57"
      />

      {/* Co-op mode ambient */}
      <ambientLight intensity={0.1} color="#da70d6" />
    </>
  );
};

// Procedural Table Surface
const TableSurface: React.FC = () => {
  const tableTexture = useMemo(() => generateTableTexture(), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[TABLE_WIDTH, TABLE_DEPTH]} />
      <meshStandardMaterial
        map={tableTexture}
        roughness={0.9}
        metalness={0.1}
        color="#111522"
      />
    </mesh>
  );
};

// Glassmorphism Table Border
const TableBorder: React.FC = () => {
  return (
    <>
      {/* Outer rim */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TABLE_WIDTH / 2 + 1, TABLE_WIDTH / 2 + 2, 64]} />
        <meshStandardMaterial
          color="#1a1f2e"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Side walls */}
      {Array.from({ length: 4 }).map((_, i) => {
        const angle = (i * Math.PI) / 2;
        const x = Math.sin(angle) * (TABLE_WIDTH / 2 + 1.5);
        const z = Math.cos(angle) * (TABLE_DEPTH / 2 + 1.5);
        const isLong = i % 2 === 0;

        return (
          <mesh
            key={i}
            position={[x, -1, z]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[isLong ? TABLE_WIDTH : TABLE_DEPTH + 3, 2, 0.5]} />
            <meshStandardMaterial
              color="#0d1118"
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        );
      })}
    </>
  );
};

// Individual Card Component
interface PlayingCardProps {
  value: string;
  suit: string;
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  isFaceUp: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
  value,
  suit,
  targetPosition,
  targetRotation,
  isFaceUp,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // Generate materials once
  const materials = useMemo(() => {
    const frontTexture = getCachedCardTexture(value, suit);
    const backTexture = getCachedCardBack();

    // Multi-material array for box: right, left, top, bottom, front, back
    const edgeMat = new THREE.MeshStandardMaterial({
      color: '#f8f9fa',
      roughness: 0.4,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.4,
      metalness: 0.1,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      roughness: 0.4,
      metalness: 0.1,
    });

    return [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
  }, [value, suit]);

  materialsRef.current = materials;

  // Smooth interpolation animation
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const lerpFactor = delta * 8;

    // Position interpolation
    meshRef.current.position.lerp(targetPosition, lerpFactor);

    // Rotation interpolation using quaternion slerp
    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
    meshRef.current.quaternion.slerp(targetQuaternion, lerpFactor);

    // Face up/down rotation offset
    const faceUpOffset = isFaceUp ? 0 : Math.PI;
    const currentRotation = meshRef.current.rotation.clone();
    if (!isFaceUp && Math.abs(currentRotation.y - targetRotation.y) < 0.1) {
      meshRef.current.rotateY(faceUpOffset);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS)}
      material={materials}
      castShadow
      receiveShadow
      onClick={onClick}
    >
    </mesh>
  );
};

// Casino Chip Component with Physics
interface CasinoChipProps {
  color: string;
  value: number;
  initialPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  impulse?: THREE.Vector3;
}

const CasinoChip: React.FC<CasinoChipProps> = ({
  color,
  value,
  initialPosition,
  targetPosition,
  impulse,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocityRef = useRef(impulse || new THREE.Vector3(0, 0, 0));
  const isRestingRef = useRef(false);

  // Generate chip texture
  const chipTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Outer ring
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    // Color ring
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.fill();

    // Dots
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = 128 + Math.cos(angle) * 100;
      const y = 128 + Math.sin(angle) * 100;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(128, 128, 70, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 128, 128);

    return new THREE.CanvasTexture(canvas);
  }, [color, value]);

  // Physics simulation
  useFrame((state, delta) => {
    if (!meshRef.current || isRestingRef.current) return;

    const pos = meshRef.current.position;
    const vel = velocityRef.current;

    // Apply gravity
    vel.y -= 0.015;

    // Update position
    pos.add(vel.clone().multiplyScalar(delta * 60));

    // Floor collision (table surface at y=0.15)
    if (pos.y <= 0.15) {
      pos.y = 0.15;
      vel.y *= -0.4; // Bounce with dampening
      vel.x *= 0.8;  // Friction
      vel.z *= 0.8;

      // Stop if nearly at rest
      if (Math.abs(vel.y) < 0.01 && Math.abs(vel.x) < 0.01 && Math.abs(vel.z) < 0.01) {
        isRestingRef.current = true;
      }
    }

    // Lerp to target once resting
    if (isRestingRef.current) {
      pos.lerp(targetPosition, delta * 4);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={initialPosition}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[0.8, 0.8, 0.15, 32]} />
      <meshStandardMaterial
        map={chipTexture}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
};

// Love Economy Co-op Lighting
const CoOpLighting: React.FC<{ active: boolean }> = ({ active }) => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!lightRef.current || !active) return;

    // Pulsing orchid glow
    lightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
  });

  if (!active) return null;

  return (
    <pointLight
      ref={lightRef}
      position={[0, 15, 0]}
      color="#da70d6"
      intensity={0.5}
      distance={30}
      decay={2}
    />
  );
};

// Victory Lighting Sweep
const VictoryLighting: React.FC<{ active: boolean }> = ({ active }) => {
  const cyanRef = useRef<THREE.PointLight>(null);
  const phosRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!active) return;

    const time = state.clock.elapsedTime;

    if (cyanRef.current) {
      cyanRef.current.position.x = Math.sin(time) * 20;
      cyanRef.current.position.z = Math.cos(time) * 15;
    }

    if (phosRef.current) {
      phosRef.current.position.x = Math.sin(time + Math.PI) * 20;
      phosRef.current.position.z = Math.cos(time + Math.PI) * 15;
    }
  });

  if (!active) return null;

  return (
    <>
      <pointLight
        ref={cyanRef}
        position={[-20, 10, 0]}
        color="#00f5ff"
        intensity={1}
        distance={40}
      />
      <pointLight
        ref={phosRef}
        position={[20, 10, 0]}
        color="#39ff14"
        intensity={1}
        distance={40}
      />
    </>
  );
};

// Main Scene Component
interface CardTableSceneProps {
  cards: CardState[];
  chips: ChipState[];
  coOpMode: boolean;
  victoryMode: boolean;
  onCardClick: (cardId: string) => void;
  cameraMode: 'default' | 'top' | 'player';
}

const CardTableScene: React.FC<CardTableSceneProps> = ({
  cards,
  chips,
  coOpMode,
  victoryMode,
  onCardClick,
  cameraMode,
}) => {
  const { camera } = useThree();

  // Camera animation
  useFrame(() => {
    if (cameraMode === 'default') {
      camera.position.lerp(new THREE.Vector3(0, 25, 25), 0.05);
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'top') {
      camera.position.lerp(new THREE.Vector3(0, 35, 0), 0.05);
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'player') {
      camera.position.lerp(new THREE.Vector3(0, 12, 18), 0.05);
      camera.lookAt(0, 0, -5);
    }
  });

  return (
    <>
      <TableLighting />
      <CoOpLighting active={coOpMode} />
      <VictoryLighting active={victoryMode} />

      <TableSurface />
      <TableBorder />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={50}
        blur={2}
        far={10}
      />

      {/* Render cards */}
      {cards.map((card) => (
        <PlayingCard
          key={card.id}
          value={card.value}
          suit={card.suit}
          targetPosition={card.position}
          targetRotation={card.rotation}
          isFaceUp={card.isFaceUp}
          onClick={() => onCardClick(card.id)}
        />
      ))}

      {/* Render chips */}
      {chips.map((chip) => (
        <CasinoChip
          key={chip.id}
          color={chip.color}
          value={chip.value}
          initialPosition={chip.position}
          targetPosition={chip.position}
          impulse={chip.velocity}
        />
      ))}

      {/* Co-op connection lines visualization */}
      {coOpMode && cards.length >= 2 && (
        <group>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  cards[0]?.position.x || 0, 0.5, cards[0]?.position.z || 0,
                  cards[1]?.position.x || 0, 0.5, cards[1]?.position.z || 0,
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#da70d6" linewidth={3} />
          </line>
        </group>
      )}
    </>
  );
};

// Loading fallback
const CanvasLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-white/50">Loading Card Table...</p>
    </div>
  </div>
);

// Main exported component
interface CardTableProps {
  cards: CardState[];
  chips: ChipState[];
  coOpMode?: boolean;
  victoryMode?: boolean;
  onCardClick: (cardId: string) => void;
  cameraMode?: 'default' | 'top' | 'player';
}

export const CardTable: React.FC<CardTableProps> = ({
  cards,
  chips,
  coOpMode = false,
  victoryMode = false,
  onCardClick,
  cameraMode = 'default',
}) => {
  return (
    <div className="w-full h-full">
      <Suspense fallback={<CanvasLoader />}>
        <Canvas
          shadows
          camera={{ position: [0, 25, 25], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <CardTableScene
            cards={cards}
            chips={chips}
            coOpMode={coOpMode}
            victoryMode={victoryMode}
            onCardClick={onCardClick}
            cameraMode={cameraMode}
          />
        </Canvas>
      </Suspense>
    </div>
  );
};

export type { CardState, ChipState };
