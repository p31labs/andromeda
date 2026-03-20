// SovereignRoom — The new Sovereign OS cockpit
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ── WebGL Engine Class ──
class PhenixEngine {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  controls: OrbitControls;
  clock: THREE.Clock;
  animId: number = 0;

  // Groups
  tetrixGroup = new THREE.Group();
  sicPovmVectors = new THREE.Group();
  blochGroup = new THREE.Group();
  ivmGroup = new THREE.Group();
  jitterbugGroup = new THREE.Group();
  dustSystem?: THREE.Points;
  mirror?: Reflector;

  // State
  currentDepth = 3;
  currentSeparation = 0.0;
  currentEntropy = 0;
  currentIvmSize = 6;
  isGamified = true;
  showEdges = true;
  showLabels = true;
  showBloch = true;
  time = 0;
  
  // Cinematic
  cinematicActive = false;
  cinematicStartTime = 0;
  
  // Jitterbug Data
  jNodes: { mesh: THREE.Mesh; isCore: boolean }[] = [];
  jEdges?: THREE.LineSegments;
  jEdgePos?: Float32Array;
  jEdgeCol?: Float32Array;

  // Camera Mode
  viewMode: 'observer' | 'operator' = 'observer';
  savedObserverPos = new THREE.Vector3(5, 4, 8);
  savedObserverTarget = new THREE.Vector3(0, 0, 0);
  operatorYaw = 0;
  operatorPitch = 0;
  isOperatorDragging = false;
  operatorDragStart = { x: 0, y: 0 };

  customUniforms = { uTime: { value: 0 }, uGamify: { value: 1.0 }, uEntropy: { value: 0.0 } };

  onLog: (msg: string, type: string) => void;
  onSyncState: (year: number, entropy: number, sep: number) => void;

  constructor(container: HTMLElement, onLog: (msg: string, type: string) => void, onSyncState: (y: number, e: number, s: number) => void) {
    this.container = container;
    this.onLog = onLog;
    this.onSyncState = onSyncState;
    this.clock = new THREE.Clock();

    const W = container.clientWidth;
    const H = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030308, 0.035);

    this.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    this.camera.position.copy(this.savedObserverPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 1.5, 0.4, 0.1);
    this.composer.addPass(this.bloomPass);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 60;

    this.scene.add(new THREE.AmbientLight(0x222244, 2));
    this.scene.add(new THREE.PointLight(0x00ffff, 5, 20));

    this.scene.add(this.tetrixGroup, this.sicPovmVectors, this.blochGroup, this.ivmGroup);

    this.initJitterbug();
    this.buildSierpinski(this.currentDepth);
    this.buildSICPOVM();
    this.buildBlochSphere();
    this.buildIVMLattice(this.currentIvmSize);
    this.buildDust();
    this.buildMirror();

    this.bindEvents();
    this.animate = this.animate.bind(this);
    this.animate();
    
    this.onLog("PHOSPHORUS-31 // PHENIX NAVIGATOR 4.0", "normal");
    this.onLog("ESTABLISHING ISOTROPIC VECTOR MATRIX...", "elec");
  }

  // Event Binding for FPP controls
  bindEvents() {
    const el = this.container;
    el.addEventListener('pointerdown', this.onPtrDown);
    window.addEventListener('pointermove', this.onPtrMove);
    window.addEventListener('pointerup', this.onPtrUp);
    
    // Touch events explicitly non-passive to allow preventDefault()
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
  }
  
  onPtrDown = (e: PointerEvent) => {
    if (this.viewMode !== 'operator') return;
    this.isOperatorDragging = true;
    this.operatorDragStart = { x: e.clientX, y: e.clientY };
  };
  
  onPtrMove = (e: PointerEvent) => {
    if (!this.isOperatorDragging || this.viewMode !== 'operator') return;
    const dx = e.clientX - this.operatorDragStart.x;
    const dy = e.clientY - this.operatorDragStart.y;
    this.operatorYaw -= dx * 0.003;
    this.operatorPitch += dy * 0.003;
    this.operatorDragStart = { x: e.clientX, y: e.clientY };
    this.updateOperatorCamera();
  };
  
  onPtrUp = () => { this.isOperatorDragging = false; };

  onTouchStart = (e: TouchEvent) => {
    if (this.viewMode !== 'operator' || e.touches.length !== 1) return;
    e.preventDefault(); // Stop double-tap zoom or pull-to-refresh
    this.isOperatorDragging = true;
    this.operatorDragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  onTouchMove = (e: TouchEvent) => {
    if (!this.isOperatorDragging || this.viewMode !== 'operator' || e.touches.length !== 1) return;
    e.preventDefault(); // Stop swipe-to-go-back and scrolling
    const dx = e.touches[0].clientX - this.operatorDragStart.x;
    const dy = e.touches[0].clientY - this.operatorDragStart.y;
    this.operatorYaw -= dx * 0.003;
    this.operatorPitch += dy * 0.003;
    this.operatorDragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    this.updateOperatorCamera();
  };

  onTouchEnd = () => { this.isOperatorDragging = false; };

  setMode(mode: 'observer' | 'operator') {
    this.viewMode = mode;
    if (mode === 'operator') {
      this.savedObserverPos.copy(this.camera.position);
      this.savedObserverTarget.copy(this.controls.target);
      this.controls.enabled = false;
      this.camera.position.set(0, 0, 0);
      this.camera.fov = 90;
      this.camera.near = 0.01;
      this.camera.updateProjectionMatrix();
      this.scene.fog = null;
      this.operatorYaw = 0;
      this.operatorPitch = 0;
      this.updateOperatorCamera();
      this.onLog("PERSPECTIVE INVERTED. YOU ARE INSIDE THE GEOMETRY.", "bio");
    } else {
      this.controls.enabled = true;
      this.camera.position.copy(this.savedObserverPos);
      this.controls.target.copy(this.savedObserverTarget);
      this.camera.fov = 45;
      this.camera.near = 0.1;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this.scene.fog = new THREE.FogExp2(0x030308, 0.035);
      this.onLog("PERSPECTIVE RESTORED. EXTERNAL OBSERVATION MODE.", "normal");
    }
  }

  updateOperatorCamera() {
    this.operatorPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.operatorPitch));
    const dir = new THREE.Vector3(
      Math.sin(this.operatorYaw) * Math.cos(this.operatorPitch),
      Math.sin(this.operatorPitch),
      Math.cos(this.operatorYaw) * Math.cos(this.operatorPitch)
    );
    this.camera.lookAt(dir);
  }

  setTimeline(year: number) {
    if (year < 2020) this.currentEntropy = 0;
    else if (year < 2024) this.currentEntropy = ((year - 2020) / 4) * 0.8;
    else this.currentEntropy = Math.max(0, 0.8 - ((year - 2024) / 2) * 0.8);
    
    if (year < 2024) this.currentSeparation = 0;
    else this.currentSeparation = ((year - 2024) / 2) * 1.5;

    this.customUniforms.uEntropy.value = this.currentEntropy;
    this.updateJitterbug(year);
    this.buildSierpinski(this.currentDepth);
    this.buildSICPOVM();
    this.onSyncState(year, this.currentEntropy, this.currentSeparation);
  }

  toggleCinematic() {
    this.cinematicActive = !this.cinematicActive;
    if (this.cinematicActive) {
      this.cinematicStartTime = this.time;
      if (this.viewMode !== 'operator') this.setMode('operator');
      this.onLog("CINEMATIC JOURNEY INITIATED.", "bio");
    } else {
      this.onLog("CINEMATIC HALTED. MANUAL CONTROL RESTORED.", "normal");
    }
  }

  // ── Geometry Builders (Ported from HTML) ──
  disposeGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0] as any;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      group.remove(child);
    }
  }

  injectShader(material: THREE.Material, isLine = false) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.customUniforms.uTime;
      shader.uniforms.uGamify = this.customUniforms.uGamify;
      shader.uniforms.uEntropy = this.customUniforms.uEntropy;
      shader.vertexShader = `varying vec3 vWorldPos;
` + shader.vertexShader.replace(
        `#include <begin_vertex>`, `#include <begin_vertex>
vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
      );
      const op = isLine ? '0.5' : '1.0'; const bop = isLine ? '0.2' : '1.0';
      shader.fragmentShader = `uniform float uTime; uniform float uGamify; uniform float uEntropy; varying vec3 vWorldPos;
        vec3 hsv2rgb(vec3 c){ vec4 K=vec4(1.,2./3.,1./3.,3.); vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www); return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y); }
      ` + shader.fragmentShader.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `vec4 diffuseColor = vec4( diffuse, opacity );
         if(uGamify>0.5){ float d=length(vWorldPos); float h=fract(d*0.05-uTime*0.3); vec3 cc=hsv2rgb(vec3(h,1.,1.)); vec3 fc=mix(vec3(1.,0.,0.3),vec3(1.,0.5,0.),fract(d*0.1-uTime)); cc=mix(cc,fc,uEntropy); diffuseColor=vec4(cc,opacity*${op}); }
         else{ vec3 bc=mix(vec3(0.26,0.26,0.53),vec3(1.,0.,0.3),uEntropy); diffuseColor=vec4(bc,opacity*${bop}); }`
      );
    };
  }

  buildSierpinski(depth: number) {
    this.disposeGroup(this.tetrixGroup);
    const r = 2;
    const t0 = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(r);
    const t1 = new THREE.Vector3(1, -1, -1).normalize().multiplyScalar(r);
    const t2 = new THREE.Vector3(-1, 1, -1).normalize().multiplyScalar(r);
    const t3 = new THREE.Vector3(-1, -1, 1).normalize().multiplyScalar(r);
    const domainVerts: number[][] = [[], [], [], []];
    const unifiedVerts: number[] = [];

    const collectLeaf = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3, di: number, off: THREE.Vector3) => {
      const o1=p1.clone().add(off),o2=p2.clone().add(off),o3=p3.clone().add(off),o4=p4.clone().add(off);
      const v=[o1.x,o1.y,o1.z,o2.x,o2.y,o2.z,o3.x,o3.y,o3.z,o1.x,o1.y,o1.z,o3.x,o3.y,o3.z,o4.x,o4.y,o4.z,o1.x,o1.y,o1.z,o4.x,o4.y,o4.z,o2.x,o2.y,o2.z,o2.x,o2.y,o2.z,o4.x,o4.y,o4.z,o3.x,o3.y,o3.z];
      if (di === -1 || this.currentSeparation === 0) unifiedVerts.push(...v); else domainVerts[di].push(...v);
    };

    const divide = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3, lvl: number, di: number, off: THREE.Vector3) => {
      if (lvl === 0) { collectLeaf(p1, p2, p3, p4, di, off); return; }
      const p12=new THREE.Vector3().addVectors(p1,p2).multiplyScalar(0.5),p13=new THREE.Vector3().addVectors(p1,p3).multiplyScalar(0.5),p14=new THREE.Vector3().addVectors(p1,p4).multiplyScalar(0.5),p23=new THREE.Vector3().addVectors(p2,p3).multiplyScalar(0.5),p24=new THREE.Vector3().addVectors(p2,p4).multiplyScalar(0.5),p34=new THREE.Vector3().addVectors(p3,p4).multiplyScalar(0.5);
      divide(p1,p12,p13,p14,lvl-1,di,off); divide(p12,p2,p23,p24,lvl-1,di,off); divide(p13,p23,p3,p34,lvl-1,di,off); divide(p14,p24,p34,p4,lvl-1,di,off);
    };

    if (depth === 0) { divide(t0, t1, t2, t3, 0, -1, new THREE.Vector3(0,0,0)); }
    else {
      const p12=new THREE.Vector3().addVectors(t0,t1).multiplyScalar(0.5),p13=new THREE.Vector3().addVectors(t0,t2).multiplyScalar(0.5),p14=new THREE.Vector3().addVectors(t0,t3).multiplyScalar(0.5),p23=new THREE.Vector3().addVectors(t1,t2).multiplyScalar(0.5),p24=new THREE.Vector3().addVectors(t1,t3).multiplyScalar(0.5),p34=new THREE.Vector3().addVectors(t2,t3).multiplyScalar(0.5);
      const s = this.currentSeparation;
      divide(t0,p12,p13,p14,depth-1,0,t0.clone().normalize().multiplyScalar(s));
      divide(p12,t1,p23,p24,depth-1,1,t1.clone().normalize().multiplyScalar(s));
      divide(p13,p23,t2,p34,depth-1,2,t2.clone().normalize().multiplyScalar(s));
      divide(p14,p24,p34,t3,depth-1,3,t3.clone().normalize().multiplyScalar(s));
    }

    const addMerged = (verts: number[], color: number) => {
      if (!verts.length) return;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const m = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
      m.userData.baseColor = new THREE.Color(color);
      this.tetrixGroup.add(new THREE.Mesh(g, m));
    };

    const DOMAIN_COLORS = [0x00ffff, 0xff0055, 0xffd700, 0xb026ff];
    if (unifiedVerts.length) addMerged(unifiedVerts, 0x00ffff);
    for (let i = 0; i < 4; i++) addMerged(domainVerts[i], DOMAIN_COLORS[i]);
  }

  buildSICPOVM() {
    this.disposeGroup(this.sicPovmVectors);
    const r = 2.4;
    const vectors = [new THREE.Vector3(1,1,1).normalize().multiplyScalar(r),new THREE.Vector3(1,-1,-1).normalize().multiplyScalar(r),new THREE.Vector3(-1,1,-1).normalize().multiplyScalar(r),new THREE.Vector3(-1,-1,1).normalize().multiplyScalar(r)];
    const DOMAIN_COLORS = [0x00ffff, 0xff0055, 0xffd700, 0xb026ff];
    const lv: number[] = [], lc: number[] = [];
    vectors.forEach((v, i) => {
      const end = v.clone().add(v.clone().normalize().multiplyScalar(this.currentSeparation));
      const tc = new THREE.Color(this.currentSeparation === 0 ? 0xffd700 : DOMAIN_COLORS[i]);
      lv.push(0,0,0, end.x, end.y, end.z); lc.push(tc.r, tc.g, tc.b, tc.r, tc.g, tc.b);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: tc.getHex() }));
      node.position.copy(end); this.sicPovmVectors.add(node);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    this.sicPovmVectors.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 })));
  }

  buildBlochSphere() {
    this.disposeGroup(this.blochGroup);
    if (!this.showBloch) return;
    const r = 2.4;
    this.blochGroup.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 32), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false })));
    const em = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
    this.injectShader(em, true);
    this.blochGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(r, 16, 8)), em));
  }

  buildIVMLattice(extent: number) {
    this.disposeGroup(this.ivmGroup);
    const scale = 1.5; const positions: number[] = []; const pointSet = new Set<string>();
    for (let x = -extent; x <= extent; x++) for (let y = -extent; y <= extent; y++) for (let z = -extent; z <= extent; z++) {
      if (x * x + y * y + z * z > extent * extent) continue;
      if ((x + y + z) % 2 === 0) { positions.push(x, y, z); pointSet.add(`${x},${y},${z}`); }
    }
    const nc = positions.length / 3;
    const nm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    this.injectShader(nm, false);
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 8), nm, nc);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < nc; i++) {
      dummy.position.set(positions[i * 3] * scale, positions[i * 3 + 1] * scale, positions[i * 3 + 2] * scale);
      dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    }
    this.ivmGroup.add(inst);
    if (this.showEdges) {
      const lv: number[] = []; const offsets = [[1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1], [0, 1, 1], [0, 1, -1]];
      for (let i = 0; i < nc; i++) {
        const px = positions[i * 3], py = positions[i * 3 + 1], pz = positions[i * 3 + 2];
        for (const o of offsets) {
          const nx = px + o[0], ny = py + o[1], nz = pz + o[2];
          if (pointSet.has(`${nx},${ny},${nz}`)) lv.push(px * scale, py * scale, pz * scale, nx * scale, ny * scale, nz * scale);
        }
      }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
      const lm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
      this.injectShader(lm, true); this.ivmGroup.add(new THREE.LineSegments(lg, lm));
    }
  }

  buildDust() {
    const n = 2000, pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 40;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustSystem = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x00ffff, size: 0.05, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dustSystem);
  }

  buildMirror() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.mirror = new Reflector(new THREE.PlaneGeometry(150, 150), { clipBias: 0.003, textureWidth: window.innerWidth * dpr, textureHeight: window.innerHeight * dpr, color: 0x050510 });
    this.mirror.position.y = -4; this.mirror.rotation.x = -Math.PI / 2; this.scene.add(this.mirror);
  }

  initJitterbug() {
    const nm = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true });
    const jg = new THREE.SphereGeometry(0.08, 16, 16);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(jg, nm.clone());
      this.jitterbugGroup.add(m); this.jNodes.push({ mesh: m, isCore: i < 4 });
    }
    this.jEdgePos = new Float32Array(66 * 6); this.jEdgeCol = new Float32Array(66 * 6);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(this.jEdgePos, 3));
    eg.setAttribute('color', new THREE.BufferAttribute(this.jEdgeCol, 3));
    this.jEdges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    this.jitterbugGroup.add(this.jEdges); this.scene.add(this.jitterbugGroup);
  }

  updateJitterbug(year: number) {
    const progress = Math.max(0, Math.min(1, (year - 2009) / 17));
    let phase = 0, lerp = 0, scale = 0.6, heat = 0;
    if (progress < 0.3) { phase = 0; lerp = 0; }
    else if (progress < 0.7) { phase = 0; lerp = (progress - 0.3) / 0.4; heat = lerp; scale = 0.6 - lerp * 0.15; }
    else if (progress < 0.95) { phase = 1; lerp = (progress - 0.7) / 0.25; heat = 1 - lerp; scale = 0.45 - lerp * 0.15; }
    else { phase = 2; lerp = 1; scale = 0.3; heat = 0; }

    const C = 1 / Math.sqrt(2), T = 1 / Math.sqrt(3);
    const coords = {
      cubo: [new THREE.Vector3(C,C,0), new THREE.Vector3(C,-C,0), new THREE.Vector3(-C,C,0), new THREE.Vector3(-C,-C,0), new THREE.Vector3(C,0,C), new THREE.Vector3(C,0,-C), new THREE.Vector3(-C,0,C), new THREE.Vector3(-C,0,-C), new THREE.Vector3(0,C,C), new THREE.Vector3(0,C,-C), new THREE.Vector3(0,-C,C), new THREE.Vector3(0,-C,-C)],
      octa: [new THREE.Vector3(1,0,0), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,1,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1)],
      tetra: [new THREE.Vector3(T,T,T), new THREE.Vector3(T,-T,-T), new THREE.Vector3(-T,T,-T), new THREE.Vector3(-T,-T,T), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]
    };
    
    const tmp = new THREE.Vector3();
    const cTmp = new THREE.Color();
    const cTmpB = new THREE.Color();

    for (let i = 0; i < 12; i++) {
      if (phase === 0) tmp.lerpVectors(coords.cubo[i], coords.octa[i], lerp);
      else if (phase === 1) tmp.lerpVectors(coords.octa[i], coords.tetra[i], lerp);
      else tmp.copy(coords.tetra[i]);
      tmp.multiplyScalar(scale);
      if (heat > 0) { tmp.x += (Math.random() - 0.5) * 0.3 * heat; tmp.y += (Math.random() - 0.5) * 0.3 * heat; tmp.z += (Math.random() - 0.5) * 0.3 * heat; }
      this.jNodes[i].mesh.position.copy(tmp);
      const mat = this.jNodes[i].mesh.material as THREE.MeshBasicMaterial;
      if (progress < 0.7) { mat.opacity = 1; mat.color.setHex(0xffd700); }
      else if (progress < 0.95) { 
        if (this.jNodes[i].isCore) this.jNodes[i].mesh.scale.setScalar(1 + lerp * 0.5); 
        else { mat.color.setHex(0xff0055); mat.opacity = 1 - lerp; } 
      }
      else { mat.opacity = this.jNodes[i].isCore ? 1 : 0; if (this.jNodes[i].isCore) mat.color.setHex(0xffffff); }
    }

    let idx = 0;
    if (this.jEdgePos && this.jEdgeCol && this.jEdges) {
      for (let i = 0; i < 12; i++) {
        if ((this.jNodes[i].mesh.material as THREE.MeshBasicMaterial).opacity < 0.1) continue;
        for (let j = i + 1; j < 12; j++) {
          if ((this.jNodes[j].mesh.material as THREE.MeshBasicMaterial).opacity < 0.1) continue;
          const d = this.jNodes[i].mesh.position.distanceTo(this.jNodes[j].mesh.position);
          if (d > 0.05 && d < scale * 1.6) {
            const s = idx * 6;
            this.jEdgePos[s]=this.jNodes[i].mesh.position.x; this.jEdgePos[s+1]=this.jNodes[i].mesh.position.y; this.jEdgePos[s+2]=this.jNodes[i].mesh.position.z;
            this.jEdgePos[s+3]=this.jNodes[j].mesh.position.x; this.jEdgePos[s+4]=this.jNodes[j].mesh.position.y; this.jEdgePos[s+5]=this.jNodes[j].mesh.position.z;
            if (heat > 0) cTmp.set(0xffd700).lerp(cTmpB.set(0xff0055), heat); else cTmp.setHex(progress >= 0.95 ? 0xffffff : 0xffd700);
            this.jEdgeCol[s]=cTmp.r; this.jEdgeCol[s+1]=cTmp.g; this.jEdgeCol[s+2]=cTmp.b;
            this.jEdgeCol[s+3]=cTmp.r; this.jEdgeCol[s+4]=cTmp.g; this.jEdgeCol[s+5]=cTmp.b;
            idx++;
          }
        }
      }
      for (let i = idx * 6; i < 66 * 6; i++) { this.jEdgePos[i] = 0; this.jEdgeCol[i] = 0; }
      this.jEdges.geometry.attributes.position.needsUpdate = true;
      this.jEdges.geometry.attributes.color.needsUpdate = true;
    }
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.time += delta;
    this.customUniforms.uTime.value = this.time;

    if (this.cinematicActive) {
      const elapsed = this.time - this.cinematicStartTime;
      const progress = Math.min(elapsed / 30, 1.0);
      const year = 2009 + progress * 17;
      this.setTimeline(year);
      this.operatorYaw += 0.002;
      this.operatorPitch = Math.sin(elapsed * 0.15) * 0.3;
      if (progress >= 1.0) this.toggleCinematic();
    }

    const sm = this.currentEntropy > 0.6 ? 3 : 1;
    const hb = 1 + 0.04 * Math.sin(this.time * sm * Math.PI * 2);
    this.tetrixGroup.scale.setScalar(hb); this.sicPovmVectors.scale.setScalar(hb); this.blochGroup.scale.setScalar(hb); this.jitterbugGroup.scale.setScalar(hb);

    const dr = delta / 0.016;
    this.tetrixGroup.rotation.y += 0.003 * dr; this.tetrixGroup.rotation.x += 0.001 * dr;
    this.sicPovmVectors.rotation.copy(this.tetrixGroup.rotation); this.blochGroup.rotation.copy(this.tetrixGroup.rotation); this.jitterbugGroup.rotation.copy(this.tetrixGroup.rotation);
    this.ivmGroup.rotation.y -= 0.0005 * dr;
    if (this.dustSystem) { this.dustSystem.rotation.y += 0.001 * dr; this.dustSystem.rotation.z += 0.0005 * dr; }

    if (this.currentEntropy > 0) {
      const j = (Math.random() - 0.5) * this.currentEntropy * 0.15;
      this.tetrixGroup.rotation.y += j; this.tetrixGroup.rotation.z += j;
      const cTmp = new THREE.Color();
      for (const child of this.tetrixGroup.children) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.wireframe) {
          const base = mat.userData.baseColor || new THREE.Color(0x00ffff);
          cTmp.copy(base).lerp(new THREE.Color(0xff0055), this.currentEntropy);
          mat.color.copy(cTmp); mat.opacity = 0.8 - (Math.random() * 0.5 * this.currentEntropy);
        }
      }
    }

    if (this.viewMode === 'operator') {
      this.camera.position.set(0, 0, 0);
      if (!this.cinematicActive) this.updateOperatorCamera();
    } else {
      this.controls.update();
    }

    this.composer.render();
  }

  dispose() {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
    this.composer.dispose();
    window.removeEventListener('pointermove', this.onPtrMove);
    window.removeEventListener('pointerup', this.onPtrUp);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    // Note: Assuming disposeHierarchy is called via your central utils elsewhere
  }
}

// ── React Component ──
export function SovereignRoom() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhenixEngine | null>(null);
  
  // States to mimic HTML UI
  const [viewMode, setViewMode] = useState<'observer' | 'operator'>('observer');
  const [hudVisible, setHudVisible] = useState(true);
  const [timeline, setTimeline] = useState(2009.0);
  const [entropy, setEntropy] = useState(0.0);
  const [sep, setSep] = useState(0.0);
  const [logs, setLogs] = useState<{msg: string, type: string, id: number}[]>([]);
  
  const addLog = useCallback((msg: string, type = 'normal') => {
    setLogs(prev => [...prev.slice(-5), { msg: `[${new Date().toISOString().substring(11, 23)}] ${msg}`, type, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    // 1. Lock the viewport to prevent mobile gestures
    const origOverflow = document.body.style.overflow;
    const origTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    if (!mountRef.current) return;
    const engine = new PhenixEngine(mountRef.current, addLog, (y, e, s) => {
      setTimeline(y); setEntropy(e); setSep(s);
    });
    engineRef.current = engine;

    const handleResize = () => engine.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);

    return () => {
      // 2. Clean up locks and engine
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouchAction;
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [addLog]);

  const handleTimelineChange = (v: number) => {
    setTimeline(v);
    engineRef.current?.setTimeline(v);
  };

  const handleModeToggle = () => {
    const newMode = viewMode === 'observer' ? 'operator' : 'observer';
    setViewMode(newMode);
    engineRef.current?.setMode(newMode);
  };

  // Extract variables for display logic
  const isFault = entropy > 0.6;
  const sysState = isFault ? 'FLOATING NEUTRAL FAULT!' : 'SYNTROPIC COHERENCE';
  const stateColor = isFault ? 'var(--coral)' : 'var(--cyan)';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--void)' }}>
      {/* 3D Canvas */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none', zIndex: 5, opacity: 0.3 }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 150px rgba(0,0,0,0.9)', pointerEvents: 'none', zIndex: 6 }} />
      {viewMode === 'operator' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 30, height: 30, zIndex: 8, pointerEvents: 'none', opacity: 0.4 }}>
          <div style={{ position: 'absolute', width: 1, height: '100%', left: '50%', top: 0, background: 'var(--cyan)' }} />
          <div style={{ position: 'absolute', height: 1, width: '100%', top: '50%', left: 0, background: 'var(--cyan)' }} />
        </div>
      )}

      {/* Top Bar Buttons */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, display: 'flex', gap: 10, fontFamily: 'var(--font-data)', fontSize: '0.8rem' }}>
        <button className="glass-btn" onClick={() => engineRef.current?.toggleCinematic()} style={{ color: 'var(--lavender)', borderColor: 'var(--lavender)' }}>
          [ CINEMATIC JOURNEY ]
        </button>
        <button className="glass-btn" onClick={handleModeToggle} style={{ color: viewMode === 'operator' ? 'var(--coral)' : 'var(--mint)', borderColor: viewMode === 'operator' ? 'var(--coral)' : 'var(--mint)' }}>
          [ VIEW: {viewMode.toUpperCase()} ]
        </button>
        <button className="glass-btn" onClick={() => setHudVisible(!hudVisible)} style={{ color: 'var(--cyan)' }}>
          [ {hudVisible ? 'DISABLE' : 'ENABLE'} HUD ]
        </button>
      </div>

      {/* Mode Indicator */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, zIndex: 10,
        fontSize: '0.7rem', letterSpacing: 3, textTransform: 'uppercase',
        padding: '8px 16px', borderRadius: 'var(--radius-md)',
        background: 'var(--panel)', backdropFilter: 'blur(8px)',
        color: viewMode === 'observer' ? 'var(--cyan)' : 'var(--amber)',
        border: `1px solid ${viewMode === 'observer' ? 'rgba(0,255,255,0.3)' : 'rgba(255,215,0,0.3)'}`
      }}>
        {viewMode === 'observer' ? 'OBSERVER // LOOKING IN' : 'OPERATOR // LOOKING OUT'}
      </div>

      {/* HUD Layer */}
      <div style={{ opacity: hudVisible ? 1 : 0, transition: 'opacity 0.4s', pointerEvents: hudVisible ? 'auto' : 'none' }}>
        
        {/* Left Panels */}
        <div style={{
          position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 15,
          zIndex: 10, width: 340, fontFamily: 'var(--font-data)'
        }}>
          <div className="glass-card" style={{ padding: 20, background: 'var(--s2)' }}>
            <h1 style={{ fontSize: '1.3rem', margin: '0 0 5px 0', color: 'var(--cyan)', textShadow: '0 0 10px var(--cyan)', letterSpacing: 3 }}>Phenix Navigator</h1>
            <h2 style={{ fontSize: '0.8rem', margin: '0 0 15px 0', color: 'var(--amber)', letterSpacing: 1 }}>phosphorus31.org // Spatial Dashboard</h2>
            
            <div style={{ fontSize: '0.8rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 5, margin: '15px 0', letterSpacing: 2 }}>SYSTEMS TOPOLOGY</div>
            
            <div style={{ marginBottom: 25, borderBottom: '1px dashed rgba(0,255,255,0.3)', paddingBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, color: 'var(--amber)' }}>
                <span>THE GEODESIC LIFECYCLE</span><span>{timeline.toFixed(1)}</span>
              </div>
              <input type="range" min="2009" max="2026" step="0.1" value={timeline} onChange={e => handleTimelineChange(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--amber)' }} />
            </div>

            <div style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, color: 'var(--text)' }}>
                <span>Domain Separation</span><span>{sep.toFixed(1)}</span>
              </div>
              <div style={{ height: 4, background: 'var(--neon-faint)' }}><div style={{ width: `${(sep/4)*100}%`, height: '100%', background: 'var(--cyan)' }}/></div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, color: isFault ? 'var(--coral)' : 'var(--text)' }}>
                <span>System Entropy</span><span>{entropy.toFixed(2)}</span>
              </div>
              <div style={{ height: 4, background: 'var(--neon-faint)' }}><div style={{ width: `${entropy*100}%`, height: '100%', background: isFault ? 'var(--coral)' : 'var(--cyan)' }}/></div>
            </div>

            <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 20, borderTop: '1px solid rgba(0,255,255,0.2)', paddingTop: 15, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SYS_STATE:</span> <span style={{ color: stateColor }}>{sysState}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,255,255,0.3)', marginTop: 8, paddingTop: 8 }}>
                <span>RIGIDITY (E=3V-6):</span> <span style={{ color: timeline >= 2026 ? '#00ff00' : isFault ? 'var(--coral)' : 'var(--cyan)' }}>
                  {timeline >= 2026 ? 'V=4, E=6 (ISOSTATIC K4)' : isFault ? 'KINEMATIC FAILURE' : 'V=12, E=24 (FRAGILE)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal */}
        <div className="glass-card" style={{
          position: 'absolute', bottom: 20, right: 20, width: 450,
          background: 'var(--s2)', padding: 15, zIndex: 10,
          fontFamily: 'var(--font-data)'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#fff', borderBottom: '1px dashed rgba(255,255,255,0.3)', paddingBottom: 5, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span>&gt; LIVE SYSTEM TELEMETRY</span>
            <span style={{ color: 'var(--amber)' }}>RX: OK</span>
          </div>
          <div style={{ height: 120, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {logs.map(log => (
              <div key={log.id} style={{
                fontSize: '0.75rem', margin: '2px 0', lineHeight: 1.3,
                color: log.type === 'fault' ? 'var(--coral)' : log.type === 'bio' ? 'var(--lavender)' : log.type === 'elec' ? 'var(--amber)' : 'var(--cyan)'
              }}>
                {log.msg}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
