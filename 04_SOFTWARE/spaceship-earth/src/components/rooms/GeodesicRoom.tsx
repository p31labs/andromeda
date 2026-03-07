// spaceship-earth/src/components/rooms/GeodesicRoom.tsx
// B3: Geodesic building room — renders game-engine structures as R3F meshes.
// Player progression, rigidity visualization, challenge panel, placement FX.
// P31 Sovereign aesthetic: #00FF88 green on void, Space Mono, glow borders.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useNode } from '../../contexts/NodeContext';
import type { PlacedPiece, PrimitiveType, Structure } from '@p31/game-engine';

// ── P31 Sovereign Style Constants ──

const GREEN = '#00FF88';
const DIM = 'rgba(0, 255, 136, 0.4)';
const BG = 'rgba(10, 10, 31, 0.85)';
const BORDER = 'rgba(0, 255, 136, 0.2)';
const FONT = "'Space Mono', monospace";

const cardStyle: React.CSSProperties = {
  background: BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 4,
  boxShadow: `0 0 12px rgba(0, 255, 136, 0.06), inset 0 0 20px rgba(0, 255, 136, 0.03)`,
  fontFamily: FONT,
  color: GREEN,
};

const barTrack: React.CSSProperties = {
  background: 'rgba(0, 255, 136, 0.08)',
  borderRadius: 2,
  overflow: 'hidden',
  width: '100%',
};

const btnStyle = (active = false): React.CSSProperties => ({
  background: active ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 255, 136, 0.05)',
  border: `1px solid ${active ? 'rgba(0, 255, 136, 0.5)' : BORDER}`,
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: FONT,
  color: GREEN,
  boxShadow: active ? `0 0 10px rgba(0, 255, 136, 0.15)` : 'none',
  transition: 'all 0.15s',
});

// ── Placement particle burst ──

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  color: THREE.Color;
}

function PlacementParticles() {
  const ref = useRef<THREE.Points>(null);
  const particles = useRef<Particle[]>([]);
  const posArr = useRef(new Float32Array(300));
  const colArr = useRef(new Float32Array(300));

  useFrame((_, delta) => {
    if (!ref.current) return;
    const alive: Particle[] = [];
    for (const p of particles.current) {
      p.life -= delta * 2;
      if (p.life <= 0) continue;
      p.pos.addScaledVector(p.vel, delta);
      p.vel.y -= delta * 2;
      alive.push(p);
    }
    particles.current = alive;

    for (let i = 0; i < 100; i++) {
      if (i < alive.length) {
        posArr.current[i * 3] = alive[i].pos.x;
        posArr.current[i * 3 + 1] = alive[i].pos.y;
        posArr.current[i * 3 + 2] = alive[i].pos.z;
        colArr.current[i * 3] = alive[i].color.r * alive[i].life;
        colArr.current[i * 3 + 1] = alive[i].color.g * alive[i].life;
        colArr.current[i * 3 + 2] = alive[i].color.b * alive[i].life;
      } else {
        posArr.current[i * 3] = 0;
        posArr.current[i * 3 + 1] = -100;
        posArr.current[i * 3 + 2] = 0;
      }
    }

    const geo = ref.current.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  React.useEffect(() => {
    if (ref.current) {
      (ref.current as any).burst = (pos: THREE.Vector3, color: THREE.Color) => {
        for (let i = 0; i < 12; i++) {
          particles.current.push({
            pos: pos.clone(),
            vel: new THREE.Vector3(
              (Math.random() - 0.5) * 3,
              Math.random() * 3 + 1,
              (Math.random() - 0.5) * 3,
            ),
            life: 0.6 + Math.random() * 0.4,
            color: color.clone(),
          });
        }
      };
    }
  }, []);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={posArr.current} count={100} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colArr.current} count={100} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ── Primitive → R3F geometry ──

function PieceMesh({ piece }: { piece: PlacedPiece }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1 + piece.rotation.y;
    }
  });

  const geometry = useMemo(() => {
    switch (piece.type) {
      case 'tetrahedron':
        return new THREE.TetrahedronGeometry(piece.scale * 0.8);
      case 'octahedron':
        return new THREE.OctahedronGeometry(piece.scale * 0.8);
      case 'icosahedron':
        return new THREE.IcosahedronGeometry(piece.scale * 0.8);
      case 'strut':
        return new THREE.CylinderGeometry(0.05, 0.05, piece.scale, 8);
      case 'hub':
        return new THREE.SphereGeometry(piece.scale * 0.15, 12, 12);
    }
  }, [piece.type, piece.scale]);

  return (
    <mesh
      ref={meshRef}
      position={[piece.position.x, piece.position.y, piece.position.z]}
      geometry={geometry}
    >
      <meshStandardMaterial
        color={GREEN}
        transparent
        opacity={0.85}
        wireframe={piece.type !== 'hub'}
        emissive={GREEN}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// ── Connection lines between pieces ──

function ConnectionLines({ pieces }: { pieces: readonly PlacedPiece[] }) {
  const points = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    const seen = new Set<string>();
    for (const p of pieces) {
      for (const connId of p.connectedTo) {
        const key = [p.id, connId].sort().join(':');
        if (seen.has(key)) continue;
        seen.add(key);
        const other = pieces.find(q => q.id === connId);
        if (other) {
          lines.push([
            new THREE.Vector3(p.position.x, p.position.y, p.position.z),
            new THREE.Vector3(other.position.x, other.position.y, other.position.z),
          ]);
        }
      }
    }
    return lines;
  }, [pieces]);

  return (
    <>
      {points.map(([a, b], i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={GREEN} opacity={0.4} transparent />
        </line>
      ))}
    </>
  );
}

// ── P31 Grid ──

function GlowGrid() {
  return (
    <group>
      <gridHelper args={[12, 24, '#0a2a1a', '#050f10']} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial color="#050510" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// ── 3D Scene ──

function GeodesicScene({ structure }: { structure: Structure }) {
  return (
    <>
      <ambientLight intensity={0.3} color="#0a1a1f" />
      <pointLight position={[5, 8, 5]} intensity={0.8} color={GREEN} />
      <pointLight position={[-5, -3, 5]} intensity={0.4} color={GREEN} />
      <pointLight position={[0, 6, -4]} intensity={0.2} color="#0a4428" />
      <hemisphereLight args={['#0a1f14', '#050510', 0.3]} />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <GlowGrid />
      {structure.pieces.map(piece => (
        <PieceMesh key={piece.id} piece={piece} />
      ))}
      <ConnectionLines pieces={structure.pieces} />
      <PlacementParticles />
    </>
  );
}

// ── Tier colors — sovereign palette ──

const TIER_COLORS: Record<string, string> = {
  seedling: DIM,
  sprout: GREEN,
  sapling: '#cccc44',
  oak: '#FFB800',
  sequoia: '#ff3333',
};

const PRIMITIVE_LABELS: Record<PrimitiveType, string> = {
  tetrahedron: 'Tetra',
  octahedron: 'Octa',
  icosahedron: 'Icosa',
  strut: 'Strut',
  hub: 'Hub',
};

const PRIMITIVE_ICONS: Record<PrimitiveType, string> = {
  tetrahedron: '\u25B3',
  octahedron: '\u25C7',
  icosahedron: '\u2B21',
  strut: '\u2502',
  hub: '\u25CF',
};

// ── Main Component ──

export function GeodesicRoom() {
  const { game, player, structures, activeChallenge, availableChallenges } = useNode();
  const placeCountRef = useRef(0);
  const [lastPlaced, setLastPlaced] = useState<string | null>(null);

  const dome = structures[0] ?? null;

  const handlePlace = useCallback((type: PrimitiveType) => {
    if (!game || !dome) return;
    const n = placeCountRef.current++;
    const angle = n * 2.39996;
    const r = 0.5 + n * 0.3;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (n % 3) * 0.8;
    game.place(dome.id, type, { x, y, z });
    setLastPlaced(type);
    setTimeout(() => setLastPlaced(null), 400);
  }, [game, dome]);

  const handleUndo = useCallback(() => {
    if (!game || !dome) return;
    game.undo(dome.id);
  }, [game, dome]);

  const handleStartChallenge = useCallback((challengeId: string) => {
    if (!game) return;
    game.startChallenge(challengeId);
  }, [game]);

  if (!player || !dome) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, height: '100%', color: DIM, fontFamily: FONT,
      }}>
        <span style={{ fontSize: 11, letterSpacing: 1 }}>GEODESIC</span>
      </div>
    );
  }

  const rig = dome.rigidity;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [3, 3, 5], fov: 55 }}
        style={{ touchAction: 'none', background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <GeodesicScene structure={dome} />
      </Canvas>

      {/* Top-left: Progression panel */}
      <div style={{
        ...cardStyle,
        position: 'absolute', top: 8, left: 8,
        width: 160, padding: '8px 10px', fontSize: 10,
      }}>
        <div style={{ fontSize: 9, color: DIM, letterSpacing: 1, marginBottom: 4 }}>
          BUILDER
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span>Lv {player.level}</span>
          <span style={{
            color: TIER_COLORS[player.tier] ?? DIM,
            fontSize: 9, fontWeight: 600,
            textShadow: `0 0 8px ${(TIER_COLORS[player.tier] ?? GREEN)}44`,
          }}>
            {player.tier.toUpperCase()}
          </span>
        </div>
        <div style={{ ...barTrack, height: 4 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg, ${TIER_COLORS[player.tier] ?? GREEN}, ${TIER_COLORS[player.tier] ?? GREEN}88)`,
            width: `${Math.min(100, (player.xp % 100))}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: 8, color: DIM, marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
          <span>{player.xp}XP</span>
          <span>{player.totalPiecesPlaced}pc</span>
          <span>{player.buildStreak}d</span>
        </div>
      </div>

      {/* Top-right: Rigidity panel */}
      <div style={{
        ...cardStyle,
        position: 'absolute', top: 50, right: 8,
        width: 155, padding: '8px 10px', fontSize: 10,
      }}>
        <div style={{ fontSize: 9, color: DIM, letterSpacing: 1, marginBottom: 4 }}>
          RIGIDITY
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{
            color: rig.isRigid ? GREEN : '#cccc44',
            fontSize: 10, fontWeight: 600,
            textShadow: rig.isRigid ? `0 0 8px rgba(0, 255, 136, 0.3)` : 'none',
          }}>
            {rig.isRigid ? 'RIGID' : 'FLOPPY'}
          </span>
          <span style={{ fontSize: 10 }}>{(rig.coherence * 100).toFixed(0)}%</span>
        </div>
        <div style={{ ...barTrack, height: 4 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: rig.isRigid
              ? `linear-gradient(90deg, ${GREEN}, #44ffaa)`
              : 'linear-gradient(90deg, #cccc44, #FFB800)',
            width: `${Math.min(100, rig.coherence * 100)}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: 8, color: DIM, marginTop: 3, display: 'flex', gap: 6 }}>
          <span>E={rig.edges}</span>
          <span>V={rig.vertices}</span>
          <span>{rig.degreesOfFreedom}DOF</span>
        </div>
      </div>

      {/* Bottom-left: Piece toolbar */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: '60%',
      }}>
        {(['tetrahedron', 'octahedron', 'icosahedron', 'strut', 'hub'] as PrimitiveType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handlePlace(type)}
            style={{
              ...btnStyle(lastPlaced === type),
              padding: '6px 10px',
              fontSize: 9,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 12 }}>{PRIMITIVE_ICONS[type]}</span>
            {PRIMITIVE_LABELS[type]}
          </button>
        ))}
        <button
          type="button"
          onClick={handleUndo}
          style={{
            ...btnStyle(),
            padding: '6px 10px',
            fontSize: 9,
            borderColor: 'rgba(255, 51, 51, 0.2)',
            color: '#ff3333',
          }}
        >
          Undo
        </button>
      </div>

      {/* Bottom-right: Challenge panel */}
      <div style={{
        ...cardStyle,
        position: 'absolute', bottom: 8, right: 8,
        width: 185, maxHeight: 160, overflow: 'auto', padding: '8px 10px',
        fontSize: 11,
      }}>
        <div style={{ color: DIM, letterSpacing: 1, marginBottom: 6 }}>
          {activeChallenge ? 'ACTIVE CHALLENGE' : 'CHALLENGES'}
        </div>
        {activeChallenge ? (
          <div>
            <div style={{ color: '#cccc44', marginBottom: 4, fontWeight: 600, textShadow: '0 0 8px rgba(204, 204, 68, 0.2)' }}>
              {activeChallenge.title}
            </div>
            <div style={{ fontSize: 10, color: DIM, marginBottom: 6, lineHeight: 1.4 }}>
              {activeChallenge.description}
            </div>
            {activeChallenge.objectives.map((obj, i) => (
              <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    color: obj.current >= obj.target ? GREEN : DIM,
                    fontWeight: obj.current >= obj.target ? 700 : 400,
                  }}>
                    {obj.current >= obj.target ? '\u2713' : '\u25cb'}
                  </span>
                  <span>{obj.description}</span>
                </div>
                <div style={{ ...barTrack, height: 2, marginTop: 2, marginLeft: 16 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: obj.current >= obj.target ? GREEN : '#cccc44',
                    width: `${Math.min(100, (obj.current / obj.target) * 100)}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 9, color: DIM, marginTop: 6, fontStyle: 'italic', lineHeight: 1.4 }}>
              "{activeChallenge.fullerPrinciple}"
            </div>
          </div>
        ) : availableChallenges.length > 0 ? (
          availableChallenges.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleStartChallenge(c.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', color: DIM,
                fontFamily: FONT, fontSize: 11, padding: '5px 0',
                cursor: 'pointer', borderBottom: `1px solid ${BORDER}`,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = GREEN)}
              onMouseLeave={e => (e.currentTarget.style.color = DIM)}
            >
              <span style={{ color: TIER_COLORS[c.tier] ?? DIM, fontWeight: 600 }}>{c.tier}</span>{' '}
              {c.title}{' '}
              <span style={{ color: '#FF00CC' }}>+{c.rewardLove}L</span>
            </button>
          ))
        ) : (
          <div style={{ fontSize: 10, color: DIM }}>
            No challenges available yet.
          </div>
        )}
      </div>

      {/* Piece count indicator */}
      <div style={{
        ...cardStyle,
        position: 'absolute', top: 8, right: 8,
        padding: '4px 10px', fontSize: 9, color: DIM,
      }}>
        {dome.pieces.length} pieces
      </div>
    </div>
  );
}
