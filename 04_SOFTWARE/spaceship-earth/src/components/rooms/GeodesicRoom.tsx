// spaceship-earth/src/components/rooms/GeodesicRoom.tsx
// B3: Geodesic building room — renders game-engine structures as R3F meshes.
// Player progression, rigidity visualization, challenge panel.
import React, { useCallback, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useNode } from '../../contexts/NodeContext';
import type { PlacedPiece, PrimitiveType, Structure } from '@p31/game-engine';

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
        color={piece.color}
        transparent
        opacity={0.85}
        wireframe={piece.type !== 'hub'}
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
          <lineBasicMaterial color="#4ecdc4" opacity={0.4} transparent />
        </line>
      ))}
    </>
  );
}

// ── 3D Scene ──

function GeodesicScene({ structure }: { structure: Structure }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 8, 5]} intensity={0.7} />
      <pointLight position={[-5, -3, 5]} intensity={0.3} color="#4ecdc4" />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <gridHelper args={[10, 20, '#1e293b', '#0f172a']} />
      {structure.pieces.map(piece => (
        <PieceMesh key={piece.id} piece={piece} />
      ))}
      <ConnectionLines pieces={structure.pieces} />
    </>
  );
}

// ── Style constants ──

const PANEL: React.CSSProperties = {
  background: 'rgba(6, 10, 16, 0.8)',
  border: '1px solid rgba(40, 60, 80, 0.25)',
  borderRadius: 6,
  padding: '10px 14px',
  fontSize: 11,
  color: '#c8d0dc',
  fontFamily: "'JetBrains Mono', monospace",
};

const TIER_COLORS: Record<string, string> = {
  seedling: '#94a3b8',
  sprout: '#4ade80',
  sapling: '#f7dc6f',
  oak: '#f59e0b',
  sequoia: '#ef4444',
};

const PRIMITIVE_LABELS: Record<PrimitiveType, string> = {
  tetrahedron: 'Tetra',
  octahedron: 'Octa',
  icosahedron: 'Icosa',
  strut: 'Strut',
  hub: 'Hub',
};

// ── Main Component ──

export function GeodesicRoom() {
  const { game, player, structures, activeChallenge, availableChallenges } = useNode();
  const placeCountRef = useRef(0);

  const dome = structures[0] ?? null;

  const handlePlace = useCallback((type: PrimitiveType) => {
    if (!game || !dome) return;
    // Place in a spiral pattern for visual spread
    const n = placeCountRef.current++;
    const angle = n * 2.39996; // golden angle
    const r = 0.5 + n * 0.3;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (n % 3) * 0.8;
    game.place(dome.id, type, { x, y, z });
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#64748b', fontFamily: 'monospace',
      }}>
        Geodesic — loading...
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
        gl={{ alpha: true }}
      >
        <GeodesicScene structure={dome} />
      </Canvas>

      {/* Top-left: Progression panel — compact for mobile */}
      <div style={{ position: 'absolute', top: 8, left: 8, ...PANEL, width: 150, padding: '8px 10px', fontSize: 10 }}>
        <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>
          BUILDER
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span>Lv {player.level}</span>
          <span style={{ color: TIER_COLORS[player.tier] ?? '#94a3b8', fontSize: 9 }}>
            {player.tier.toUpperCase()}
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: '#1e293b', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: TIER_COLORS[player.tier] ?? '#4ade80',
            width: `${Math.min(100, (player.xp % 100))}%`,
          }} />
        </div>
        <div style={{ fontSize: 8, color: '#64748b', marginTop: 3 }}>
          {player.xp}XP {player.totalPiecesPlaced}pc {player.buildStreak}d
        </div>
      </div>

      {/* Top-right: Rigidity panel — offset below HUD */}
      <div style={{ position: 'absolute', top: 50, right: 8, ...PANEL, width: 150, padding: '8px 10px', fontSize: 10 }}>
        <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>
          RIGIDITY
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ color: rig.isRigid ? '#4ecdc4' : '#f7dc6f', fontSize: 10 }}>
            {rig.isRigid ? 'RIGID' : 'FLOPPY'}
          </span>
          <span style={{ fontSize: 10 }}>{(rig.coherence * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: '#1e293b', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: rig.isRigid ? '#4ecdc4' : '#f7dc6f',
            width: `${Math.min(100, rig.coherence * 100)}%`,
          }} />
        </div>
        <div style={{ fontSize: 8, color: '#64748b', marginTop: 3 }}>
          E={rig.edges} V={rig.vertices} {rig.degreesOfFreedom}DOF
        </div>
      </div>

      {/* Bottom-left: Piece toolbar — smaller buttons, wrapping */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: '55%',
      }}>
        {(['tetrahedron', 'octahedron', 'icosahedron', 'strut', 'hub'] as PrimitiveType[]).map(type => (
          <button
            key={type}
            onClick={() => handlePlace(type)}
            style={{
              ...PANEL,
              cursor: 'pointer',
              padding: '5px 8px',
              fontSize: 9,
              border: '1px solid rgba(78, 205, 196, 0.3)',
            }}
          >
            {PRIMITIVE_LABELS[type]}
          </button>
        ))}
        <button
          onClick={handleUndo}
          style={{
            ...PANEL,
            cursor: 'pointer',
            padding: '5px 8px',
            fontSize: 9,
            border: '1px solid rgba(255, 107, 107, 0.3)',
            color: '#ff6b6b',
          }}
        >
          Undo
        </button>
      </div>

      {/* Bottom-right: Challenge panel — compact */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8, ...PANEL,
        width: 180, maxHeight: 140, overflow: 'auto', padding: '8px 10px',
      }}>
        <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, marginBottom: 6 }}>
          {activeChallenge ? 'ACTIVE CHALLENGE' : 'CHALLENGES'}
        </div>
        {activeChallenge ? (
          <div>
            <div style={{ color: '#f7dc6f', marginBottom: 4 }}>{activeChallenge.title}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
              {activeChallenge.description}
            </div>
            {activeChallenge.objectives.map((obj, i) => (
              <div key={i} style={{ fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: obj.current >= obj.target ? '#4ecdc4' : '#94a3b8' }}>
                  {obj.current >= obj.target ? '\u2713' : '\u25cb'}
                </span>{' '}
                {obj.description} ({obj.current}/{obj.target})
              </div>
            ))}
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
              "{activeChallenge.fullerPrinciple}"
            </div>
          </div>
        ) : availableChallenges.length > 0 ? (
          availableChallenges.map(c => (
            <button
              key={c.id}
              onClick={() => handleStartChallenge(c.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', color: '#e2e8f0',
                fontFamily: 'monospace', fontSize: 11, padding: '4px 0',
                cursor: 'pointer', borderBottom: '1px solid rgba(100,116,139,0.15)',
              }}
            >
              <span style={{ color: TIER_COLORS[c.tier] ?? '#94a3b8' }}>{c.tier}</span>{' '}
              {c.title}{' '}
              <span style={{ color: '#c9b1ff' }}>+{c.rewardLove}L</span>
            </button>
          ))
        ) : (
          <div style={{ fontSize: 10, color: '#64748b' }}>
            No challenges available yet.
          </div>
        )}
      </div>
    </div>
  );
}
