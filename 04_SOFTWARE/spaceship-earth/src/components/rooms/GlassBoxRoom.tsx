// GlassBoxRoom.tsx — The Glass Box: interactive Posner molecule visualization.
// Three.js particle system + glass panel controls for entropy, Larmor spin, coherence.

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

const PHOSPHOR = '#00FFFF';
const CALCIUM = '#00d4ff';
const AMBER = '#FFD700';
const CORAL = '#FF6B6B';

interface GlassBoxProps {
  initialH?: number;
  initialB?: number;
  initialQ?: number;
  onCoherenceAchieved?: () => void;
}

export default function GlassBoxRoom({ initialH = 0.35, initialB = 50, initialQ = 4.0, onCoherenceAchieved }: GlassBoxProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ H: initialH, B: initialB, Q: initialQ });
  const [hDisplay, setHDisplay] = useState(initialH.toFixed(2));
  const [bDisplay, setBDisplay] = useState(String(initialB));
  const [qDisplay, setQDisplay] = useState(initialQ.toFixed(1));
  const [liveH, setLiveH] = useState(initialH.toFixed(3));
  const coherenceCallbackRef = useRef(onCoherenceAchieved);
  coherenceCallbackRef.current = onCoherenceAchieved;
  const coherenceFiredRef = useRef(false);
  const coherenceTimerRef = useRef(0);

  const onH = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    stateRef.current.H = v;
    setHDisplay(v.toFixed(2));
    setLiveH(v.toFixed(3));
  }, []);

  const onB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    stateRef.current.B = v;
    setBDisplay(v + ' \u00B5T');
  }, []);

  const onQ = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    stateRef.current.Q = v;
    setQDisplay(v.toFixed(1));
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.012);

    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Particles
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorP = new THREE.Color(PHOSPHOR);
    const colorCa = new THREE.Color(CALCIUM);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 10 + (Math.random() - 0.5) * 2;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      const color = Math.random() > 0.6 ? colorP : colorCa;
      // Boost color intensity for neon vibrancy (additive blending amplifies further)
      colors[i * 3] = Math.min(1, color.r * 1.4);
      colors[i * 3 + 1] = Math.min(1, color.g * 1.4);
      colors[i * 3 + 2] = Math.min(1, color.b * 1.4);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Disc texture for particles
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 32;
    texCanvas.height = 32;
    const ctx = texCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.Texture(texCanvas);
    texture.needsUpdate = true;

    const material = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      map: texture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    group.add(particleSystem);

    // Connection lines
    const lineCount = 100;
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(lineCount * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    let time = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.01;

      const s = stateRef.current;
      const spinSpeed = s.B * 0.0002;
      group.rotation.y += spinSpeed;
      group.rotation.z += spinSpeed * 0.5;

      const deviation = Math.abs(s.H - 0.35);
      const chaosLevel = deviation * 2.0;
      const coherenceFactor = 1 / s.Q;

      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        let x = originalPositions[ix];
        let y = originalPositions[iy];
        let z = originalPositions[iz];

        const breath = 1 + Math.sin(time * 2 + y * 0.1) * 0.05 * coherenceFactor;
        x *= breath;
        y *= breath;
        z *= breath;

        pos[ix] = x + Math.sin(time * 5 + i) * chaosLevel * 2;
        pos[iy] = y + Math.cos(time * 3 + i) * chaosLevel * 2;
        pos[iz] = z + Math.sin(time * 4 + i) * chaosLevel * 2;
      }
      geometry.attributes.position.needsUpdate = true;

      const lp = lineGeo.attributes.position.array as Float32Array;
      let pIdx = 0;
      for (let i = 0; i < lineCount; i++) {
        lp[pIdx++] = (Math.random() - 0.5) * chaosLevel;
        lp[pIdx++] = (Math.random() - 0.5) * chaosLevel;
        lp[pIdx++] = (Math.random() - 0.5) * chaosLevel;
        const tIdx = Math.floor(Math.random() * particleCount) * 3;
        lp[pIdx++] = pos[tIdx];
        lp[pIdx++] = pos[tIdx + 1];
        lp[pIdx++] = pos[tIdx + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineMat.opacity = Math.max(0.1, 0.5 - chaosLevel * 0.4);

      renderer.render(scene, camera);

      // Coherence check for lock screen unlock
      if (!coherenceFiredRef.current && coherenceCallbackRef.current) {
        const isCoherent = Math.abs(s.H - 0.35) < 0.08 && s.Q >= 3.5;
        if (isCoherent) {
          coherenceTimerRef.current += 0.01; // ~matches time += 0.01
          if (coherenceTimerRef.current >= 0.8) {
            coherenceFiredRef.current = true;
            coherenceCallbackRef.current();
          }
        } else {
          coherenceTimerRef.current = 0;
        }
      }
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      texture.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const glassPanel: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 12px rgba(0,255,255,0.02)',
    maxWidth: 320,
    fontFamily: "'JetBrains Mono', monospace",
    color: PHOSPHOR,
    zIndex: 10,
  };

  const labelRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  };

  const rangeStyle: React.CSSProperties = {
    width: '100%',
    height: 2,
    outline: 'none',
    borderRadius: 2,
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000', overflow: 'hidden' }}>
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Panel 1: Attractor */}
      <div style={{ ...glassPanel, top: 40, left: 40 }}>
        <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, color: PHOSPHOR, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 0 8px rgba(0,255,255,0.2)' }}>
          <span>{'\u2B21'}</span> Mark 1 Attractor
        </div>
        <div style={{ fontSize: 11, color: 'rgba(0,255,255,0.2)', marginBottom: 24, fontWeight: 400 }}>
          Self-Organized Criticality
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 12, marginBottom: 20, fontSize: 12, color: PHOSPHOR, borderLeft: `2px solid ${PHOSPHOR}` }}>
          dH/dt = -k(<span style={{ color: CALCIUM, fontWeight: 'bold' }}>H</span> - 0.35)
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={labelRow}>
            <span>Entropy (H)</span>
            <span>{hDisplay}</span>
          </div>
          <input type="range" min="0" max="1" step="0.01" defaultValue={initialH} onChange={onH} style={{ ...rangeStyle, accentColor: PHOSPHOR }} />
        </div>
        <p style={{ fontSize: 10, color: 'rgba(0,255,255,0.18)', lineHeight: 1.4 }}>
          <strong>0.00</strong> = Stasis (Frozen)<br />
          <strong>0.35</strong> = The Sweet Spot (Life)<br />
          <strong>1.00</strong> = Chaos (Noise)
        </p>
      </div>

      {/* Panel 2: Larmor Frequency — cyan accent */}
      <div style={{ ...glassPanel, top: 40, right: 40, border: `1px solid rgba(0,212,255,0.15)`, color: CALCIUM }}>
        <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, color: CALCIUM, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, textShadow: `0 0 8px rgba(0,212,255,0.4)` }}>
          <span>{'\u26A1'}</span> Larmor Spin
        </div>
        <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.4)', marginBottom: 24, fontWeight: 400 }}>
          Nuclear Precession Dynamics
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 12, marginBottom: 20, fontSize: 12, color: CALCIUM, borderLeft: `2px solid ${CALCIUM}` }}>
          {'\u03C9'} = {'\u03B3'}<span style={{ color: PHOSPHOR, fontWeight: 'bold' }}>B</span>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={labelRow}>
            <span>Magnetic Field (B)</span>
            <span>{bDisplay}</span>
          </div>
          <input type="range" min="0" max="200" step="1" defaultValue={initialB} onChange={onB} style={{ ...rangeStyle, accentColor: CALCIUM }} />
        </div>
        <p style={{ fontSize: 10, color: 'rgba(0,212,255,0.35)', lineHeight: 1.4 }}>
          Controls the rotational velocity of the <sup>31</sup>P nuclear spins.
          Aligned with Earth's magnetic field at ~50{'\u00B5'}T.
        </p>
      </div>

      {/* Panel 3: Coherence — amber accent */}
      <div style={{ ...glassPanel, bottom: 40, left: 40, border: `1px solid rgba(255,215,0,0.15)`, color: AMBER }}>
        <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, color: AMBER, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, textShadow: `0 0 8px rgba(255,215,0,0.4)` }}>
          <span>{'\u25C8'}</span> Fisher-Escol&agrave; Q
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,215,0,0.4)', marginBottom: 24, fontWeight: 400 }}>
          Quantum Coherence Probability
        </div>
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 12, marginBottom: 20, fontSize: 12, color: AMBER, borderLeft: `2px solid ${AMBER}` }}>
          Q ~ Beta(<span style={{ color: CORAL, fontWeight: 'bold' }}>{'\u03B1'}</span>, <span style={{ color: CORAL, fontWeight: 'bold' }}>{'\u03B2'}</span>)
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={labelRow}>
            <span>Coherence (Q)</span>
            <span>{qDisplay}</span>
          </div>
          <input type="range" min="0.1" max="5.0" step="0.1" defaultValue={initialQ} onChange={onQ} style={{ ...rangeStyle, accentColor: AMBER }} />
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,215,0,0.35)', lineHeight: 1.4 }}>
          Determines the "fuzziness" of the qubit state. High Q = Sharp Structure. Low Q = Probability Cloud.
        </p>
      </div>

      {/* Status bar */}
      <div style={{ position: 'absolute', bottom: 40, right: 40, textAlign: 'right', pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ fontSize: 48, fontWeight: 300, color: CALCIUM, lineHeight: 1, letterSpacing: -2, fontFamily: "'JetBrains Mono', monospace", textShadow: '0 0 20px rgba(0,212,255,0.5), 0 0 40px rgba(0,212,255,0.2)' }}>
          {liveH}
        </div>
        <div style={{ fontSize: 10, color: PHOSPHOR, textTransform: 'uppercase', letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace", textShadow: '0 0 6px rgba(0,255,255,0.15)' }}>
          System Harmonic
        </div>
      </div>
    </div>
  );
}
