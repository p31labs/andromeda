import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSovereignStore } from '../store/useSovereignStore';
import { disposeThreeNode } from '../lib/threeUtils';
import { quantumVertexShader, quantumFragmentShader } from '../shaders/p31Shaders';
import { audioEngine } from '../lib/AudioEngine';

export const ImmersiveCockpitUI = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    // ── RENDERER ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x020502, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ── SCENE ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020502, 0.04);

    // ── CAMERA ── pulled back, looking at center
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 0, 0);

    // ── LIGHTS ──
    scene.add(new THREE.AmbientLight(0x112211, 0.8));
    const keyLight = new THREE.PointLight(0x39FF14, 3, 50);
    keyLight.position.set(0, 3, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x39FF14, 1.5, 30);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // ── GRID FLOOR ──
    const gridHelper = new THREE.GridHelper(60, 60, 0x0a3a0a, 0x051505);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    // ── PARTICLE FIELD ──
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 120;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x39FF14, size: 0.06, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(stars);

    // ── HUD RING ── floating holographic arc around the scene
    const hudCanvas = document.createElement('canvas');
    hudCanvas.width = 2048; hudCanvas.height = 512;
    const hudCtx = hudCanvas.getContext('2d')!;
    const hudTexture = new THREE.CanvasTexture(hudCanvas);
    hudTexture.minFilter = THREE.LinearFilter;

    const hudGeo = new THREE.CylinderGeometry(8, 8, 3, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8);
    const hudMat = new THREE.MeshBasicMaterial({
      map: hudTexture, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false
    });
    const hud = new THREE.Mesh(hudGeo, hudMat);
    hud.position.set(0, 1, -2);
    scene.add(hud);

    // ── SHADER MATERIAL ──
    const coreUniforms = {
      uTime: { value: 0 }, uCoherence: { value: 1.0 },
      uNoise: { value: 0.0 }, uOpacity: { value: 1.0 }
    };
    const p31Material = new THREE.ShaderMaterial({
      vertexShader: quantumVertexShader, fragmentShader: quantumFragmentShader,
      uniforms: coreUniforms, transparent: true, blending: THREE.AdditiveBlending
    });

    // ── ROOM ROUTER ──
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    let currentRoom: string | null = null;

    const rebuildRoom = (roomName: string) => {
      if (currentRoom === roomName) return;
      currentRoom = roomName;
      disposeThreeNode(roomGroup);

      switch (roomName) {
        case 'OBSERVATORY': {
          const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 4), p31Material);
          roomGroup.add(core);
          roomGroup.userData = { type: 'OBSERVATORY', core };
          break;
        }
        case 'COLLIDER': {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.06, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0x39FF14, wireframe: true })
          );
          ring.rotation.x = Math.PI / 2;
          const ledgerGroup = new THREE.Group();
          roomGroup.add(ring); roomGroup.add(ledgerGroup);
          roomGroup.userData = {
            type: 'COLLIDER', writeHead: ring, ledgerGroup,
            spinTimer: 0, lastVersion: useSovereignStore.getState().crdtVersion
          };
          break;
        }
        case 'BONDING': {
          const inner = new THREE.Mesh(new THREE.TetrahedronGeometry(1.5, 0), p31Material);
          const outer = new THREE.Mesh(
            new THREE.TetrahedronGeometry(2.5, 0),
            new THREE.MeshBasicMaterial({ color: 0x39FF14, wireframe: true, transparent: true, opacity: 0.4 })
          );
          roomGroup.add(inner); roomGroup.add(outer);
          roomGroup.userData = { type: 'BONDING', inner, outer };
          break;
        }
        case 'BRIDGE': {
          const gatewayMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.5 });
          const gateway = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), gatewayMat);
          const orbitGroup = new THREE.Group();
          roomGroup.add(gateway); roomGroup.add(orbitGroup);
          roomGroup.userData = {
            type: 'BRIDGE', gateway, gatewayMat, orbitGroup,
            renderedNodes: -1, wasConnected: false
          };
          break;
        }
        case 'BUFFER': {
          const breather = new THREE.Mesh(
            new THREE.TorusGeometry(2.5, 0.03, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0x39FF14, transparent: true, opacity: 0.2 })
          );
          roomGroup.add(breather);
          roomGroup.userData = { type: 'BUFFER', breather };
          break;
        }
      }
    };

    const unsubscribe = useSovereignStore.subscribe((state) => {
      if (state.activeRoom !== currentRoom && !state.isRoomTransitioning) {
        rebuildRoom(state.activeRoom);
      }
    });
    rebuildRoom(useSovereignStore.getState().activeRoom);

    // ── MOUSE ORBIT ──
    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ── HUD RENDERER ──
    const drawHUD = (state: ReturnType<typeof useSovereignStore.getState>) => {
      const w = hudCanvas.width, h = hudCanvas.height;
      hudCtx.clearRect(0, 0, w, h);

      // Background
      hudCtx.fillStyle = 'rgba(0, 5, 0, 0.6)';
      hudCtx.fillRect(0, 0, w, h);

      // Grid
      hudCtx.strokeStyle = 'rgba(57, 255, 20, 0.08)';
      hudCtx.lineWidth = 1;
      for (let x = 0; x < w; x += 64) { hudCtx.beginPath(); hudCtx.moveTo(x, 0); hudCtx.lineTo(x, h); hudCtx.stroke(); }
      for (let y = 0; y < h; y += 64) { hudCtx.beginPath(); hudCtx.moveTo(0, y); hudCtx.lineTo(w, y); hudCtx.stroke(); }

      hudCtx.shadowBlur = 8;
      const text = (s: string, x: number, y: number, size = 28, color = '#39FF14') => {
        hudCtx.shadowColor = color; hudCtx.fillStyle = color;
        hudCtx.font = `bold ${size}px monospace`; hudCtx.fillText(s, x, y);
      };

      // Title
      hudCtx.textAlign = 'center';
      text('P31 SOVEREIGN OS', w / 2, 60, 44);
      text(`[ ${state.activeRoom} ]`, w / 2, 100, 24, state.isRoomTransitioning ? '#FF3333' : '#39FF14');

      // Columns
      hudCtx.textAlign = 'left';

      // L3: Identity
      const c1 = 80;
      text('L3: IDENTITY', c1, 180, 26);
      text(`UCAN: ${state.ucanStatus}`, c1, 220, 18, state.didKey !== 'UNINITIALIZED' ? '#39FF14' : '#FF3333');
      text(state.didKey, c1, 255, 14, state.didKey !== 'UNINITIALIZED' ? '#39FF14' : '#444444');

      // L1: CRDT
      const c2 = 720;
      text('L1: CRDT', c2, 180, 26);
      text(`VERSION: v${state.crdtVersion}`, c2, 220, 18);
      if (state.telemetryHashes.length === 0) {
        text('[ NO DATA ]', c2, 255, 16, '#444444');
      } else {
        state.telemetryHashes.slice(0, 5).forEach((hash, i) => {
          hudCtx.globalAlpha = 1 - i * 0.2;
          text(`> ${hash}`, c2, 255 + i * 28, 14);
        });
        hudCtx.globalAlpha = 1;
      }

      // L2: Network
      const c3 = 1360;
      text('L2: NETWORK', c3, 180, 26);
      text(`BLE: ${state.bleStatus}`, c3, 220, 18, state.bleStatus.includes('CONNECTED') ? '#39FF14' : '#FFaa00');
      text(state.bleStatus.includes('CONNECTED') ? `LoRa: ${state.loraNodes} PEERS` : 'LoRa: OFFLINE', c3, 255, 18,
        state.bleStatus.includes('CONNECTED') ? '#39FF14' : '#444444');

      // Divider
      hudCtx.strokeStyle = '#39FF14'; hudCtx.lineWidth = 2;
      hudCtx.beginPath(); hudCtx.moveTo(80, 140); hudCtx.lineTo(w - 80, 140); hudCtx.stroke();

      hudCtx.shadowBlur = 0;
      hudTexture.needsUpdate = true;
    };

    // ── ANIMATION LOOP ──
    const clock = new THREE.Clock();
    let currentOpacity = 1.0;

    renderer.setAnimationLoop(() => {
      const time = clock.getElapsedTime();
      const state = useSovereignStore.getState();
      const ud = roomGroup.userData;

      // Camera orbit
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.03;
      camera.position.y += (2 + mouseY * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Transition opacity
      const targetOpacity = state.isRoomTransitioning ? 0.0 : 1.0;
      currentOpacity += (targetOpacity - currentOpacity) * 0.1;
      coreUniforms.uOpacity.value = currentOpacity;

      // Audio
      if (state.audioEnabled) {
        audioEngine.update(state.coherence, state.isRoomTransitioning, state.activeRoom);
      }

      // Stars rotation
      stars.rotation.y = time * 0.01;

      // Room animations
      if (ud.type === 'OBSERVATORY') {
        ud.core.rotation.y = time * 0.2;
        ud.core.rotation.x = time * 0.1;
      } else if (ud.type === 'BONDING') {
        if (state.didKey === 'UNINITIALIZED') {
          ud.inner.rotation.y = time * 0.5; ud.outer.rotation.y = time * -0.2;
          coreUniforms.uNoise.value = 0.0;
        } else if (state.isGeneratingIdentity) {
          ud.inner.rotation.y = time * 5; ud.outer.rotation.x = time * -5;
          coreUniforms.uNoise.value = 2.0;
        } else {
          ud.inner.rotation.copy(ud.outer.rotation);
          ud.inner.rotation.y = time * 0.2; ud.outer.rotation.y = time * 0.2;
          coreUniforms.uNoise.value = 0.05;
        }
      } else if (ud.type === 'BRIDGE') {
        const isConnected = state.bleStatus.includes('CONNECTED');
        ud.gatewayMat.color.setHex(isConnected ? 0x39FF14 : 0xff3333);
        ud.gatewayMat.opacity = isConnected ? 1.0 : 0.2 + Math.sin(time * 5) * 0.1;
        ud.gatewayMat.wireframe = !isConnected;
        if (state.loraNodes !== ud.renderedNodes || isConnected !== ud.wasConnected) {
          disposeThreeNode(ud.orbitGroup); ud.orbitGroup.clear();
          if (isConnected) {
            const lineGeo = new THREE.BufferGeometry(); const linePos: number[] = [];
            for (let i = 0; i < state.loraNodes; i++) {
              const angle = (i / state.loraNodes) * Math.PI * 2;
              const x = Math.cos(angle) * 4, z = Math.sin(angle) * 4, y = (Math.random() - 0.5);
              const node = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.25, 0),
                new THREE.MeshBasicMaterial({ color: 0x39FF14, wireframe: true })
              );
              node.position.set(x, y, z); ud.orbitGroup.add(node);
              linePos.push(0, 0, 0, x, y, z);
            }
            lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
            ud.orbitGroup.add(new THREE.LineSegments(lineGeo,
              new THREE.LineBasicMaterial({ color: 0x39FF14, transparent: true, opacity: 0.3 })));
          }
          ud.renderedNodes = state.loraNodes; ud.wasConnected = isConnected;
        }
        ud.orbitGroup.rotation.y = time * 0.2; ud.gateway.rotation.y = time * -0.5;
      } else if (ud.type === 'COLLIDER') {
        if (state.crdtVersion > ud.lastVersion) { ud.spinTimer = 0.5; ud.lastVersion = state.crdtVersion; }
        if (ud.spinTimer > 0) {
          ud.writeHead.rotation.z -= 0.5; ud.spinTimer -= 0.016;
          ud.writeHead.material.color.setHex(0xffffff);
        } else {
          ud.writeHead.rotation.z -= 0.01;
          ud.writeHead.material.color.setHex(0x39FF14);
        }
        if (state.telemetryHashes.length !== ud.ledgerGroup.children.length) {
          disposeThreeNode(ud.ledgerGroup); ud.ledgerGroup.clear();
          state.telemetryHashes.forEach((hash: string, i: number) => {
            const block = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.4, 6), p31Material);
            const seed = parseInt(hash.substring(0, 4), 16) || 0;
            block.rotation.y = seed; block.scale.setScalar(0.7 + (seed % 1000) / 3000);
            block.position.y = 1.5 - i * 0.7;
            ud.ledgerGroup.add(block);
          });
        }
        ud.ledgerGroup.rotation.y = time * 0.1;
      } else if (ud.type === 'BUFFER') {
        const scale = 1.15 + Math.sin(time * 0.5) * 0.35;
        ud.breather.scale.setScalar(scale);
        ud.breather.rotation.y = time * 0.05;
        ud.breather.rotation.x = time * 0.02;
      }

      // Uniforms
      coreUniforms.uTime.value = time;
      coreUniforms.uCoherence.value = THREE.MathUtils.lerp(coreUniforms.uCoherence.value, state.coherence, 0.1);
      coreUniforms.uNoise.value = THREE.MathUtils.lerp(coreUniforms.uNoise.value, state.noiseFloor, 0.1);

      // Key light pulses with coherence
      keyLight.intensity = 2 + state.coherence * 2;

      // HUD
      drawHUD(state);

      renderer.render(scene, camera);
    });

    return () => {
      unsubscribe();
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.remove();
      renderer.dispose(); scene.clear(); hudTexture.dispose();
      hud.geometry.dispose(); hudMat.dispose();
      disposeThreeNode(roomGroup); p31Material.dispose(); starGeo.dispose();
    };
  }, []);

  return (
    <>
      <div ref={mountRef} className="absolute inset-0 z-0" />
      {/* Subtle scanlines */}
      <div className="pointer-events-none absolute inset-0 z-20 opacity-30" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      }} />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-30 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
    </>
  );
};
