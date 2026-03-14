import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useSovereignStore } from '../../../sovereign/useSovereignStore';

export interface OrbitState {
  rx: number; ry: number;
  trx: number; try_: number;
  tDist: number;
  flyFrom: { rx: number; ry: number; dist: number } | null;
  flyTo: { rx: number; ry: number; dist: number } | null;
  flyT: number;
}

// Module-scope scratch objects — reused every frame, never GC'd
const _origin = new THREE.Vector3(0, 0, 0);
const _defaultCam = new THREE.Vector3(6, 4, 10);
const _scratch = new THREE.Vector3();
const _colA = new THREE.Color();
const _colB = new THREE.Color();

export function ImmersiveCockpitUI({ isIdle }: { isIdle?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const ptrState = useRef({ isDragging: false, prevX: 0, prevY: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030308, 0.035);

    // 0.01 Near Clipping is critical for Godhead inside-out perspective
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.rotation.order = 'YXZ'; 
    camera.position.set(6, 4, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.1);
    composer.addPass(bloomPass);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0x222244, 2));
    scene.add(new THREE.PointLight(0x00ffff, 5, 20));

    // --- IVM LATTICE (INSTANCED MESH) ---
    const ivmPositions: THREE.Vector3[] = [];
    for (let x = -6; x <= 6; x++) {
      for (let y = -6; y <= 6; y++) {
        for (let z = -6; z <= 6; z++) {
          if ((x + y + z) % 2 === 0) ivmPositions.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    
    const ivmGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const ivmMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    
    // Inject Chromatic Shaders
    ivmMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uEntropy = { value: 0 };
      shader.vertexShader = `varying vec3 vWorldPos;\n` + shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>\nvWorldPos = (instanceMatrix * vec4(position, 1.0)).xyz;`
      );
      shader.fragmentShader = `
        uniform float uTime;
        uniform float uEntropy;
        varying vec3 vWorldPos;
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
      ` + shader.fragmentShader.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float dist = length(vWorldPos);
        vec3 cyberColor = hsv2rgb(vec3(fract(dist * 0.05 - uTime * 0.3), 1.0, 1.0));
        vec3 faultColor = mix(vec3(1.0, 0.0, 0.3), vec3(1.0, 0.5, 0.0), fract(dist*0.1 - uTime));
        vec3 finalColor = mix(cyberColor, faultColor, uEntropy);
        vec4 diffuseColor = vec4(finalColor, opacity);
        `
      );
    };

    const ivmInstanced = new THREE.InstancedMesh(ivmGeo, ivmMat, ivmPositions.length);
    const dummy = new THREE.Object3D();
    ivmPositions.forEach((pos, i) => {
      dummy.position.copy(pos).multiplyScalar(1.5);
      dummy.updateMatrix();
      ivmInstanced.setMatrixAt(i, dummy.matrix);
    });
    scene.add(ivmInstanced);

    // --- JITTERBUG CORE ---
    const C = 1/Math.sqrt(2); const T = 1/Math.sqrt(3);
    const COORDS = {
      cubo: [new THREE.Vector3(C,C,0), new THREE.Vector3(C,-C,0), new THREE.Vector3(-C,C,0), new THREE.Vector3(-C,-C,0), new THREE.Vector3(C,0,C), new THREE.Vector3(C,0,-C), new THREE.Vector3(-C,0,C), new THREE.Vector3(-C,0,-C), new THREE.Vector3(0,C,C), new THREE.Vector3(0,C,-C), new THREE.Vector3(0,-C,C), new THREE.Vector3(0,-C,-C)],
      octa: [new THREE.Vector3(1,0,0), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,1,0), new THREE.Vector3(-1,0,0), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1)],
      tetra: [new THREE.Vector3(T,T,T), new THREE.Vector3(T,-T,-T), new THREE.Vector3(-T,T,-T), new THREE.Vector3(-T,-T,T), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]
    };

    const jGroup = new THREE.Group();
    const jNodes: {mesh: THREE.Mesh, isCore: boolean}[] = [];
    const jMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
    for(let i=0; i<12; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), jMat.clone());
        jGroup.add(m); jNodes.push({mesh:m, isCore: i<4});
    }

    const jEdgeGeo = new THREE.BufferGeometry();
    const jEPos = new Float32Array(66*6);
    const jECol = new Float32Array(66*6);
    jEdgeGeo.setAttribute('position', new THREE.BufferAttribute(jEPos, 3));
    jEdgeGeo.setAttribute('color', new THREE.BufferAttribute(jECol, 3));
    const jEdges = new THREE.LineSegments(jEdgeGeo, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.8, blending:THREE.AdditiveBlending }));
    jGroup.add(jEdges);
    scene.add(jGroup);

    // --- GODHEAD PANORAMIC CONTROLS ---
    const dom = renderer.domElement;
    const handleStart = (e: PointerEvent) => { ptrState.current.isDragging = true; ptrState.current.prevX = e.clientX; ptrState.current.prevY = e.clientY; };
    const handleMove = (e: PointerEvent) => {
      if (!ptrState.current.isDragging || useSovereignStore.getState().viewPerspective !== 'GODHEAD') return;
      camera.rotation.y -= (e.clientX - ptrState.current.prevX) * 0.005;
      camera.rotation.x -= (e.clientY - ptrState.current.prevY) * 0.005;
      camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
      ptrState.current.prevX = e.clientX; ptrState.current.prevY = e.clientY;
    };
    const handleEnd = () => { ptrState.current.isDragging = false; };

    dom.addEventListener('pointerdown', handleStart);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const state = useSovereignStore.getState();
      
      // Graceful degradation on idle
      timeRef.current += isIdle ? 0.008 : 0.016; 
      const t = timeRef.current;
      const entropy = 0.5; // Default entropy value

      if (ivmInstanced.material instanceof THREE.Material && (ivmInstanced.material as any).uniforms) {
        (ivmInstanced.material as any).uniforms.uTime.value = t;
        (ivmInstanced.material as any).uniforms.uEntropy.value = entropy;
      }

      // Camera Mode Lerping
      if (state.viewPerspective === 'GODHEAD') {
        controls.enabled = false;
        camera.position.lerp(_origin, 0.1);
      } else {
        controls.enabled = true;
        camera.position.lerp(_defaultCam, 0.05);
        controls.update();
      }

      // Jitterbug Kinematics
      const prog = Math.max(0, Math.min(1, ((2026 - 2009) / 17))); // Default to current year
      let phase=0, lerp=0, scale=0.6, heat=0;
      if(prog<0.3) { phase=0; lerp=0; }
      else if(prog<0.7) { phase=0; lerp=(prog-0.3)/0.4; heat=lerp; scale=0.6-lerp*0.15; }
      else if(prog<0.95) { phase=1; lerp=(prog-0.7)/0.25; heat=1-lerp; scale=0.45-lerp*0.15; }
      else { phase=2; lerp=1; scale=0.3; }

      const sep = 0; // Default domain separation

      jNodes.forEach((n, i) => {
        _scratch.set(0, 0, 0);
        if(phase===0) _scratch.lerpVectors(COORDS.cubo[i], COORDS.octa[i], lerp);
        else if(phase===1) _scratch.lerpVectors(COORDS.octa[i], COORDS.tetra[i], lerp);
        else _scratch.copy(COORDS.tetra[i]);
        _scratch.multiplyScalar(scale * (1 + sep * 0.5));

        if(heat>0) {
          _scratch.x += (Math.random()-0.5)*0.2*heat;
          _scratch.y += (Math.random()-0.5)*0.2*heat;
          _scratch.z += (Math.random()-0.5)*0.2*heat;
        }
        n.mesh.position.copy(_scratch);
        
        if(prog<0.7) { 
          (n.mesh.material as THREE.MeshBasicMaterial).opacity = 1; 
          (n.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xffd700); 
        }
        else if(prog<0.95) { 
          if(n.isCore) n.mesh.scale.setScalar(1+lerp*0.5); 
          else { 
            (n.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0055); 
            (n.mesh.material as THREE.MeshBasicMaterial).opacity = 1-lerp; 
          }
        }
        else { 
          (n.mesh.material as THREE.MeshBasicMaterial).opacity = n.isCore ? 1 : 0; 
          if(n.isCore) (n.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff); 
        }
      });

      let idx=0;
      for(let i=0; i<12; i++) {
        if((jNodes[i].mesh.material as THREE.MeshBasicMaterial).opacity<0.1) continue;
        for(let j=i+1; j<12; j++) {
            if((jNodes[j].mesh.material as THREE.MeshBasicMaterial).opacity<0.1) continue;
            const d = jNodes[i].mesh.position.distanceTo(jNodes[j].mesh.position);
            if(d>0.05 && d<scale*1.8 * (1 + sep * 0.5)) {
                jEPos.set([...jNodes[i].mesh.position.toArray(), ...jNodes[j].mesh.position.toArray()], idx*6);
                const col = heat>0 ? _colA.set(0xffd700).lerp(_colB.set(0xff0055), heat) : _colA.set(prog>=0.95?0xffffff:0xffd700);
                jECol.set([...col.toArray(), ...col.toArray()], idx*6); idx++;
            }
        }
      }
      for(let i=idx*6; i<66*6; i++) { jEPos[i]=0; jECol[i]=0; }
      jEdges.geometry.attributes.position.needsUpdate = true; jEdges.geometry.attributes.color.needsUpdate = true;

      jGroup.rotation.y += 0.005;
      ivmInstanced.rotation.y -= 0.001;
      
      if (entropy > 0) {
        const j = (Math.random()-0.5)*entropy*0.1;
        jGroup.rotation.z += j;
      }

      composer.render();
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      dom.removeEventListener('pointerdown', handleStart);
      cancelAnimationFrame(animationId);
      ivmGeo.dispose(); ivmMat.dispose(); jEdgeGeo.dispose(); jMat.dispose();
      renderer.dispose(); mountRef.current?.removeChild(renderer.domElement);
    };
  }, [isIdle]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: 'crosshair', background: '#030308' }} />;
}