import React, { Suspense, useState, useRef, useMemo } from 'react';
import { ArrowLeft, Pause, Play, Settings, Radio } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Line, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

interface HighEnergyViewProps {
  onBack: () => void;
}

// Procedural Turf Texture (Zero external assets)
const ProceduralTurf: React.FC = () => {
  const turfTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Alternating yard stripes
    const yardWidth = canvas.width / 20; // 20 stripes for 100 yard field

    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1e3f12' : '#254c17';
      ctx.fillRect(i * yardWidth, 0, yardWidth, canvas.height);

      // Yard lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(i * yardWidth, 0);
      ctx.lineTo(i * yardWidth, canvas.height);
      ctx.stroke();

      // Yard numbers
      if (i > 0 && i < 20 && i % 2 === 1) {
        const yardNumber = i <= 10 ? i * 5 : (20 - i) * 5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Top numbers
        ctx.save();
        ctx.translate(i * yardWidth, canvas.height * 0.15);
        ctx.rotate(Math.PI);
        ctx.fillText(String(yardNumber), 0, 0);
        ctx.restore();

        // Bottom numbers
        ctx.fillText(String(yardNumber), i * yardWidth, canvas.height * 0.85);
      }
    }

    // End zones
    ctx.fillStyle = '#00f5ff';
    ctx.fillRect(0, 0, yardWidth, canvas.height);
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(19 * yardWidth, 0, yardWidth, canvas.height);

    // End zone text
    ctx.save();
    ctx.translate(yardWidth * 0.5, canvas.height * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#0a101a';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('P31', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(19.5 * yardWidth, canvas.height * 0.5);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#0a101a';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GRID', 0, 0);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 53.3]} />
      <meshStandardMaterial map={turfTexture} roughness={0.8} metalness={0} />
    </mesh>
  );
};

// Player Sprite (Billboard)
interface PlayerSpriteProps {
  position: [number, number, number];
  color: string;
  number?: string;
  label?: string;
}

const PlayerSprite: React.FC<PlayerSpriteProps> = ({ position, color, number, label }) => {
  return (
    <Billboard position={position} follow={true}>
      <group>
        {/* Body */}
        <mesh>
          <planeGeometry args={[1.5, 2]} />
          <meshBasicMaterial color={color} depthWrite={false} />
        </mesh>

        {/* Jersey Number */}
        {number && (
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.8}
            color="white"
            anchorX="center"
            anchorY="center"
            font="/fonts/Inter-Bold.woff"
          >
            {number}
          </Text>
        )}

        {/* Label above head */}
        {label && (
          <Text
            position={[0, 1.5, 0.01]}
            fontSize={0.4}
            color={color}
            anchorX="center"
            anchorY="center"
          >
            {label}
          </Text>
        )}

        {/* Shadow */}
        <mesh position={[0, -1.2, -0.1]}>
          <ellipseGeometry args={[0.6, 0.3]} />
          <meshBasicMaterial color="black" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>
    </Billboard>
  );
};

// Formation Lines (Love Economy Visual)
const FormationLines: React.FC<{ show: boolean }> = ({ show }) => {
  const linePoints = useMemo(() => {
    // QB to WR connections
    return [
      [new THREE.Vector3(0, 0.5, 15), new THREE.Vector3(8, 0.5, 5)], // QB to WR1
      [new THREE.Vector3(0, 0.5, 15), new THREE.Vector3(-8, 0.5, 5)], // QB to WR2
      [new THREE.Vector3(0, 0.5, 15), new THREE.Vector3(0, 0.5, 0)], // QB to RB
    ];
  }, []);

  if (!show) return null;

  return (
    <>
      {linePoints.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="#da70d6"
          lineWidth={2}
          dashed
          dashScale={10}
          gapSize={5}
        />
      ))}
    </>
  );
};

// Camera Rig
interface CameraRigProps {
  mode: 'broadcast' | 'sky' | 'endzone';
  ballPosition: { x: number; z: number };
}

const CameraRig: React.FC<CameraRigProps> = ({ mode, ballPosition }) => {
  const { camera } = useThree();

  useFrame(() => {
    if (mode === 'broadcast') {
      // Track ball X, fixed Y and Z
      camera.position.lerp(new THREE.Vector3(ballPosition.x * 0.3, 40, 60), 0.05);
      camera.lookAt(ballPosition.x, 0, 0);
    } else if (mode === 'sky') {
      // Top down tactical view
      camera.position.lerp(new THREE.Vector3(ballPosition.x, 80, 0), 0.05);
      camera.lookAt(ballPosition.x, 0, 0);
    } else if (mode === 'endzone') {
      // End zone view
      camera.position.lerp(new THREE.Vector3(0, 20, 50), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

// Stadium Scene
const StadiumScene: React.FC<{ cameraMode: 'broadcast' | 'sky' | 'endzone'; showFormationLines: boolean }> = ({
  cameraMode,
  showFormationLines,
}) => {
  const [ballPosition, setBallPosition] = useState({ x: 0, z: 20 });

  // Simulate ball movement
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    setBallPosition({
      x: Math.sin(time * 0.5) * 20,
      z: 20 + Math.cos(time * 0.3) * 10,
    });
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[-20, 50, 20]} castShadow intensity={1} />
      <pointLight position={[0, 20, 0]} intensity={0.5} color="#feca57" />

      {/* Camera */}
      <CameraRig mode={cameraMode} ballPosition={ballPosition} />

      {/* Field */}
      <ProceduralTurf />

      {/* Formation Lines (Love Economy) */}
      <FormationLines show={showFormationLines} />

      {/* Offense (Cyan - P31) */}
      <PlayerSprite position={[0, 1, 15]} color="#00f5ff" number="12" label="QB" />
      <PlayerSprite position={[8, 1, 5]} color="#00f5ff" number="88" label="WR1" />
      <PlayerSprite position={[-8, 1, 5]} color="#00f5ff" number="80" label="WR2" />
      <PlayerSprite position={[0, 1, 0]} color="#00f5ff" number="28" label="RB" />
      <PlayerSprite position={[5, 1, 18]} color="#00f5ff" number="74" label="OL" />

      {/* Defense (Phos - Opponent) */}
      <PlayerSprite position={[0, 1, 25]} color="#39ff14" number="55" label="DL" />
      <PlayerSprite position={[6, 1, 30]} color="#39ff14" number="23" label="CB" />
      <PlayerSprite position={[-6, 1, 30]} color="#39ff14" number="21" label="CB" />
      <PlayerSprite position={[0, 1, 35]} color="#39ff14" number="52" label="LB" />
      <PlayerSprite position={[10, 1, 32]} color="#39ff14" number="30" label="S" />

      {/* Ball */}
      <mesh position={[ballPosition.x, 0.5, ballPosition.z]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>

      {/* Yard markers */}
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={i} position={[(i - 5) * 10, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 53.3]} />
          <meshBasicMaterial color="rgba(255,255,255,0.3)" />
        </mesh>
      ))}
    </>
  );
};

const CanvasLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-orchid border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-white/50">Loading Broadcast Stadium...</p>
    </div>
  </div>
);

export const HighEnergyView: React.FC<HighEnergyViewProps> = ({ onBack }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [cameraMode, setCameraMode] = useState<'broadcast' | 'sky' | 'endzone'>('broadcast');
  const [showFormationLines, setShowFormationLines] = useState(true);
  const [showPlaybook, setShowPlaybook] = useState(false);

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-orchid" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          <div>
            <h1 className="text-lg font-bold text-white">High Energy Mode</h1>
            <p className="text-xs text-white/50">6 Spoons • 30-Minute Loop</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-phos" />
            ) : (
              <Pause className="w-5 h-5 text-orchid" />
            )}
          </button>
          <button
            onClick={() => setShowPlaybook(!showPlaybook)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/50" />
          </button>
        </div>
      </header>

      {/* Score Bug */}
      <div className="absolute top-20 right-4 z-40 broadcast-scorebug">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-cyan font-bold">P31</p>
            <p className="text-2xl font-bold text-white">14</p>
          </div>
          <div className="text-center text-white/50">
            <p className="text-xs">Q3</p>
            <p className="text-lg font-bold">8:42</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-phos font-bold">OPP</p>
            <p className="text-2xl font-bold text-white">10</p>
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-white/70">
          2nd & 7 at P31 42
        </div>
      </div>

      {/* Main R3F Canvas */}
      <main className="flex-1 relative">
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            frameloop={isPaused ? 'never' : 'demand'}
            shadows
            className="w-full h-full"
            gl={{ antialias: true, alpha: false }}
          >
            <OrthographicCamera
              makeDefault
              position={[0, 40, 60]}
              zoom={20}
              near={-100}
              far={200}
            />
            <StadiumScene
              cameraMode={cameraMode}
              showFormationLines={showFormationLines}
            />
          </Canvas>
        </Suspense>

        {/* Playbook Panel */}
        {showPlaybook && (
          <div className="absolute top-20 left-4 glass-panel rounded-xl p-4 w-64 z-30">
            <h3 className="font-bold text-white mb-3">Playbook</h3>
            <div className="space-y-2">
              <PlayButton
                name="Slant Route"
                type="PASS_SHORT"
                active={true}
                onClick={() => {}}
              />
              <PlayButton
                name="Power Run"
                type="RUN"
                active={false}
                onClick={() => {}}
              />
              <PlayButton
                name="Go Deep"
                type="PASS_DEEP"
                active={false}
                onClick={() => {}}
              />
              <PlayButton
                name="Blitz 3"
                type="BLITZ"
                active={false}
                onClick={() => {}}
              />
            </div>

            <h3 className="font-bold text-white mt-4 mb-2">Camera</h3>
            <div className="flex gap-2">
              {(['broadcast', 'sky', 'endzone'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${
                    cameraMode === mode
                      ? 'bg-orchid/20 text-orchid border border-orchid/50'
                      : 'bg-white/5 text-white/50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFormationLines}
                onChange={(e) => setShowFormationLines(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-white/70">Show Formation Lines</span>
            </div>
          </div>
        )}

        {/* Snap Button */}
        <button
          className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-button px-8 py-4 rounded-xl
                     font-bold text-lg text-phos border-phos/50 shadow-[0_0_30px_rgba(57,255,20,0.2)]
                     hover:shadow-[0_0_40px_rgba(57,255,20,0.4)]"
          onClick={() => console.log('Snap!')}
        >
          🏈 SNAP BALL
        </button>
      </main>

      {/* Footer */}
      <footer className="glass-panel px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-white/30">
          R3F • Orthographic • Billboard Sprites • Procedural Turf
        </p>
        <div className="flex items-center gap-4 text-[10px] text-white/20">
          <span>60 FPS</span>
          <span>•</span>
          <span>frameloop=&quot;demand&quot;</span>
          <span>•</span>
          <span>Deterministic</span>
        </div>
      </footer>
    </div>
  );
};

// Play Button Component
interface PlayButtonProps {
  name: string;
  type: string;
  active: boolean;
  onClick: () => void;
}

const PlayButton: React.FC<PlayButtonProps> = ({ name, type, active, onClick }) => {
  const typeColors: Record<string, string> = {
    PASS_SHORT: 'text-cyan',
    PASS_DEEP: 'text-gold',
    RUN: 'text-phos',
    BLITZ: 'text-red-400',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg text-left transition-all ${
        active
          ? 'bg-white/10 border border-white/30'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <p className="font-bold text-white">{name}</p>
      <p className={`text-xs ${typeColors[type] || 'text-white/50'}`}>{type}</p>
    </button>
  );
};
