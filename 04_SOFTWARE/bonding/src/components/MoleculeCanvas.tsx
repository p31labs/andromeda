// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// MoleculeCanvas: the main 3D scene
//
// Contains:
//   - R3F Canvas with PerspectiveCamera
//   - CoherenceArc (background color shift over 37min)
//   - MolecularWarp (molecular particle field + warp)
//   - All VoxelAtoms
//   - All BondBeams
//   - GhostSites (during drag)
//   - DragPreview (during drag)
//   - WCD-15: Bloom removed (AdditiveBlending on cores instead)
//   - OrbitControls (auto-rotate when idle)
// ═══════════════════════════════════════════════════════

import { Suspense, useCallback, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
// WCD-15: EffectComposer + Bloom removed — too heavy for tablet TBDR GPUs.
// Glow now faked via AdditiveBlending on atom cores (see VoxelAtom.tsx).
import { VoxelAtom } from './VoxelAtom';
import { BondBeam } from './BondBeam';
import { GhostSite } from './GhostSite';
import { DragPreview } from './DragPreview';
import { MolecularWarp } from './MolecularWarp';
import { ELEMENTS } from '../data/elements';
import { useGameStore } from '../store/gameStore';
import { getAvailableBondSitePositions, generateFormula } from '../engine/chemistry';
import { getPersonality } from '../engine/personalities';
import type { PersonalityAnimationHint } from './VoxelAtom';

const COHERENCE_MS = 37 * 60 * 1000;
const BG_START = new THREE.Color('#050505');
const BG_END = new THREE.Color('#0a0508');

/**
 * CoherenceArc: shifts background from true black (#050505)
 * to a barely-warm tint (#0a0508) over the 37-minute coherence window.
 * Subtle ambient indicator of session depth — no blue cast.
 */
function CoherenceArc() {
  const sessionStartTime = useGameStore((s) => s.sessionStartTime);
  const { scene } = useThree();

  useFrame(() => {
    if (!scene.background) return;
    const bg = scene.background as THREE.Color;
    if (!sessionStartTime) {
      bg.copy(BG_START);
      return;
    }
    const phase = Math.min(
      (Date.now() - sessionStartTime) / COHERENCE_MS,
      1.0,
    );
    bg.copy(BG_START).lerp(BG_END, phase);
  });

  return null;
}


/**
 * Scene: all 3D content. Separated from Canvas for Suspense boundary.
 */
function Scene() {
  const atoms = useGameStore((s) => s.atoms);
  const bonds = useGameStore((s) => s.bonds);
  const dragging = useGameStore((s) => s.dragging);
  const snappedSite = useGameStore((s) => s.snappedSite);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const previewElement = useGameStore((s) => s.previewElement);

  // Compute ghost sites (available bond positions) during drag or palette preview
  const ghostSites = useMemo(() => {
    if (gamePhase === 'complete') return [];

    // Drag-based or preview-based sites
    if (dragging || (previewElement && atoms.length > 0)) {
      if (atoms.length === 0) {
        return [
          {
            atomId: null as number | null,
            position: { x: 0, y: 0, z: 0 },
          },
        ];
      }

      const sites: {
        atomId: number | null;
        position: { x: number; y: number; z: number };
      }[] = [];
      for (const atom of atoms) {
        const unfilled = getAvailableBondSitePositions(atom, atoms);
        for (const pos of unfilled) {
          sites.push({
            atomId: atom.id,
            position: { x: pos.x, y: pos.y, z: pos.z },
          });
        }
      }
      return sites;
    }

    return [];
  }, [atoms, dragging, gamePhase, previewElement]);

  const selectedColor = dragging
    ? ELEMENTS[dragging].color
    : previewElement
      ? ELEMENTS[previewElement].color
      : '#ffffff';

  return (
    <>
      <color attach="background" args={['#050505']} />
      <CoherenceArc />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#fffaf0" />

      {/* WCD-15: Environment map — cheap cubemap for standard material reflections.
          background={false} keeps our void/CoherenceArc background visible. */}
      <Environment preset="city" background={false} />

      {/* Molecular field — element-colored particles */}
      <MolecularWarp />

      {/* Placed atoms — personality hints applied on completion */}
      {atoms.map((atom) => {
        const isNewest = atom.id === atoms[atoms.length - 1]?.id;
        const excitement =
          gamePhase === 'complete'
            ? 0.8
            : isNewest && atoms.length > 1
              ? 0.4
              : 0.0;

        // Compute personality animation hint on completion
        let pHint: PersonalityAnimationHint | null = null;
        if (gamePhase === 'complete' && atoms.length > 0) {
          const counts: Record<string, number> = {};
          for (const a of atoms) {
            counts[a.element] = (counts[a.element] ?? 0) + 1;
          }
          const formula = generateFormula(atoms);
          const p = getPersonality(formula, counts);
          pHint = {
            speed: p.animationHint.speed,
            pulse: p.animationHint.pulse,
            vibrate: p.animationHint.vibrate,
            scale: p.animationHint.scale,
          };
        }

        return (
          <VoxelAtom
            key={atom.id}
            element={ELEMENTS[atom.element]}
            position={[atom.position.x, atom.position.y, atom.position.z]}
            excitement={excitement}
            personalityHint={pHint}
          />
        );
      })}

      {/* Bond beams */}
      {bonds.map((bond) => {
        const from = atoms.find((a) => a.id === bond.from);
        const to = atoms.find((a) => a.id === bond.to);
        if (!from || !to) return null;
        return (
          <BondBeam
            key={bond.id}
            start={from.position}
            end={to.position}
            fromElement={from.element}
            toElement={to.element}
          />
        );
      })}

      {/* Ghost bond sites (visible during drag) */}
      {ghostSites.map((site, i) => {
        const isSnapped =
          snappedSite != null &&
          Math.abs(snappedSite.position.x - site.position.x) < 0.01 &&
          Math.abs(snappedSite.position.y - site.position.y) < 0.01 &&
          Math.abs(snappedSite.position.z - site.position.z) < 0.01;
        return (
          <GhostSite
            key={`ghost-${site.atomId ?? 'center'}-${i}`}
            position={[site.position.x, site.position.y, site.position.z]}
            color={selectedColor}
            isSnapped={isSnapped}
          />
        );
      })}

      {/* Drag preview (follows pointer) */}
      <DragPreview />

      {/* WCD-15: Bloom removed. Glow faked via AdditiveBlending on cores. */}

      {/* Camera controls — WCD-19: zoom clamped to prevent giant/tiny atoms */}
      <OrbitControls
        enablePan={false}
        enabled={!dragging}
        autoRotate={!dragging && atoms.length > 0}
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={15}
        makeDefault
      />
    </>
  );
}

/**
 * MoleculeCanvas: the R3F Canvas wrapper.
 * Full viewport, flat tone mapping.
 */
export function MoleculeCanvas() {
  const triggerWarp = useGameStore((s) => s.triggerWarp);
  const lastMissRef = useRef(0);

  const handlePointerMissed = useCallback(() => {
    const now = Date.now();
    if (now - lastMissRef.current < 400) {
      triggerWarp();
      lastMissRef.current = 0;
    } else {
      lastMissRef.current = now;
    }
  }, [triggerWarp]);

  return (
    <div style={{ width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <Canvas
        flat
        onPointerMissed={handlePointerMissed}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[BONDING] WebGL context lost — will restore');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('[BONDING] WebGL context restored');
          });
        }}
      >
        {/* WCD-08: Y offset 0.3 centers molecule in the visual gap between TopBar and ElementDock */}
        <PerspectiveCamera makeDefault position={[0, 0.3, 5]} fov={50} />
        <Suspense fallback={
          <Html center>
            <div style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              letterSpacing: '0.1em',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              BONDING
            </div>
          </Html>
        }>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
