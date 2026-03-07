import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';
import { disposeThreeNode, quantumVertexShader, quantumFragmentShader, audioEngine } from '@p31/shared/sovereign';
import { buildObservatoryScene, type ObservatoryHandle } from './observatoryBuilder';
import type { SovereignRoom } from '../../../sovereign/types';

// ── Per-screen color themes ──
interface ScreenTheme {
  bg: string;
  pri: string;
  acc: string;
  dim: string;
  grid: string;
  border: string;
  divider: string;
}

const THEMES: Record<'BRIDGE' | 'BUFFER' | 'SYSTEM', ScreenTheme> = {
  BRIDGE: {
    bg: 'rgba(0, 0, 0, 0.92)',
    pri: '#FF00FF',
    acc: '#FFD700',
    dim: 'rgba(255,0,255,0.35)',
    grid: 'rgba(255,0,255,0.03)',
    border: 'rgba(255,0,255,0.2)',
    divider: 'rgba(255,0,255,0.15)',
  },
  BUFFER: {
    bg: 'rgba(0, 0, 0, 0.92)',
    pri: '#FFD700',
    acc: '#FF4444',
    dim: 'rgba(255,215,0,0.35)',
    grid: 'rgba(255,215,0,0.03)',
    border: 'rgba(255,215,0,0.2)',
    divider: 'rgba(255,215,0,0.15)',
  },
  SYSTEM: {
    bg: 'rgba(0, 0, 0, 0.92)',
    pri: '#00FFFF',
    acc: '#BF5FFF',
    dim: 'rgba(0,255,255,0.35)',
    grid: 'rgba(0,255,255,0.03)',
    border: 'rgba(0,255,255,0.2)',
    divider: 'rgba(0,255,255,0.15)',
  },
};

// ── Room panel definitions for cockpit screens ──
interface RoomPanel { id: SovereignRoom; label: string; desc: string; color: string; icon: string }
const ROOM_PANELS: RoomPanel[] = [
  { id: 'OBSERVATORY', label: 'Observatory', desc: 'Geodesic dome', color: '#00FFFF', icon: '\u2B21' },
  { id: 'COLLIDER', label: 'Collider', desc: 'Particle physics', color: '#FF00FF', icon: '\u269B' },
  { id: 'BONDING', label: 'Bonding', desc: 'Chemistry game', color: '#FFD700', icon: '\u2B22' },
  { id: 'BRIDGE', label: 'Bridge', desc: 'LOVE economy', color: '#BF5FFF', icon: '\u2B23' },
  { id: 'BUFFER', label: 'Buffer', desc: 'Voltage scoring', color: '#00FFFF', icon: '\u26A1' },
  { id: 'COPILOT', label: 'Brain', desc: 'Quantum Brain', color: '#00FFFF', icon: '\u2B21' },
  { id: 'LANDING', label: 'Quantum IDE', desc: 'QG + Copilot', color: '#00FFFF', icon: '\u269B' },
  { id: 'RESONANCE', label: 'Resonance', desc: 'Sound engine', color: '#BF5FFF', icon: '\u266B' },
  { id: 'FORGE', label: 'Forge', desc: 'Content pipeline', color: '#FFD700', icon: '\u2B06' },
];
const SCREEN_ROOMS: RoomPanel[][] = [
  [ROOM_PANELS[0], ROOM_PANELS[1], ROOM_PANELS[2]], // Screen 0 (pink): Observatory, Collider, Bonding
  [ROOM_PANELS[3], ROOM_PANELS[4], ROOM_PANELS[5]], // Screen 1 (cyan): Bridge, Buffer, Copilot
  [ROOM_PANELS[6], ROOM_PANELS[7], ROOM_PANELS[8]], // Screen 2 (amber): Landing, Resonance, Forge
];

// Three.js color objects for key light blending
const LIGHT_PINK = new THREE.Color('#FF00FF');
const LIGHT_AMBER = new THREE.Color('#FFD700');
const LIGHT_CYAN = new THREE.Color('#00FFFF');

// ── Shared orbit state type ──
export interface OrbitState {
  rx: number; ry: number; dist: number;
  trx: number; try_: number; tDist: number;
  vx: number; vy: number; vDist: number; // angular/zoom velocity for momentum
  down: boolean; x: number; y: number; moved: boolean;
  flyFrom: { rx: number; ry: number; dist: number } | null;
  flyTo: { rx: number; ry: number; dist: number } | null;
  flyT: number;
}

const OBSERVATORY_ORBIT_DIST = 7.5;

export const ImmersiveCockpitUI = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 0, 0);

    // Soft ambient — dark phosphor tint
    scene.add(new THREE.AmbientLight(0x0A1A0A, 0.9));
    // Key light — neutral white, dynamic blending shifts to screen colors
    const keyLight = new THREE.PointLight(0xFFFFFF, 2.5, 50);
    keyLight.position.set(0, 3, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x00FFFF, 1.2, 30);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Neon phosphor starfield — green/cyan/magenta/amber/violet
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = [
      [0.0, 1.0, 1.0],      // #00FFFF cyan
      [0.0, 1.0, 1.0],      // #00FFFF cyan
      [1.0, 0.0, 1.0],      // #FF00FF magenta
      [1.0, 0.843, 0.0],    // #FFD700 amber
      [0.749, 0.373, 1.0],  // #BF5FFF violet
    ];
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 120;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 120;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      const c = starPalette[i % starPalette.length];
      starColors[i * 3] = c[0];
      starColors[i * 3 + 1] = c[1];
      starColors[i * 3 + 2] = c[2];
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 0.07, transparent: true, opacity: 0.5, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(stars);

    // ── M18: Somatic Waveform line (120 points, green glow) ──
    const WAVEFORM_POINTS = 120;
    const waveformPositions = new Float32Array(WAVEFORM_POINTS * 3);
    const waveformGeo = new THREE.BufferGeometry();
    waveformGeo.setAttribute('position', new THREE.BufferAttribute(waveformPositions, 3));
    const waveformLine = new THREE.Line(
      waveformGeo,
      new THREE.LineBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        linewidth: 2,
      }),
    );
    waveformLine.position.set(-3, -2.5, 4.5); // bottom-left of view
    waveformLine.visible = false;
    scene.add(waveformLine);

    // ── M20: Spatial Radar node orbs (up to 16) ──
    const MAX_SPATIAL_NODES = 16;
    const VALENCY_COLORS = [
      new THREE.Color('#FFFFFF'), // 0: Hydrogen — white
      new THREE.Color('#FF4444'), // 1: Oxygen — red
      new THREE.Color('#00FFFF'), // 2: Carbon — cyan
      new THREE.Color('#FFD700'), // 3: Nitrogen — amber
      new THREE.Color('#BF5FFF'), // 4: default — violet
    ];
    const spatialOrbGeo = new THREE.SphereGeometry(0.15, 16, 12);
    const spatialOrbs: THREE.Mesh[] = [];
    const spatialOrbMaterials: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < MAX_SPATIAL_NODES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(spatialOrbGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      spatialOrbs.push(mesh);
      spatialOrbMaterials.push(mat);
    }

    // ── M21: Bond line (camera → bonded orb) ──
    const bondLinePositions = new Float32Array(6); // 2 points × 3 components
    const bondLineGeo = new THREE.BufferGeometry();
    bondLineGeo.setAttribute('position', new THREE.BufferAttribute(bondLinePositions, 3));
    const bondLine = new THREE.Line(
      bondLineGeo,
      new THREE.LineBasicMaterial({
        color: 0x00FFFF,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        linewidth: 2,
      }),
    );
    bondLine.visible = false;
    scene.add(bondLine);

    // ── WCD-06: Calcium Cage — 3 symmetric screens around phosphorus dome ──
    const SCREEN_ARC = Math.PI * 0.56;   // 100° per screen
    const SCREEN_GAP = Math.PI * 0.11;   // 20° gap
    const SCREEN_RADIUS = 8;
    const SCREEN_HEIGHT = 5;

    const screenStarts = [
      Math.PI * 0.055, // Screen A (front-right)
      Math.PI * 0.055 + (SCREEN_ARC + SCREEN_GAP), // Screen B (back)
      Math.PI * 0.055 + 2 * (SCREEN_ARC + SCREEN_GAP), // Screen C (front-left)
    ];

    // ── Cockpit-level orbit state (shared with Observatory) ──
    const orbit: OrbitState = {
      rx: 0, ry: 0.15, dist: OBSERVATORY_ORBIT_DIST,
      trx: 0, try_: 0.15, tDist: OBSERVATORY_ORBIT_DIST,
      vx: 0, vy: 0, vDist: 0,
      down: false, x: 0, y: 0, moved: false,
      flyFrom: null, flyTo: null, flyT: 0,
    };

    const coreUniforms = {
      uTime: { value: 0 }, uCoherence: { value: 1.0 },
      uNoise: { value: 0.0 }, uOpacity: { value: 1.0 }
    };
    const p31Material = new THREE.ShaderMaterial({
      vertexShader: quantumVertexShader, fragmentShader: quantumFragmentShader,
      uniforms: coreUniforms, transparent: true, blending: THREE.AdditiveBlending
    });

    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // ── STATIC SCENE: Always build Observatory dome + content screen together ──
    let observatoryHandle: ObservatoryHandle | null = null;

    // 1. Observatory dome
    observatoryHandle = buildObservatoryScene(roomGroup, scene, camera, renderer, orbit);
    observatoryHandle.mountLabels(mount);

    // 2. Three identical cage screens (Bridge / Buffer / System)
    const screenCanvases = screenStarts.map(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1536;
      return canvas;
    });
    const screenContexts = screenCanvases.map((c) => c.getContext('2d')!);
    const screenTextures = screenCanvases.map((c) => {
      const t = new THREE.CanvasTexture(c);
      t.minFilter = THREE.LinearFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });

    const screenGeometries = screenStarts.map((thetaStart) =>
      new THREE.CylinderGeometry(
        SCREEN_RADIUS,
        SCREEN_RADIUS,
        SCREEN_HEIGHT,
        64,
        1,
        true,
        thetaStart,
        SCREEN_ARC,
      )
    );

    const screenMaterials = screenTextures.map((map) => new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }));

    const screenMeshes = screenGeometries.map((geo, i) => {
      const mesh = new THREE.Mesh(geo, screenMaterials[i]);
      mesh.position.set(0, 0, 0);
      roomGroup.add(mesh);
      return mesh;
    });

    // No edge wireframes — screens are glassy

    // ── Mouse handlers — orbit always active ──
    let orbitDragMoved = false;
    let lastMoveTs = 0;
    let lastWheelTs = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (orbit.down) {
        const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) orbit.moved = true;
        const drx = -dx * 0.007, dry = dy * 0.0055;
        const dtMove = Math.max(1 / 240, (e.timeStamp - lastMoveTs) / 1000);
        lastMoveTs = e.timeStamp;
        orbit.rx += drx;
        orbit.ry += dry;
        orbit.ry = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, orbit.ry));
        // Velocity stored as rad/s for frame-rate-independent inertia.
        orbit.vx = (drx / dtMove) * 0.85;
        orbit.vy = (dry / dtMove) * 0.85;
        orbit.x = e.clientX; orbit.y = e.clientY;
        orbitDragMoved = true;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleMouseDown = (e: MouseEvent) => {
      orbit.down = true; orbit.x = e.clientX; orbit.y = e.clientY; orbit.moved = false;
      orbit.flyTo = null; orbit.flyFrom = null;
      orbitDragMoved = false;
      lastMoveTs = e.timeStamp;
    };
    const handleMouseUp = () => {
      orbit.down = false;
      // If this was effectively a click, don't fling the camera.
      if (!orbitDragMoved) {
        orbit.vx = 0; orbit.vy = 0;
      } else if (Math.hypot(orbit.vx, orbit.vy) < 0.15) {
        orbit.vx = 0; orbit.vy = 0;
      }
    };
    // ── Screen click detection via UV raycasting ──
    const screenRaycaster = new THREE.Raycaster();

    const handleScreenClick = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );

      // Try observatory dome first (closer object wins)
      if (observatoryHandle) {
        observatoryHandle.handleClick(mouse, camera);
      }

      // Try screen panels
      screenRaycaster.setFromCamera(mouse, camera);
      const hits = screenRaycaster.intersectObjects(screenMeshes);
      if (hits.length > 0) {
        const hit = hits[0];
        const screenIdx = screenMeshes.findIndex(m => m === hit.object);
        if (screenIdx >= 0 && hit.uv) {
          const canvasX = hit.uv.x * 2048;
          const canvasY = (1 - hit.uv.y) * 1536;
          const colIdx = getColumnFromCanvasX(canvasX);
          if (colIdx >= 0 && canvasY >= SLOT_TOP && canvasY <= SLOT_BOTTOM) {
            const room = SCREEN_ROOMS[screenIdx][colIdx];
            // COPILOT now hosts Brain — allow navigation
            useSovereignStore.getState().setOverlay(
              room.id === 'OBSERVATORY' ? null : room.id
            );
          }
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!orbitDragMoved) {
        orbit.vx = 0; orbit.vy = 0; orbit.vDist = 0;
        handleScreenClick(e.clientX, e.clientY);
      }
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaY * 0.005;
      const dtWheel = Math.max(1 / 60, (e.timeStamp - lastWheelTs) / 1000);
      lastWheelTs = e.timeStamp;
      orbit.dist += d;
      orbit.dist = Math.max(0.5, Math.min(200, orbit.dist));
      orbit.vDist = (d / dtWheel) * 0.9;
      orbit.flyTo = null; orbit.flyFrom = null;
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Touch support for Android tablets
    let touchStartX = 0, touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        // Only treat as tap if minimal movement
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
          orbit.vx = 0; orbit.vy = 0; orbit.vDist = 0;
          handleScreenClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
      }
    };
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Hover detection — raycast on mousemove to highlight screen columns
    const hoverRaycaster = new THREE.Raycaster();
    const handleHoverCheck = (e: MouseEvent) => {
      if (orbit.down) { hoveredScreen = -1; hoveredCol = -1; return; }
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      hoverRaycaster.setFromCamera(mouse, camera);
      const hits = hoverRaycaster.intersectObjects(screenMeshes);
      if (hits.length > 0 && hits[0].uv) {
        const screenIdx = screenMeshes.findIndex(m => m === hits[0].object);
        const canvasX = hits[0].uv.x * 2048;
        const canvasY = (1 - hits[0].uv.y) * 1536;
        const colIdx = getColumnFromCanvasX(canvasX);
        if (screenIdx >= 0 && colIdx >= 0 && canvasY >= SLOT_TOP && canvasY <= SLOT_BOTTOM) {
          hoveredScreen = screenIdx;
          hoveredCol = colIdx;
          renderer.domElement.style.cursor = 'pointer';
        } else {
          hoveredScreen = -1; hoveredCol = -1;
          renderer.domElement.style.cursor = '';
        }
      } else {
        hoveredScreen = -1; hoveredCol = -1;
        renderer.domElement.style.cursor = '';
      }
    };
    // Throttle hover check to every ~50ms
    let lastHoverTs = 0;
    const handleHoverThrottled = (e: MouseEvent) => {
      if (e.timeStamp - lastHoverTs > 50) {
        lastHoverTs = e.timeStamp;
        handleHoverCheck(e);
      }
    };
    window.addEventListener('mousemove', handleHoverThrottled);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (observatoryHandle) {
        observatoryHandle.resizeBloom(window.innerWidth, window.innerHeight);
        observatoryHandle.resizeLabels(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    const drawScreenBase = (c: CanvasRenderingContext2D, w: number, h: number, time: number, theme: ScreenTheme, title: string, subtitle: string, slotOffset = 0, dynamicSlots: Record<number, { name: string } | null> = {}) => {
      c.save();
      c.clearRect(0, 0, w, h);

      // No flip — text reads from the outside, live display style

      // Glass background — clear black glass
      const grad = c.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
      grad.addColorStop(0.15, 'rgba(0, 0, 0, 0.6)');
      grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.65)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      c.fillStyle = grad;
      c.fillRect(0, 0, w, h);

      // Glass highlight — subtle bright strip near top
      const sheen = c.createLinearGradient(0, 0, 0, h * 0.2);
      sheen.addColorStop(0, `rgba(255,255,255,0.04)`);
      sheen.addColorStop(0.5, `rgba(255,255,255,0.015)`);
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sheen;
      c.fillRect(0, 0, w, h * 0.2);

      // Subtle edge glow — very thin border
      c.globalAlpha = 0.08;
      c.strokeStyle = theme.pri;
      c.lineWidth = 1;
      c.strokeRect(10, 10, w - 20, h - 20);
      c.globalAlpha = 1;

      // Screen title header
      c.shadowBlur = 10;
      // Crisp neon title — tight glow + solid
      c.font = 'bold 56px monospace';
      c.globalAlpha = 0.5;
      c.shadowColor = theme.pri; c.shadowBlur = 12; c.fillStyle = theme.pri;
      c.fillText(title, 60, 95);
      c.globalAlpha = 1;
      c.shadowBlur = 4; c.fillStyle = theme.pri;
      c.fillText(title, 60, 95);
      c.shadowBlur = 4;
      c.fillRect(60, 112, 240, 3);
      c.shadowBlur = 0;
      // Subtitle
      c.globalAlpha = 0.7;
      c.shadowColor = theme.dim; c.shadowBlur = 4; c.fillStyle = theme.dim;
      c.font = '26px monospace';
      c.fillText(subtitle, 60, 142);
      c.globalAlpha = 1; c.shadowBlur = 0;
      c.fillText(subtitle, 60, 142);

      // Separator line under header
      c.strokeStyle = theme.divider;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(40, 150); c.lineTo(w - 40, 150); c.stroke();

      // ── 3-column slot geometry ──
      const pad = 40;
      const gap = 20;
      const colW = Math.floor((w - 2 * pad - 2 * gap) / 3);
      const cols = [pad, pad + colW + gap, pad + 2 * (colW + gap)];
      const slotTop = 160;

      // Vertical dividers between columns
      c.strokeStyle = theme.divider;
      c.lineWidth = 1;
      c.setLineDash([8, 8]);
      c.beginPath();
      c.moveTo(cols[1] - gap / 2, slotTop);
      c.lineTo(cols[1] - gap / 2, h - 60);
      c.moveTo(cols[2] - gap / 2, slotTop);
      c.lineTo(cols[2] - gap / 2, h - 60);
      c.stroke();
      c.setLineDash([]);

      // Helper functions — crisp neon text (tight glow + solid core)
      const text = (s: string, x: number, y: number, sz = 28, col = theme.pri) => {
        c.font = `bold ${sz}px monospace`;
        // Pass 1: tight glow halo
        c.globalAlpha = 0.4;
        c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col;
        c.fillText(s, x, y);
        // Pass 2: solid crisp text
        c.globalAlpha = 1;
        c.shadowBlur = 3;
        c.fillStyle = col;
        c.fillText(s, x, y);
        c.shadowBlur = 0;
      };
      const dim = (s: string, x: number, y: number, sz = 22, col = theme.dim) => {
        c.font = `${sz}px monospace`;
        c.globalAlpha = 0.7;
        c.shadowColor = col; c.shadowBlur = 4; c.fillStyle = col;
        c.fillText(s, x, y);
        c.globalAlpha = 1;
        c.shadowBlur = 0;
        c.fillText(s, x, y);
      };
      const bar = (x: number, y: number, bw: number, bh: number, ratio: number, col: string) => {
        c.shadowBlur = 0;
        c.strokeStyle = theme.dim; c.lineWidth = 1;
        c.strokeRect(x, y, bw, bh);
        c.fillStyle = col;
        c.fillRect(x + 1, y + 1, (bw - 2) * Math.min(1, Math.max(0, ratio)), bh - 2);
      };

      // Slot header: plasma glow title bar at top of a column, returns content y
      const slotHeader = (col: number, slotTitle: string, slotSub: string) => {
        const cx = cols[col];
        const sy = slotTop + 10;
        c.font = 'bold 24px monospace';
        // Tight glow + solid
        c.globalAlpha = 0.45;
        c.shadowColor = theme.pri; c.shadowBlur = 8; c.fillStyle = theme.pri;
        c.fillText(slotTitle, cx + 8, sy + 24);
        c.globalAlpha = 1;
        c.shadowBlur = 2; c.fillStyle = theme.pri;
        c.fillText(slotTitle, cx + 8, sy + 24);
        c.shadowBlur = 0;
        // Subtitle
        c.globalAlpha = 0.7;
        c.shadowColor = theme.dim; c.shadowBlur = 3; c.fillStyle = theme.dim;
        c.font = '16px monospace';
        c.fillText(slotSub, cx + 8, sy + 48);
        c.globalAlpha = 1; c.shadowBlur = 0;
        c.fillText(slotSub, cx + 8, sy + 48);
        // Underline
        c.globalAlpha = 0.4;
        c.shadowColor = theme.pri; c.shadowBlur = 4;
        c.strokeStyle = theme.pri; c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx + 8, sy + 56); c.lineTo(cx + colW - 8, sy + 56); c.stroke();
        c.globalAlpha = 1; c.shadowBlur = 0;
        return sy + 72;
      };

      // Slot renderer: checks dynamicSlots for occupied state, falls back to empty placeholder
      const emptySlot = (col: number, t: number) => {
        const globalSlotNum = slotOffset + col + 1;
        const slotData = dynamicSlots[globalSlotNum];
        const cx = cols[col];
        const sy = slotTop + 10;
        const sw = colW;
        const sh = h - 80 - sy;
        const inset = 12;

        if (slotData) {
          // ── Occupied slot: solid green border, ACTIVE label ──
          const activePulse = 0.6 + 0.2 * ((Math.sin(t * 2 + col) + 1) / 2);
          const activeColor = '#7DDFB6';

          // Solid border — green glow
          c.globalAlpha = activePulse;
          c.shadowColor = activeColor;
          c.shadowBlur = 12;
          c.strokeStyle = activeColor;
          c.lineWidth = 3;
          c.strokeRect(cx + inset, sy + inset, sw - 2 * inset, sh - 2 * inset);
          c.shadowBlur = 0;

          // Corner brackets — green
          c.globalAlpha = activePulse + 0.15;
          c.strokeStyle = activeColor;
          c.lineWidth = 4;
          const bL = 30;
          const x1 = cx + inset, y1 = sy + inset;
          const x2 = cx + sw - inset, y2 = sy + sh - inset;
          c.beginPath(); c.moveTo(x1, y1 + bL); c.lineTo(x1, y1); c.lineTo(x1 + bL, y1); c.stroke();
          c.beginPath(); c.moveTo(x2 - bL, y1); c.lineTo(x2, y1); c.lineTo(x2, y1 + bL); c.stroke();
          c.beginPath(); c.moveTo(x1, y2 - bL); c.lineTo(x1, y2); c.lineTo(x1 + bL, y2); c.stroke();
          c.beginPath(); c.moveTo(x2 - bL, y2); c.lineTo(x2, y2); c.lineTo(x2, y2 - bL); c.stroke();

          // Active indicator in center
          const centerX = cx + sw / 2;
          const centerY = sy + sh / 2 - 20;

          // Pulsing dot
          c.globalAlpha = activePulse;
          c.fillStyle = activeColor;
          c.shadowColor = activeColor;
          c.shadowBlur = 16;
          c.beginPath(); c.arc(centerX, centerY - 10, 8, 0, Math.PI * 2); c.fill();
          c.shadowBlur = 0;

          // Slot label + module name
          c.font = 'bold 22px monospace';
          c.textAlign = 'center';
          c.globalAlpha = 0.9;
          c.fillStyle = activeColor;
          c.fillText(`[ SLOT ${globalSlotNum}: ACTIVE ]`, centerX, centerY + 40);
          c.globalAlpha = 0.5;
          c.font = '16px monospace';
          const displayName = slotData.name.length > 24 ? slotData.name.slice(0, 24) + '..' : slotData.name;
          c.fillText(displayName, centerX, centerY + 68);
          c.textAlign = 'left';

          // Slot number in corner
          c.globalAlpha = 0.7;
          c.fillStyle = activeColor;
          c.font = 'bold 16px monospace';
          c.fillText(`[ SLOT ${globalSlotNum} ]`, cx + inset + 8, sy + inset + 22);

          c.globalAlpha = 1;
          return;
        }

        // ── Empty slot: dashed border, crosshair, "DROP MODULE HERE" ──

        // Dashed border — high visibility, breathing glow
        const emptyPulse = 0.35 + 0.25 * ((Math.sin(t * 2 + col) + 1) / 2);
        c.globalAlpha = emptyPulse;
        c.shadowColor = theme.pri;
        c.shadowBlur = 8;
        c.strokeStyle = theme.pri;
        c.lineWidth = 3;
        c.setLineDash([16, 10]);
        c.strokeRect(cx + inset, sy + inset, sw - 2 * inset, sh - 2 * inset);
        c.setLineDash([]);
        c.shadowBlur = 0;

        // Corner brackets for emphasis
        c.globalAlpha = emptyPulse + 0.15;
        c.strokeStyle = theme.acc;
        c.lineWidth = 4;
        const bL = 30;
        const x1 = cx + inset, y1 = sy + inset;
        const x2 = cx + sw - inset, y2 = sy + sh - inset;
        c.beginPath(); c.moveTo(x1, y1 + bL); c.lineTo(x1, y1); c.lineTo(x1 + bL, y1); c.stroke();
        c.beginPath(); c.moveTo(x2 - bL, y1); c.lineTo(x2, y1); c.lineTo(x2, y1 + bL); c.stroke();
        c.beginPath(); c.moveTo(x1, y2 - bL); c.lineTo(x1, y2); c.lineTo(x1 + bL, y2); c.stroke();
        c.beginPath(); c.moveTo(x2 - bL, y2); c.lineTo(x2, y2); c.lineTo(x2, y2 - bL); c.stroke();

        // Crosshair in center
        const centerX = cx + sw / 2;
        const centerY = sy + sh / 2 - 20;
        const crossSize = 30;
        c.globalAlpha = 0.4;
        c.strokeStyle = theme.pri;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(centerX - crossSize, centerY); c.lineTo(centerX + crossSize, centerY);
        c.moveTo(centerX, centerY - crossSize); c.lineTo(centerX, centerY + crossSize);
        c.stroke();
        // Circle around crosshair
        c.beginPath(); c.arc(centerX, centerY, crossSize * 1.4, 0, Math.PI * 2); c.stroke();

        // "DROP MODULE HERE" text
        c.globalAlpha = 0.35 + 0.2 * ((Math.sin(t * 1.5 + col * 2) + 1) / 2);
        c.fillStyle = theme.pri;
        c.font = 'bold 22px monospace';
        c.textAlign = 'center';
        c.fillText(`[ SLOT ${globalSlotNum} ]`, centerX, centerY + 55);
        c.fillText('DROP MODULE HERE', centerX, centerY + 85);
        c.textAlign = 'left';

        // Slot number in corner
        c.globalAlpha = 0.5;
        c.fillStyle = theme.acc;
        c.font = 'bold 16px monospace';
        c.fillText(`[ SLOT ${globalSlotNum} ]`, cx + inset + 8, sy + inset + 22);

        c.globalAlpha = 1;
      };

      // Bottom ticker line
      c.globalAlpha = 0.25;
      c.shadowBlur = 0;
      c.fillStyle = theme.dim;
      c.font = '20px monospace';
      const tickerTxt = `SYS_TICK:${time.toFixed(2)} // SOVEREIGN // COHERENCE:OK `.repeat(6);
      c.fillText(tickerTxt, 30 - ((time * 50) % 500), h - 30);
      c.globalAlpha = 1;

      return { text, dim, bar, pad, colW, cols, slotTop, slotHeader, emptySlot, w, h, c };
    };

    // ── Hover state for screen panels ──
    let hoveredScreen = -1;
    let hoveredCol = -1;

    // Column geometry constants (must match drawScreenBase)
    const COL_PAD = 40, COL_GAP = 20;
    const COL_W = Math.floor((2048 - 2 * COL_PAD - 2 * COL_GAP) / 3);
    const COL_STARTS = [COL_PAD, COL_PAD + COL_W + COL_GAP, COL_PAD + 2 * (COL_W + COL_GAP)];
    const SLOT_TOP = 160;
    const SLOT_BOTTOM = 1536 - 60;

    const getColumnFromCanvasX = (canvasX: number): number => {
      for (let i = 0; i < 3; i++) {
        if (canvasX >= COL_STARTS[i] && canvasX <= COL_STARTS[i] + COL_W) return i;
      }
      return -1;
    };

    // ── Live data readouts per room ──
    type StoreState = ReturnType<typeof useSovereignStore.getState>;

    const getRoomLiveData = (roomId: SovereignRoom, state: StoreState, time: number): Array<{ label: string; value: string; color: string }> => {
      const didShort = state.didKey !== 'UNINITIALIZED' ? state.didKey.slice(0, 16) + '...' : 'NONE';
      const spoonsR = state.maxSpoons > 0 ? state.spoons / state.maxSpoons : 1;
      const spCol = spoonsR > 0.6 ? '#7DDFB6' : spoonsR > 0.3 ? '#FFD700' : '#FF4444';
      const k4Nodes = state.k4Graph.nodes.length;
      const k4Edges = state.k4Graph.edges.length;
      const somaticCol = state.somaticTetherStatus === 'active' ? '#7DDFB6' : state.somaticTetherStatus === 'stress' ? '#FF4444' : state.somaticTetherStatus === 'calibrating' ? '#FFD700' : '#1a4a1a';

      switch (roomId) {
        case 'OBSERVATORY': return [
          { label: 'PANELS', value: '58', color: '#00FFFF' },
          { label: 'EDGES', value: '57', color: '#00FFFF' },
          { label: 'FACES', value: '80', color: '#00FFFF' },
          { label: 'COHERENCE', value: `${(state.coherence * 100).toFixed(0)}%`, color: state.coherence > 0.7 ? '#7DDFB6' : '#FFD700' },
        ];
        case 'COLLIDER': {
          const particles = Math.floor(state.coherence * 2048);
          return [
            { label: 'PARTICLES', value: `${particles}`, color: '#FF00FF' },
            { label: 'ENERGY', value: `${(state.coherence * 100).toFixed(0)}%`, color: '#FF00FF' },
            { label: 'TIER', value: state.tier, color: '#FF00FF' },
          ];
        }
        case 'BONDING': return [
          { label: 'LOVE', value: `${state.love}`, color: state.love > 0 ? '#FFD700' : '#1a4a1a' },
          { label: 'SESSION', value: state.didKey !== 'UNINITIALIZED' ? 'ACTIVE' : 'IDLE', color: state.didKey !== 'UNINITIALIZED' ? '#7DDFB6' : '#1a4a1a' },
          { label: 'K4 NODES', value: `${k4Nodes}`, color: k4Nodes >= 4 ? '#7DDFB6' : '#FFD700' },
          { label: 'K4 EDGES', value: `${k4Edges}/6`, color: k4Edges >= 6 ? '#7DDFB6' : '#FFD700' },
        ];
        case 'BRIDGE': {
          const careScore = Math.max(0, Math.min(100, Math.round(state.coherence * 100)));
          return [
            { label: 'LOVE', value: `${state.love}`, color: '#BF5FFF' },
            { label: 'SPOONS', value: `${state.spoons}/${state.maxSpoons}`, color: spCol },
            { label: 'CARE', value: `${careScore}%`, color: careScore > 70 ? '#7DDFB6' : '#FFD700' },
            { label: 'TIER', value: state.tier, color: '#BF5FFF' },
            { label: 'DID', value: didShort, color: '#BF5FFF' },
          ];
        }
        case 'BUFFER': {
          const thresholdV = Math.round((0.35 + state.noiseFloor * 1.1) * 100) / 100;
          const vCol = thresholdV >= 0.55 ? '#FFD700' : '#7DDFB6';
          const fawnCol = state.fawnGuardActive ? '#FF4444' : '#7DDFB6';
          return [
            { label: 'V-THRESH', value: `${thresholdV.toFixed(2)}V`, color: vCol },
            { label: 'NOISE', value: `${(state.noiseFloor * 100).toFixed(0)}%`, color: '#00FFFF' },
            { label: 'FAWN GUARD', value: state.fawnGuardActive ? 'ACTIVE' : 'CLEAR', color: fawnCol },
            { label: 'SOMATIC', value: state.somaticTetherStatus.toUpperCase(), color: somaticCol },
          ];
        }
        case 'COPILOT': return [
          { label: 'SPATIAL', value: `${state.spatialNodes} nodes`, color: state.spatialNodes > 0 ? '#7DDFB6' : '#1a4a1a' },
          { label: 'TRANSPORT', value: state.spatialTransport.toUpperCase(), color: state.spatialTransport !== 'none' ? '#00FFFF' : '#1a4a1a' },
          { label: 'HANDSHAKE', value: state.handshakeCandidate ? 'READY' : 'IDLE', color: state.handshakeCandidate ? '#FFD700' : '#1a4a1a' },
          { label: 'MINT', value: state.mintStatus.toUpperCase(), color: state.mintStatus === 'success' ? '#7DDFB6' : state.mintStatus === 'error' ? '#FF4444' : '#00FFFF' },
        ];
        case 'LANDING': {
          const st = state.centaurStatus ?? 'IDLE';
          const STATUS_COLS: Record<string, string> = { IDLE: '#7DDFB6', GENERATING: '#FFD700', COMPILING: '#00FFFF', ERROR: '#FF4444', SUCCESS: '#7DDFB6' };
          return [
            { label: 'COPILOT', value: st, color: STATUS_COLS[st] ?? '#00FFFF' },
            { label: 'SHANNON H', value: `${(state.coherence * 0.35).toFixed(3)}`, color: '#00FFFF' },
            { label: 'STRUCT', value: `${state.structureCount}`, color: '#00FFFF' },
            { label: 'MINT', value: state.mintStatus.toUpperCase(), color: state.mintStatus === 'success' ? '#7DDFB6' : state.mintStatus === 'error' ? '#FF4444' : '#00FFFF' },
          ];
        }
        case 'RESONANCE': {
          const syncStatus = state.genesisSyncStatus ?? 'offline';
          const SYNC_COLS: Record<string, string> = { offline: '#FF4444', syncing: '#00FFFF', synced: '#7DDFB6', error: '#FFD700' };
          return [
            { label: 'COHERENCE', value: `${(state.coherence * 100).toFixed(0)}%`, color: state.coherence > 0.7 ? '#7DDFB6' : '#FFD700' },
            { label: 'SYNC', value: syncStatus.toUpperCase(), color: SYNC_COLS[syncStatus] ?? '#FF4444' },
            { label: 'AUDIO', value: state.audioEnabled ? 'ON' : 'OFF', color: state.audioEnabled ? '#7DDFB6' : '#1a4a1a' },
          ];
        }
        case 'FORGE': {
          const txCount = state.telemetryHashes.length;
          return [
            { label: 'LEDGER', value: `${txCount} TX`, color: '#FFD700' },
            { label: 'CRDT', value: `v${state.crdtVersion}`, color: '#FFD700' },
            { label: 'PWA', value: state.pwaStatus.slice(0, 12), color: '#FFD700' },
          ];
        }
        default: return [];
      }
    };

    const drawRoomCard = (
      ctx: CanvasRenderingContext2D,
      base: ReturnType<typeof drawScreenBase>,
      col: number,
      room: RoomPanel,
      time: number,
      theme: ScreenTheme,
      isHovered: boolean,
      liveData: Array<{ label: string; value: string; color: string }>,
    ) => {
      const cx = base.cols[col];
      const sy = base.slotTop + 10;
      const sw = base.colW;
      const sh = base.h - 80 - sy;
      const inset = 12;

      // Card background — subtle fill on hover
      if (isHovered) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = room.color;
        ctx.fillRect(cx + inset, sy + inset, sw - 2 * inset, sh - 2 * inset);
        ctx.globalAlpha = 1;
      }

      // Border — glowing on hover, subtle pulse normally
      const pulse = isHovered ? 0.7 : 0.25 + 0.15 * ((Math.sin(time * 1.5 + col * 2) + 1) / 2);
      ctx.globalAlpha = pulse;
      ctx.shadowColor = room.color;
      ctx.shadowBlur = isHovered ? 16 : 6;
      ctx.strokeStyle = room.color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeRect(cx + inset, sy + inset, sw - 2 * inset, sh - 2 * inset);
      ctx.shadowBlur = 0;

      // Corner L-brackets
      ctx.globalAlpha = pulse + 0.2;
      ctx.strokeStyle = room.color;
      ctx.lineWidth = 4;
      const bL = 30;
      const x1 = cx + inset, y1 = sy + inset;
      const x2 = cx + sw - inset, y2 = sy + sh - inset;
      ctx.beginPath(); ctx.moveTo(x1, y1 + bL); ctx.lineTo(x1, y1); ctx.lineTo(x1 + bL, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - bL, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + bL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y2 - bL); ctx.lineTo(x1, y2); ctx.lineTo(x1 + bL, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2 - bL, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - bL); ctx.stroke();

      // ── Top section: Icon + Label ──
      const centerX = cx + sw / 2;
      const iconY = sy + inset + 80;

      // Icon — crisp neon glow
      ctx.textAlign = 'center';
      ctx.font = 'bold 96px monospace';
      ctx.globalAlpha = 0.4;
      ctx.shadowColor = room.color; ctx.shadowBlur = 16; ctx.fillStyle = room.color;
      ctx.fillText(room.icon, centerX, iconY);
      ctx.globalAlpha = 1; ctx.shadowBlur = 4;
      ctx.fillStyle = room.color;
      ctx.fillText(room.icon, centerX, iconY);
      ctx.shadowBlur = 0;

      // Label — crisp neon
      ctx.font = 'bold 40px monospace';
      ctx.globalAlpha = 0.45;
      ctx.shadowColor = room.color; ctx.shadowBlur = 10; ctx.fillStyle = room.color;
      ctx.fillText(room.label.toUpperCase(), centerX, iconY + 60);
      ctx.globalAlpha = 1; ctx.shadowBlur = 3;
      ctx.fillStyle = room.color;
      ctx.fillText(room.label.toUpperCase(), centerX, iconY + 60);
      ctx.shadowBlur = 0;

      // Description
      ctx.globalAlpha = 0.7;
      ctx.shadowColor = theme.dim; ctx.shadowBlur = 3; ctx.fillStyle = theme.dim;
      ctx.font = '24px monospace';
      ctx.fillText(room.desc, centerX, iconY + 95);
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.fillText(room.desc, centerX, iconY + 95);

      // ── Divider line ──
      const divY = iconY + 120;
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = room.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + inset + 20, divY); ctx.lineTo(cx + sw - inset - 20, divY); ctx.stroke();
      ctx.globalAlpha = 1;

      // ── Live data readouts ──
      let dataY = divY + 50;
      for (const d of liveData) {
        // Label
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = theme.dim;
        ctx.font = '20px monospace';
        ctx.shadowBlur = 0;
        ctx.fillText(d.label, centerX, dataY);

        // Value — crisp neon
        dataY += 38;
        ctx.font = 'bold 36px monospace';
        ctx.globalAlpha = 0.45;
        ctx.shadowColor = d.color; ctx.shadowBlur = 8; ctx.fillStyle = d.color;
        ctx.fillText(d.value, centerX, dataY);
        ctx.globalAlpha = 1; ctx.shadowBlur = 2;
        ctx.fillStyle = d.color;
        ctx.fillText(d.value, centerX, dataY);
        ctx.shadowBlur = 0;

        dataY += 46;
      }

      // ── "ENTER" hint at bottom ──
      const hintPulse = 0.2 + 0.15 * ((Math.sin(time * 2 + col) + 1) / 2);
      ctx.globalAlpha = isHovered ? 0.7 : hintPulse;
      ctx.fillStyle = room.color;
      ctx.font = 'bold 22px monospace';
      ctx.fillText('[ ENTER ]', centerX, y2 - 24);

      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    };

    // ── U03: Draw fabrication queue (replaces COPILOT card when mint active) ──
    const drawFabricationQueue = (
      ctx: CanvasRenderingContext2D,
      base: ReturnType<typeof drawScreenBase>,
      col: number,
      time: number,
      theme: ScreenTheme,
      mintStatus: string,
    ) => {
      const cx = base.cols[col];
      const sy = base.slotTop + 10;
      const sw = base.colW;
      const sh = base.h - 80 - sy;
      const inset = 12;
      const centerX = cx + sw / 2;

      // Card border — pulsing cyan
      const pulse = 0.4 + 0.3 * ((Math.sin(time * 2) + 1) / 2);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx + inset, sy + inset, sw - 2 * inset, sh - 2 * inset);
      ctx.shadowBlur = 0;

      // Title
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1;
      ctx.font = 'bold 28px monospace';
      ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#00FFFF';
      ctx.fillText('FABRICATION QUEUE', centerX, sy + 80);
      ctx.shadowBlur = 0;

      // Divider
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + inset + 30, sy + 100); ctx.lineTo(cx + sw - inset - 30, sy + 100); ctx.stroke();
      ctx.globalAlpha = 1;

      // Status text
      let statusText = '';
      let statusColor = '#00FFFF';
      if (mintStatus === 'collecting-signatures') {
        statusText = 'K4 MESH ACHIEVED';
        statusColor = '#FFD700';
      } else if (mintStatus === 'minting') {
        statusText = 'EXECUTING SMART CONTRACT...';
        statusColor = '#BF5FFF';
      } else if (mintStatus === 'success') {
        statusText = 'WEBHOOK FIRED';
        statusColor = '#00FFFF';
      } else if (mintStatus === 'error') {
        statusText = 'FABRICATION ERROR';
        statusColor = '#FF4444';
      }

      ctx.font = 'bold 26px monospace';
      ctx.shadowColor = statusColor; ctx.shadowBlur = 8;
      ctx.fillStyle = statusColor;
      ctx.fillText(statusText, centerX, sy + 160);
      ctx.shadowBlur = 0;

      // Sub-status
      if (mintStatus === 'collecting-signatures') {
        ctx.font = '22px monospace';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#FFD700';
        ctx.fillText('COLLECTING SIGNATURES...', centerX, sy + 200);
      } else if (mintStatus === 'success') {
        ctx.font = '20px monospace';
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#00FFFF';
        ctx.fillText('-> PRINTER.P31CA.ORG', centerX, sy + 200);
      }
      ctx.globalAlpha = 1;

      // Progress bar (animated during minting/success)
      if (mintStatus === 'minting' || mintStatus === 'success') {
        const barX = cx + inset + 40;
        const barW = sw - 2 * inset - 80;
        const barY = sy + 240;
        const barH = 20;
        const progress = mintStatus === 'success' ? 1.0
          : (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.85;

        // Track
        ctx.fillStyle = 'rgba(0,255,255,0.06)';
        ctx.fillRect(barX, barY, barW, barH);
        // Fill
        ctx.fillStyle = mintStatus === 'success' ? '#00FFFF' : '#00FFFF';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.fillRect(barX, barY, barW * progress, barH);
        ctx.shadowBlur = 0;

        // Percentage
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = mintStatus === 'success' ? '#00FFFF' : '#00FFFF';
        ctx.fillText(`${Math.round(progress * 100)}%`, centerX, barY + barH + 30);
      }

      // Rotating tetrahedron wireframe (during minting/success)
      if (mintStatus === 'minting' || mintStatus === 'success') {
        const tetCx = centerX;
        const tetCy = sy + 370;
        const tetR = 40;
        const rot = time * 1.5;

        // 4 vertices of tetrahedron projected to 2D
        const verts = [
          [0, -1, 0],
          [0.943, 0.333, 0],
          [-0.471, 0.333, 0.816],
          [-0.471, 0.333, -0.816],
        ].map(([vx, vy, vz]) => {
          // Rotate around Y
          const rx = vx * Math.cos(rot) - vz * Math.sin(rot);
          const rz = vx * Math.sin(rot) + vz * Math.cos(rot);
          return [tetCx + rx * tetR, tetCy + vy * tetR, rz];
        });

        ctx.strokeStyle = mintStatus === 'success' ? '#00FFFF' : '#BF5FFF';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;

        // Draw 6 edges
        const edges = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
        for (const [a, b] of edges) {
          ctx.beginPath();
          ctx.moveTo(verts[a][0], verts[a][1]);
          ctx.lineTo(verts[b][0], verts[b][1]);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    };

    const drawRoomScreen = (screenIdx: number, state: StoreState, time: number) => {
      const ctx = screenContexts[screenIdx];
      const w = screenCanvases[screenIdx].width;
      const h = screenCanvases[screenIdx].height;
      const themeKey = (['BRIDGE', 'SYSTEM', 'BUFFER'] as const)[screenIdx];
      const T = THEMES[themeKey];
      const titles = ['SCREEN A // ROOMS', 'SCREEN B // ROOMS', 'SCREEN C // ROOMS'];
      const subs = ['observatory . collider . bonding', 'bridge . buffer . open slot', 'quantum ide . resonance . forge'];
      const base = drawScreenBase(ctx, w, h, time, T, titles[screenIdx], subs[screenIdx], 0, {});

      for (let col = 0; col < 3; col++) {
        // U03: System Screen col 2 (COPILOT) → fabrication queue when mint active
        if (screenIdx === 1 && col === 2 && state.mintStatus !== 'idle') {
          drawFabricationQueue(ctx, base, col, time, T, state.mintStatus);
          continue;
        }
        const room = SCREEN_ROOMS[screenIdx][col];
        const isHov = hoveredScreen === screenIdx && hoveredCol === col;
        const liveData = getRoomLiveData(room.id, state, time);
        drawRoomCard(ctx, base, col, room, time, T, isHov, liveData);
      }
      ctx.restore();
    };

    // ── Animation loop ──
    const clock = new THREE.Clock();
    const SCREEN_UPDATE_HZ = 12;
    const SCREEN_UPDATE_DT = 1 / SCREEN_UPDATE_HZ;
    let lastScreenDrawT = -Infinity;

    renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, clock.getDelta());
      const time = clock.elapsedTime;
      const state = useSovereignStore.getState();

      // ── Fly-to animation (cockpit-level) ──
      if (orbit.flyTo && orbit.flyFrom) {
        orbit.flyT = Math.min(1, orbit.flyT + dt * 1.15);
        const ease = 1 - Math.pow(1 - orbit.flyT, 3);
        orbit.rx = orbit.flyFrom.rx + (orbit.flyTo.rx - orbit.flyFrom.rx) * ease;
        orbit.ry = orbit.flyFrom.ry + (orbit.flyTo.ry - orbit.flyFrom.ry) * ease;
        orbit.dist = orbit.flyFrom.dist + (orbit.flyTo.dist - orbit.flyFrom.dist) * ease;
        if (orbit.flyT >= 1) {
          orbit.flyTo = null; orbit.flyFrom = null;
          orbit.vx = 0; orbit.vy = 0; orbit.vDist = 0;
        }
      } else if (!orbit.down) {
        // Inertia: apply velocity and decay (organic drift on release)
        orbit.rx += orbit.vx * dt;
        orbit.ry += orbit.vy * dt;
        orbit.ry = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, orbit.ry));
        orbit.dist += orbit.vDist * dt;
        orbit.dist = Math.max(0.5, Math.min(200, orbit.dist));
        const angFriction = Math.exp(-7.5 * dt);
        const zoomFriction = Math.exp(-9.0 * dt);
        orbit.vx *= angFriction;
        orbit.vy *= angFriction;
        orbit.vDist *= zoomFriction;
        if (Math.abs(orbit.vx) < 0.0005) orbit.vx = 0;
        if (Math.abs(orbit.vy) < 0.0005) orbit.vy = 0;
        if (Math.abs(orbit.vDist) < 0.001) orbit.vDist = 0;
      }

      // Camera follow: soft spring-like easing (less mechanical)
      const k = orbit.down ? 22 : 10;
      const alpha = 1 - Math.exp(-k * dt);
      orbit.trx += (orbit.rx - orbit.trx) * alpha;
      orbit.try_ += (orbit.ry - orbit.try_) * alpha;
      orbit.tDist += (orbit.dist - orbit.tDist) * alpha;

      const D = orbit.tDist;
      camera.position.x = D * Math.sin(orbit.trx) * Math.cos(orbit.try_);
      camera.position.y = D * Math.sin(orbit.try_) + 0.3;
      camera.position.z = D * Math.cos(orbit.trx) * Math.cos(orbit.try_);
      camera.lookAt(0, 0, 0);

      if (state.audioEnabled) {
        audioEngine.update(state.coherence, false, 'OBSERVATORY');
      }

      stars.rotation.y = time * 0.01;

      // ── M18: Update somatic waveform from store ──
      if (state.somaticTetherStatus !== 'disconnected') {
        waveformLine.visible = true;
        // Read waveform buffer from store — stored by useSomaticTether hook
        // We use a simple sine wave fallback when no real data (shows tether is active)
        const posArr = waveformGeo.attributes.position.array as Float32Array;
        const xSpan = 6; // total width
        for (let i = 0; i < WAVEFORM_POINTS; i++) {
          const t = i / (WAVEFORM_POINTS - 1);
          posArr[i * 3] = t * xSpan;
          posArr[i * 3 + 1] = Math.sin(time * 3 + t * 12) * 0.15
            * (state.somaticTetherStatus === 'stress' ? 2.5 : 1.0);
          posArr[i * 3 + 2] = 0;
        }
        waveformGeo.attributes.position.needsUpdate = true;
        // Color shift: green=active, amber=calibrating, red=stress
        const wfMat = waveformLine.material as THREE.LineBasicMaterial;
        if (state.somaticTetherStatus === 'stress') {
          wfMat.color.lerp(new THREE.Color('#FF4444'), 0.1);
        } else if (state.somaticTetherStatus === 'calibrating') {
          wfMat.color.lerp(new THREE.Color('#FFD700'), 0.1);
        } else {
          wfMat.color.lerp(new THREE.Color('#00FFFF'), 0.1);
        }
      } else {
        waveformLine.visible = false;
      }

      // ── M20: Update spatial radar orbs (RSSI-mapped) ──
      const nodeList = state.spatialNodeList;
      const spatialCount = nodeList.length;
      for (let i = 0; i < MAX_SPATIAL_NODES; i++) {
        if (i < spatialCount) {
          const node = nodeList[i];
          spatialOrbs[i].visible = true;

          // Map RSSI to radius: strong (-50) → close (2), weak (-85) → far (8)
          const rssiNorm = Math.max(0, Math.min(1, (node.rssi + 85) / 35)); // 0=far, 1=close
          const radius = 8 - rssiNorm * 6; // 2 to 8
          const angle = (i / Math.max(spatialCount, 1)) * Math.PI * 2;

          spatialOrbs[i].position.set(
            Math.cos(angle + time * 0.1) * radius,
            Math.sin(time * 0.5 + i) * 0.3,
            Math.sin(angle + time * 0.1) * radius,
          );

          // Scale by signal strength: strong → large (1.5), weak → small (0.4)
          const scale = 0.4 + rssiNorm * 1.1;
          spatialOrbs[i].scale.setScalar(scale);

          // Color by valency
          const colorIdx = Math.min(node.valency, VALENCY_COLORS.length - 1);
          spatialOrbMaterials[i].color.copy(VALENCY_COLORS[colorIdx]);
          spatialOrbMaterials[i].opacity = 0.6 + 0.3 * Math.sin(time * 2 + i);
        } else {
          spatialOrbs[i].visible = false;
        }
      }

      // ── M21: Bond line (handshake active → glowing line to bonded orb) ──
      if (bondLine) {
        if (state.handshakeActive && spatialCount > 0) {
          bondLine.visible = true;
          // Connect to nearest (first) orb
          const targetPos = spatialOrbs[0].position;
          const posArr = bondLineGeo.attributes.position.array as Float32Array;
          posArr[0] = 0; posArr[1] = 0; posArr[2] = 5; // camera-ish position
          posArr[3] = targetPos.x; posArr[4] = targetPos.y; posArr[5] = targetPos.z;
          bondLineGeo.attributes.position.needsUpdate = true;
          // Pulse opacity
          (bondLine.material as THREE.LineBasicMaterial).opacity = 0.5 + 0.4 * Math.sin(time * 4);
        } else {
          bondLine.visible = false;
        }
      }

      if (observatoryHandle) {
        observatoryHandle.update(dt, time);
      }

      coreUniforms.uTime.value = time;
      coreUniforms.uCoherence.value = THREE.MathUtils.lerp(coreUniforms.uCoherence.value, state.coherence, 0.1);
      coreUniforms.uNoise.value = THREE.MathUtils.lerp(coreUniforms.uNoise.value, state.noiseFloor, 0.1);
      keyLight.intensity = 2 + state.coherence * 2;
      // Dynamic key light: blend pink/cyan/amber based on camera orbit angle
      const normAngle = ((orbit.trx % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let targetLight: THREE.Color;
      if (normAngle < Math.PI * 0.67) {
        targetLight = LIGHT_PINK; // Bridge screen zone (right)
      } else if (normAngle < Math.PI * 1.33) {
        targetLight = LIGHT_CYAN; // System screen zone (center)
      } else {
        targetLight = LIGHT_AMBER; // Buffer screen zone (left)
      }
      keyLight.color.lerp(targetLight, 0.05);

      if (time - lastScreenDrawT >= SCREEN_UPDATE_DT) {
        lastScreenDrawT = time;
        drawRoomScreen(0, state, time);
        drawRoomScreen(1, state, time);
        drawRoomScreen(2, state, time);
        for (const tex of screenTextures) tex.needsUpdate = true;
      }

      if (observatoryHandle) {
        observatoryHandle.renderBloom();
        observatoryHandle.renderLabels(scene, camera);
      } else {
        renderer.render(scene, camera);
      }
    });

    return () => {
      if (observatoryHandle) { observatoryHandle.dispose(); observatoryHandle = null; }
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousemove', handleHoverThrottled);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      renderer.domElement.remove();
      renderer.dispose();
      scene.clear();
      for (const tex of screenTextures) tex.dispose();
      for (const mat of screenMaterials) mat.dispose();
      for (const geo of screenGeometries) geo.dispose();
      // edge geometries removed (glassy screens)
      for (const canvas of screenCanvases) { canvas.width = 0; canvas.height = 0; }
      waveformGeo.dispose(); (waveformLine.material as THREE.Material).dispose();
      bondLineGeo.dispose(); (bondLine.material as THREE.Material).dispose();
      spatialOrbGeo.dispose();
      for (const mat of spatialOrbMaterials) mat.dispose();
      disposeThreeNode(roomGroup); p31Material.dispose(); starGeo.dispose();
    };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={{
        pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 20, opacity: 0.3,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      }} />
      <div style={{
        pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 30,
        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.8)',
      }} />
    </>
  );
};
