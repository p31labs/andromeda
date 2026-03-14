// GlassBoxRoom.tsx — The Glass Box: interactive Posner molecule visualization.
// Three.js particle system + glass panel controls for entropy, Larmor spin, coherence.

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { theme } from '../../lib/theme';
import { disposeHierarchy } from '../../lib/three-utils';

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
  const [slidersHidden, setSlidersHidden] = useState(false);
  const [hoveredSlider, setHoveredSlider] = useState<'H' | 'B' | 'Q' | null>(null);
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
    const isMobile = W < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Particles — reduce on mobile for performance
    const particleCount = isMobile ? 600 : 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const updateParticleColors = () => {
      const colorP = theme.getColor('--cyan');
      const colorCa = theme.getColor('--blue');
      const colorArray = geometry.attributes.color.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const color = Math.random() > 0.6 ? colorP : colorCa;
        colorArray[i * 3] = Math.min(1, color.r * 1.4);
        colorArray[i * 3 + 1] = Math.min(1, color.g * 1.4);
        colorArray[i * 3 + 2] = Math.min(1, color.b * 1.4);
      }
      geometry.attributes.color.needsUpdate = true;
    };

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
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    updateParticleColors();

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

    // Connection lines — nuclear glow (magenta, restrained)
    const lineCount = 80;
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(lineCount * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: theme.getColor('--magenta'),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    // Second glow layer — wider, softer for bloom halo
    const glowLineGeo = new THREE.BufferGeometry();
    const glowLinePos = new Float32Array(lineCount * 6);
    glowLineGeo.setAttribute('position', new THREE.BufferAttribute(glowLinePos, 3));
    const glowLineMat = new THREE.LineBasicMaterial({
      color: theme.getColor('--violet'),
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const glowLines = new THREE.LineSegments(glowLineGeo, glowLineMat);
    group.add(glowLines);

    const onThemeChange = () => {
      lineMat.color.copy(theme.getColor('--magenta'));
      glowLineMat.color.copy(theme.getColor('--violet'));
      updateParticleColors();
    };
    window.addEventListener('p31-theme-change', onThemeChange);

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

      // Core magenta lines
      const lp = lineGeo.attributes.position.array as Float32Array;
      const gp = glowLineGeo.attributes.position.array as Float32Array;
      let pIdx = 0;
      for (let i = 0; i < lineCount; i++) {
        const cx = (Math.random() - 0.5) * chaosLevel * 0.5;
        const cy = (Math.random() - 0.5) * chaosLevel * 0.5;
        const cz = (Math.random() - 0.5) * chaosLevel * 0.5;
        const tIdx = Math.floor(Math.random() * particleCount) * 3;
        lp[pIdx] = cx;     gp[pIdx] = cx + (Math.random() - 0.5) * 0.3;
        lp[pIdx+1] = cy;   gp[pIdx+1] = cy + (Math.random() - 0.5) * 0.3;
        lp[pIdx+2] = cz;   gp[pIdx+2] = cz + (Math.random() - 0.5) * 0.3;
        lp[pIdx+3] = pos[tIdx];     gp[pIdx+3] = pos[tIdx] + (Math.random() - 0.5) * 0.5;
        lp[pIdx+4] = pos[tIdx+1];   gp[pIdx+4] = pos[tIdx+1] + (Math.random() - 0.5) * 0.5;
        lp[pIdx+5] = pos[tIdx+2];   gp[pIdx+5] = pos[tIdx+2] + (Math.random() - 0.5) * 0.5;
        pIdx += 6;
      }
      lineGeo.attributes.position.needsUpdate = true;
      glowLineGeo.attributes.position.needsUpdate = true;
      // Brighter when coherent, still visible during chaos
      lineMat.opacity = Math.max(0.15, 0.45 - chaosLevel * 0.2);
      glowLineMat.opacity = Math.max(0.05, 0.15 - chaosLevel * 0.08);

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
      window.removeEventListener('p31-theme-change', onThemeChange);
      
      // M18 Performance: Recursive GPU memory reclamation
      disposeHierarchy(scene);

      renderer.dispose();
      texture.dispose(); // Explicit dispose for the generated texture as well
      container.removeChild(renderer.domElement);
    };
  }, []);

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

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute', bottom: '100%', left: 0, right: 0,
    marginBottom: 6, padding: '8px 10px',
    background: 'rgba(0,0,0,0.85)', border: '1px solid var(--neon-ghost)',
    borderRadius: 'var(--radius-md)', fontSize: 9, lineHeight: 1.5,
    color: 'var(--text)', fontFamily: "var(--font-data)",
    backdropFilter: 'blur(12px)', pointerEvents: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 8px var(--neon-ghost)',
    zIndex: 30,
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--void)', overflow: 'hidden' }}>
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Compact control strip — bottom-left, doesn't obscure animation */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        width: 'min(340px, calc(100% - 32px))',
        opacity: slidersHidden ? 0 : 1,
        transform: slidersHidden ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity var(--trans-base), transform var(--trans-base)',
        pointerEvents: slidersHidden ? 'none' : 'auto',
      }}>
        <div className="glass-card" style={{
          padding: 12,
          background: 'rgba(0, 0, 0, 0.55)',
          border: '1px solid var(--neon-ghost)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--cyan)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textShadow: 'var(--glow-cyan)' }}>
            <span>{'\u2B21'}</span> Attractor Controls
          </div>
          {/* H slider */}
          <div style={{ marginBottom: 6, position: 'relative' }}
            onMouseEnter={() => setHoveredSlider('H')} onMouseLeave={() => setHoveredSlider(null)}>
            <div style={{ ...labelRow, marginBottom: 4, fontSize: 9 }}>
              <span style={{ color: 'var(--cyan)' }}>H</span>
              <span style={{ color: 'var(--cyan)' }}>{hDisplay}</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" defaultValue={initialH} onChange={onH} aria-label="Entropy (H)" className="glass-input" style={{ ...rangeStyle, accentColor: 'var(--cyan)', padding: 0 }} />
            {hoveredSlider === 'H' && <div style={tooltipStyle}>
              <strong>Entropy (H)</strong> &mdash; System disorder. 0 = frozen, 0.35 = sweet spot, 1 = chaos. Controls how much particles scatter from their lattice positions.
            </div>}
          </div>
          {/* B slider */}
          <div style={{ marginBottom: 6, position: 'relative' }}
            onMouseEnter={() => setHoveredSlider('B')} onMouseLeave={() => setHoveredSlider(null)}>
            <div style={{ ...labelRow, marginBottom: 4, fontSize: 9 }}>
              <span style={{ color: 'var(--blue)' }}>B</span>
              <span style={{ color: 'var(--blue)' }}>{bDisplay}</span>
            </div>
            <input type="range" min="0" max="200" step="1" defaultValue={initialB} onChange={onB} aria-label="Magnetic Field (B)" className="glass-input" style={{ ...rangeStyle, accentColor: 'var(--blue)', padding: 0 }} />
            {hoveredSlider === 'B' && <div style={tooltipStyle}>
              <strong>Larmor Field (B)</strong> &mdash; Magnetic field strength in microtesla. Controls nuclear spin precession speed &mdash; how fast the Posner molecule rotates. Earth&apos;s field is ~50&micro;T.
            </div>}
          </div>
          {/* Q slider */}
          <div style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredSlider('Q')} onMouseLeave={() => setHoveredSlider(null)}>
            <div style={{ ...labelRow, marginBottom: 4, fontSize: 9 }}>
              <span style={{ color: 'var(--amber)' }}>Q</span>
              <span style={{ color: 'var(--amber)' }}>{qDisplay}</span>
            </div>
            <input type="range" min="0.1" max="5.0" step="0.1" defaultValue={initialQ} onChange={onQ} aria-label="Coherence (Q)" className="glass-input" style={{ ...rangeStyle, accentColor: 'var(--amber)', padding: 0 }} />
            {hoveredSlider === 'Q' && <div style={tooltipStyle}>
              <strong>Fisher-Escol&agrave; Q</strong> &mdash; Quantum coherence probability. High Q = sharp crystalline structure. Low Q = diffuse probability cloud. Target Q &ge; 4.0 to unlock.
            </div>}
          </div>
          <div style={{ fontSize: 8, color: 'var(--neon-faint)', marginTop: 6 }}>
            H{'\u2192'}0.35 &middot; Q{'\u2192'}4.0
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setSlidersHidden(h => !h)}
        aria-label={slidersHidden ? 'Show controls' : 'Hide controls'}
        className="glass-btn"
        style={{
          position: 'absolute', bottom: 16, left: slidersHidden ? 16 : 'min(364px, calc(100% - 24px))',
          zIndex: 20, transition: 'left var(--trans-base)',
          background: 'rgba(0,0,0,0.6)', border: '1px solid var(--neon-ghost)',
          borderRadius: 'var(--radius-sm)', padding: '4px 10px',
          color: 'var(--dim)', fontFamily: "var(--font-data)",
          fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
          minHeight: 'auto'
        }}
      >
        {slidersHidden ? '\u25B6' : '\u25C0'}
      </button>

      {/* Live readout — bottom-right */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, pointerEvents: 'none', textAlign: 'right' }}>
        <div style={{ fontSize: 28, fontWeight: 300, color: 'var(--blue)', lineHeight: 1, letterSpacing: -1, fontFamily: "var(--font-data)", textShadow: '0 0 20px var(--neon-dim)' }}>
          {liveH}
        </div>
        <div style={{ fontSize: 8, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: 2, fontFamily: "var(--font-data)", textShadow: 'var(--glow-cyan)' }}>
          System Harmonic
        </div>
      </div>
    </div>
  );
}
