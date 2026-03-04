// spaceship-earth/src/components/MolecularField.tsx
// Persistent molecular starfield background — renders behind all rooms.
// Deep black void with faint tinted particles, additive blending.
// Mounts once at the shell level, never unmounts on room change.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const BG_COLOR = 0x020406;

export function MolecularField() {
  const mountRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.018);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    el.appendChild(renderer.domElement);

    // ── Molecular particles ──
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Distribute in a large sphere shell
      const r = 8 + Math.random() * 80;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      positions[i3] = r * Math.sin(ph) * Math.cos(th);
      positions[i3 + 1] = r * Math.sin(ph) * Math.sin(th);
      positions[i3 + 2] = r * Math.cos(ph);

      // Subtle tinted particles — cold blue dominant, warm amber accent
      const hue = Math.random() < 0.7
        ? 0.58 + Math.random() * 0.1    // blue-cyan
        : 0.08 + Math.random() * 0.06;  // amber
      const c = new THREE.Color().setHSL(hue, 0.35, 0.12 + Math.random() * 0.08);
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      // Very slow drift
      velocities[i3] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ── Slow camera rotation for ambient motion ──
    let angle = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      angle += 0.0003;

      // Drift particles
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        pos.array[i3] += velocities[i3];
        pos.array[i3 + 1] += velocities[i3 + 1];
        pos.array[i3 + 2] += velocities[i3 + 2];

        // Wrap particles that drift too far
        const x = pos.array[i3], y = pos.array[i3 + 1], z = pos.array[i3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 100) {
          const scale = 10 / dist;
          pos.array[i3] *= scale;
          pos.array[i3 + 1] *= scale;
          pos.array[i3 + 2] *= scale;
        }
      }
      pos.needsUpdate = true;

      // Gentle camera orbit
      camera.position.x = Math.sin(angle) * 0.5;
      camera.position.y = Math.cos(angle * 0.7) * 0.3;
      camera.lookAt(0, 0, -20);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
