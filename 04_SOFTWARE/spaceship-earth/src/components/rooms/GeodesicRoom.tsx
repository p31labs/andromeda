// spaceship-earth/src/components/rooms/GeodesicRoom.tsx
// B3: Geodesic building room — renders game-engine structures as R3F meshes.
// Player progression, rigidity visualization, challenge panel, placement FX.
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useNode } from '../../contexts/NodeContext';
import { theme } from '../../lib/theme';
import type { PlacedPiece, PrimitiveType, Structure } from '@p31/game-engine';

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

  useEffect(() => {
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
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1 + piece.rotation.y;
    }
  });

  useEffect(() => {
    const onTheme = () => {
      if (matRef.current) {
        matRef.current.color.copy(theme.getColor('--cyan'));
        matRef.current.emissive.copy(theme.getColor('--cyan'));
      }
    };
    window.addEventListener('p31-theme-change', onTheme);
    return () => window.removeEventListener('p31-theme-change', onTheme);
  }, []);

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
        ref={matRef}
        color={theme.getColor('--cyan')}
        transparent
        opacity={0.85}
        wireframe={piece.type !== 'hub'}
        emissive={theme.getColor('--cyan')}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// ── Connection lines between pieces ──

function ConnectionLines({ pieces }: { pieces: readonly PlacedPiece[] }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
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

  useEffect(() => {
    const onTheme = () => {
      if (matRef.current) matRef.current.color.copy(theme.getColor('--cyan'));
    };
    window.addEventListener('p31-theme-change', onTheme);
    return () => window.removeEventListener('p31-theme-change', onTheme);
  }, []);

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
          <lineBasicMaterial ref={matRef} color={theme.getColor('--cyan')} opacity={0.4} transparent />
        </line>
      ))}
    </>
  );
}

// ── P31 Grid ──

function GlowGrid() {
  const [colors, setColors] = useState({ grid: '#0a2a1a', sub: '#050f05' });

  useEffect(() => {
    const onTheme = () => {
      // Approximate darker versions of cyan/mint for the grid
      setColors({ grid: '#0a2a1a', sub: '#050f05' });
    };
    window.addEventListener('p31-theme-change', onTheme);
    onTheme();
    return () => window.removeEventListener('p31-theme-change', onTheme);
  }, []);

  return (
    <group>
      <gridHelper args={[12, 24, colors.grid, colors.sub]} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// ── 3D Scene ──

function GeodesicScene({ structure }: { structure: Structure }) {
  const cyan = theme.getColor('--cyan');
  return (
    <>
      <ambientLight intensity={0.3} color="#0a1a0a" />
      <pointLight position={[5, 8, 5]} intensity={0.8} color={cyan} />
      <pointLight position={[-5, -3, 5]} intensity={0.4} color={cyan} />
      <pointLight position={[0, 6, -4]} intensity={0.2} color="#0a4428" />
      <hemisphereLight args={['#001a00', '#000000', 0.3]} />
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

const getTierColor = (tier: string) => {
  const map: Record<string, string> = {
    seedling: 'var(--dim)',
    sprout: 'var(--mint)',
    sapling: 'var(--amber)',
    oak: 'var(--orange)',
    sequoia: 'var(--coral)',
  };
  return map[tier] || 'var(--cyan)';
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

  if (!player || !dome) return null;

  const rigidPercent = Math.min(100, Math.max(0, dome.rigidity.coherence * 100));
  const tColor = getTierColor(player.tier);

  const mainObjective = activeChallenge?.objectives[0];

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'var(--void)', overflow: 'hidden',
      color: 'var(--cyan)', fontFamily: 'var(--font-data)'
    }}>
      {/* 3D Viewport */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
          <GeodesicScene structure={dome} />
        </Canvas>
      </div>

      {/* Header Overlay */}
      <div className="glass-card" style={{
        position: 'absolute', top: 16, left: 16, right: 16,
        padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--neon-ghost)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neon-ghost)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', border: `2px solid ${tColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: tColor,
            boxShadow: `0 0 10px ${tColor}44`,
          }}>
            {PRIMITIVE_ICONS.icosahedron}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--cyan)' }}>GEODESIC NEXUS</div>
            <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase' }}>Structure ID: {dome.id.slice(0, 8)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: 8, color: 'var(--dim)' }}>RIGIDITY</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: rigidPercent > 80 ? 'var(--mint)' : rigidPercent > 40 ? 'var(--amber)' : 'var(--coral)' }}>
              {rigidPercent.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: 'var(--dim)' }}>PIECES</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>{dome.pieces.length}</div>
          </div>
        </div>
      </div>

      {/* Building Tools — Bottom Left */}
      <div className="glass-card" style={{
        position: 'absolute', bottom: 16, left: 16, width: 240,
        padding: 12, background: 'var(--neon-ghost)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--neon-ghost)',
      }}>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 8, letterSpacing: 1 }}>PRIMITIVE INJECTION</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {(['tetrahedron', 'octahedron', 'icosahedron', 'strut', 'hub'] as PrimitiveType[]).map(type => (
            <button
              key={type}
              onClick={() => handlePlace(type)}
              className="glass-btn"
              style={{
                display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0',
                fontSize: 9, color: lastPlaced === type ? 'var(--mint)' : 'var(--cyan)',
                borderColor: lastPlaced === type ? 'var(--mint)' : 'var(--neon-ghost)',
                background: lastPlaced === type ? 'var(--neon-faint)' : 'transparent',
                minHeight: 'auto'
              }}
            >
              <span style={{ fontSize: 14 }}>{PRIMITIVE_ICONS[type]}</span>
              <span>{PRIMITIVE_LABELS[type]}</span>
            </button>
          ))}
          <button
            onClick={handleUndo}
            className="glass-btn"
            style={{ fontSize: 9, color: 'var(--dim)', borderColor: 'var(--neon-ghost)', minHeight: 'auto' }}
          >
            UNDO
          </button>
        </div>
      </div>

      {/* Challenge Panel — Bottom Right */}
      <div className="glass-card" style={{
        position: 'absolute', bottom: 16, right: 16, width: 280,
        padding: 12, background: 'var(--neon-ghost)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--neon-ghost)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: 1 }}>ACTIVE CHALLENGE</div>
          {activeChallenge && (
            <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700 }}>{activeChallenge.tier.toUpperCase()}</div>
          )}
        </div>

        {activeChallenge ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>{activeChallenge.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.8, lineHeight: 1.4, marginBottom: 10 }}>{activeChallenge.description}</div>
            {mainObjective && (
              <>
                <div style={{ height: 4, background: 'var(--neon-faint)', borderRadius: 2, marginBottom: 4 }}>
                  <div style={{
                    height: '100%', background: 'var(--cyan)', borderRadius: 2,
                    width: `${Math.min(100, (dome.pieces.length / mainObjective.target) * 100)}%`,
                    boxShadow: 'var(--glow-cyan)', transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ fontSize: 8, color: 'var(--dim)', textAlign: 'right' }}>
                  TARGET: {mainObjective.target} PIECES
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ padding: '8px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>No active challenge</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {availableChallenges.slice(0, 2).map(c => (
                <button
                  key={c.id}
                  onClick={() => game?.startChallenge(c.id)}
                  className="glass-btn"
                  style={{ fontSize: 9, padding: '4px 8px', color: 'var(--amber)', borderColor: 'var(--amber)44', minHeight: 'auto' }}
                >
                  START {c.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
