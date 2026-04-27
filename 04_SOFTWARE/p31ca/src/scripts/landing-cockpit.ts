import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildGeoThree } from "../lib/dome/icosphere-to-three";
import { trimHzFromKnob, breathInhaleHz, breathExhaleHz } from "../lib/dome/p31-dome-constants";
import {
  TELEMETRY_URLS,
  fetchWithCache,
  formatTrimHz,
  readDomePerfLite,
} from "../lib/dome/cockpit-shared";
import {
  makeHubFaceMaterial,
  makeHubInnerShellMaterial,
} from "../lib/dome/three-dome-materials";
import {
  fetchPersonalMeshForHud,
  formatMeshHudLine,
} from "../lib/mesh/mesh-snapshot";

function landingMain() {

// ================================================================
// 1. TELEMETRY & HUD STATE
// ================================================================
const $ = (id) => document.getElementById(id);

let currentSpoons = 10;
const MAX_SPOONS = 20;

  const domePerfLite = readDomePerfLite();

const updateTelemetry = async () => {
  // Q-Factor
  const qData = await fetchWithCache(TELEMETRY_URLS.qFactor, "p31_cache_qfactor", { score: 0.925, vertexHealth: { A:1, B:1, C:1, D:1 } });
  if (qData && qData.score) {
    const score = qData.score.toFixed(3);
    const isOpt = qData.score >= 0.9, isStab = qData.score >= 0.7;
    const colorClass = isOpt ? 'text-[#3ba372]' : isStab ? 'text-[#cda852]' : 'text-[#E8636F]';
    const bgClass = isOpt ? 'bg-[#3ba372]' : isStab ? 'bg-[#cda852]' : 'bg-[#E8636F]';
    
    const nq = $('nav-q-factor'), nd = $('nav-status-dot');
    if (nq) { nq.innerText = score; nq.className = `font-bold tracking-wider ${colorClass}`; }
    if (nd) { nd.className = `w-2 h-2 rounded-full animate-pulse ${bgClass}`; nd.style.boxShadow = `0 0 8px ${isOpt?'#3ba372':isStab?'#cda852':'#E8636F'}`; }
    
    const activeVerts = Object.values(qData.vertexHealth || {}).filter(v => v > 0).length;
    if ($('nav-fleet-val')) $('nav-fleet-val').innerText = `${activeVerts}/4`;
  }

  // LOVE
  const loveData = await fetchWithCache(TELEMETRY_URLS.love, "p31_cache_love", { availableBalance: 3.28 });
  const lv = loveData?.availableBalance ?? loveData?.balance;
  const loveEl = $('nav-love-val');
  if (typeof lv === "number" && Number.isFinite(lv) && loveEl) {
    loveEl.textContent = lv.toFixed(2);
  }

  // Spoons
  const spoonData = await fetchWithCache(TELEMETRY_URLS.spoons, "p31_cache_spoons", { spoons: 10 });
  if (spoonData.spoons !== undefined) {
    currentSpoons = spoonData.spoons;
    if ($('nav-spoon-val')) $('nav-spoon-val').innerText = currentSpoons;
    if ($('nav-spoon-fill')) $('nav-spoon-fill').style.width = `${(currentSpoons/MAX_SPOONS)*100}%`;
  }

  await refreshMeshHud();
};

async function refreshMeshHud() {
  const meshP = await fetchPersonalMeshForHud();
  const { vit, love, detail } = formatMeshHudLine(meshP);
  const vEl = $("nav-mesh-vit");
  const lEl = $("nav-mesh-ve");
  const dEl = $("nav-mesh-detail");
  if (vEl) vEl.textContent = vit;
  if (lEl) lEl.textContent = love;
  if (dEl) {
    dEl.textContent = detail || "";
    dEl.setAttribute("title", detail || "");
  }
}

setInterval(updateTelemetry, 60000);
setInterval(() => {
  void refreshMeshHud();
}, 30000);
updateTelemetry();

// ================================================================
// 2. EDE TRIMTAB & LAYER 0 (Somatic Mode)
// ================================================================
const $trimCanvas = $('trimtab-canvas');
const $trimFreq = $('trimtab-freq');
let trimValue = 1.0; 
let trimOn = false;
let trimAudioCtx = null, trimOsc = null, trimGain = null;
let _trimIsDown = false, _trimAngle = null;

function trimFreq() { return trimHzFromKnob(trimValue); }

function drawTrimtab() {
  if (!$trimCanvas) return;
  const ctx = $trimCanvas.getContext('2d');
  ctx.clearRect(0, 0, 24, 24);
  const cx = 12, cy = 12, r = 8, start = 3*Math.PI/4, sweep = 3*Math.PI/2;
  
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, start, start + sweep); ctx.stroke();

  const valEnd = start + trimValue * sweep;
  ctx.strokeStyle = trimOn ? '#E8636F' : 'rgba(232,99,111,0.4)';
  ctx.beginPath(); ctx.arc(cx, cy, r, start, valEnd); ctx.stroke();

  ctx.fillStyle = trimOn ? '#E8636F' : 'rgba(232,99,111,0.6)';
  ctx.beginPath(); ctx.arc(cx + r*Math.cos(valEnd), cy + r*Math.sin(valEnd), 2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = trimOn ? 'rgba(232,99,111,0.4)' : 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();

  const f = trimFreq();
  if ($trimFreq) $trimFreq.innerText = formatTrimHz(f);
}

function trimToggleAudio() {
  trimOn = !trimOn;
  if (trimOn) {
    try {
      if (!trimAudioCtx) trimAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      trimOsc = trimAudioCtx.createOscillator(); trimGain = trimAudioCtx.createGain();
      trimOsc.type = 'sine'; trimOsc.frequency.setValueAtTime(trimFreq(), trimAudioCtx.currentTime);
      trimGain.gain.setValueAtTime(0, trimAudioCtx.currentTime);
      trimGain.gain.linearRampToValueAtTime(0.05, trimAudioCtx.currentTime + 0.1);
      trimOsc.connect(trimGain); trimGain.connect(trimAudioCtx.destination);
      trimOsc.start();
    } catch(e) { trimOn = false; }
  } else if (trimOsc) {
    try { trimGain.gain.linearRampToValueAtTime(0, trimAudioCtx.currentTime + 0.1); trimOsc.stop(trimAudioCtx.currentTime + 0.15); } catch(e){}
    trimOsc = null; trimGain = null;
  }
  drawTrimtab();
}

if ($trimCanvas) {
  $trimCanvas.addEventListener('pointerdown', e => {
    e.preventDefault(); $trimCanvas.setPointerCapture(e.pointerId);
    _trimIsDown = true;
    const rect = $trimCanvas.getBoundingClientRect();
    _trimAngle = Math.atan2(e.clientY - rect.top - 12, e.clientX - rect.left - 12);
  });
  $trimCanvas.addEventListener('pointermove', e => {
    if (!_trimIsDown) return;
    const rect = $trimCanvas.getBoundingClientRect();
    const a = Math.atan2(e.clientY - rect.top - 12, e.clientX - rect.left - 12);
    let d = a - _trimAngle;
    if (d > Math.PI) d -= 2*Math.PI; if (d < -Math.PI) d += 2*Math.PI;
    trimValue = Math.max(0, Math.min(1, trimValue + d / (3*Math.PI/2)));
    if (trimOn && trimOsc) try { trimOsc.frequency.setValueAtTime(trimFreq(), trimAudioCtx.currentTime); } catch(e){}
    _trimAngle = a; drawTrimtab();
  });
  const trimUp = () => { _trimIsDown = false; _trimAngle = null; };
  $trimCanvas.addEventListener('pointerup', trimUp);
  $trimCanvas.addEventListener('pointercancel', trimUp);
  $('trimtab-trigger').addEventListener('click', (e) => { if (e.target !== $trimCanvas) activateLayer0(); else if (!_trimIsDown) trimToggleAudio(); });
}
drawTrimtab();

// Layer 0 Logic
let l0Timer = null, l0Audio = null, escStart = null, escTimer = null;

function activateLayer0() {
  $('layer0').classList.remove('opacity-0', 'pointer-events-none');
  $('l0-spoon-fill').style.width = `${(currentSpoons/MAX_SPOONS)*100}%`;
  $('l0-spoon-pct').innerText = `${Math.round((currentSpoons/MAX_SPOONS)*100)}%`;
  if (!l0Timer) runBreathCycle();
}

function deactivateLayer0() {
  $('layer0').classList.add('opacity-0', 'pointer-events-none');
  clearTimeout(l0Timer); l0Timer = null;
  if (l0Audio) { try { l0Audio.close(); } catch(e){} l0Audio = null; }
}

function playBreath(phase, durMs, freq) {
  $('l0-phase').innerText = phase;
  const dot = $('l0-dot');
  dot.style.animation = 'none'; void dot.offsetWidth;
  dot.style.animation = `l0-${phase.toLowerCase()} ${durMs}ms ease-in-out forwards`;
  if (!freq) return;
  try {
    if (!l0Audio) l0Audio = new (window.AudioContext || window.webkitAudioContext)();
    const osc = l0Audio.createOscillator(), gain = l0Audio.createGain();
    osc.frequency.setValueAtTime(freq, l0Audio.currentTime); osc.type = 'sine';
    gain.gain.setValueAtTime(0, l0Audio.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, l0Audio.currentTime + 0.4);
    gain.gain.linearRampToValueAtTime(0, l0Audio.currentTime + (durMs/1000) - 0.4);
    osc.connect(gain); gain.connect(l0Audio.destination);
    osc.start(); osc.stop(l0Audio.currentTime + (durMs/1000));
  } catch(e) {}
}

function runBreathCycle() {
  playBreath('INHALE', 4000, breathInhaleHz());
  l0Timer = setTimeout(() => {
    playBreath('HOLD', 4000, null);
    l0Timer = setTimeout(() => {
      playBreath('EXHALE', 6000, breathExhaleHz());
      l0Timer = setTimeout(runBreathCycle, 6000);
    }, 4000);
  }, 4000);
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || $('layer0').classList.contains('pointer-events-none')) return;
  e.preventDefault();
  if (escStart) return;
  escStart = Date.now();
  $('l0-escape-fill').style.transition = 'width 3s linear';
  $('l0-escape-fill').style.width = '100%';
  escTimer = setTimeout(() => { deactivateLayer0(); escStart = null; $('l0-escape-fill').style.width = '0%'; }, 3000);
});
document.addEventListener('keyup', e => {
  if (e.key === 'Escape') { clearTimeout(escTimer); escStart = null; $('l0-escape-fill').style.transition = 'width 0.15s linear'; $('l0-escape-fill').style.width = '0%'; }
});

// ================================================================
// 3. WEBGL SPACESHIP EARTH DOME (Three.js)
// ================================================================
const container = $('webgl-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.5, 13);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(domePerfLite ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x050508, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// Post Processing — align with /dome (no bloom in ?perf=lite)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
let bloomPass: InstanceType<typeof UnrealBloomPass> | null = null;
if (!domePerfLite) {
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,
    0.4,
    0.6
  );
  composer.addPass(bloomPass);
}
composer.addPass(new OutputPass());

// Lights
scene.add(new THREE.AmbientLight(0x0a0a0a, 0.05));
const domeLight = new THREE.PointLight(0x1a2a3a, 0.8, 12);
domeLight.position.set(0, 0, 0); scene.add(domeLight);

// Data
const AXIS_COLORS = { a: 0xff9944, b: 0x44aaff, c: 0x44ffaa, d: 0xff4466 };
const AXIS_LABELS = { a: 'Operator', b: 'Signals', c: 'Context', d: 'Shield' };
const STATE_CSS = { active: '#3ba372', deployed: '#25897d', countdown: '#cda852', complete: '#25897d', missing: '#cc6247', ongoing: '#25897d', prototype: '#25897d' };
const STATE_GLOW = { countdown: 2.0, critical: 2.5, complete: 0.4, active: 1.0, ongoing: 0.6, deployed: 0.7, prototype: 0.5, missing: 1.2 };

const VERTICES = {
  'med-calcitriol': ['Calcitriol', 4, 0, 0, 0, 'ongoing', 'vital', '12hr dose cycle'],
  'spoon-budget': ['Spoon Budget', 4, 0, 0, 0, 'active', 'vital', '12/20'],
  'exec-dys': ['Exec Dysfunction', 3, 0, 1, 0, 'active', 'vital'],
  'bonding-game': ['BONDING', 0, 3, 1, 0, 'deployed', 'ac', 'WebRTC Mesh'],
  'p31-labs': ['P31 Labs', 1, 1, 2, 0, 'active', 'ac', '501(c)(3)'],
  'spaceship': ['Spaceship Earth', 0, 1, 3, 0, 'deployed', 'ac', 'Observatory Dome'],
  'buffer': ['The Buffer', 2, 1, 1, 0, 'active', 'dc', 'Voltage Filter'],
  'node-one': ['Node One', 1, 0, 3, 0, 'prototype', 'dc', 'ESP32-S3'],
  'centaur': ['The Centaur', 1, 1, 2, 0, 'active', 'ac'],
  'love-econ': ['L.O.V.E.', 1, 1, 2, 0, 'deployed', 'ac', 'Ledger'],
  'phosphorus31': ['phosphorus31.org', 0, 0, 3, 1, 'deployed', 'ac'],
  'posner': ['Posner Molecule', 2, 0, 2, 0, 'active', 'dc', 'Ca9(PO4)6'],
  'larmor': ['863 Hz', 1, 0, 1, 2, 'active', 'dc', 'Larmor canonical'],
  'ivm': ['IVM Geometry', 0, 0, 4, 0, 'active', 'dc'],
  'soulsafe': ['SOULSAFE', 0, 0, 2, 2, 'active', 'ac'],
  'opm-deadline': ['OPM Sep 26', 0, 0, 0, 4, 'countdown', 'vital'],
  'court-void': ['Void Ab Initio', 0, 0, 0, 4, 'active', 'ac'],
};

const EDGES = [
  ['exec-dys', 'spoon-budget', 'drains'], ['bonding-game', 'love-econ', 'earns'],
  ['p31-labs', 'spaceship', 'builds'], ['p31-labs', 'buffer', 'builds'],
  ['spaceship', 'love-econ', 'displays'], ['phosphorus31', 'spaceship', 'hosted'],
  ['posner', 'larmor', 'resonates'], ['posner', 'ivm', 'geometry'],
  ['court-void', 'soulsafe', 'protects']
];

function getDominantAxis(a,b,c,d) { const v={a,b,c,d}; let m=-1, ax='a'; for(let k of ['a','b','c','d']) { if(v[k]>m) { m=v[k]; ax=k; } } return ax; }
function getNodeColor(a,b,c,d) { const s=a+b+c+d||1, col=new THREE.Color(0); const ac={a:new THREE.Color(AXIS_COLORS.a),b:new THREE.Color(AXIS_COLORS.b),c:new THREE.Color(AXIS_COLORS.c),d:new THREE.Color(AXIS_COLORS.d)}; for(let k of ['a','b','c','d']) { const w=({a,b,c,d})[k]/s; col.r+=ac[k].r*w; col.g+=ac[k].g*w; col.b+=ac[k].b*w; } return col; }

const TETRA = [new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1/3,Math.sqrt(8/9)), new THREE.Vector3(-Math.sqrt(2/3),-1/3,-Math.sqrt(2/9)), new THREE.Vector3(Math.sqrt(2/3),-1/3,-Math.sqrt(2/9))];
function nodeDir(a,b,c,d) { const s=a+b+c+d||1, dir=new THREE.Vector3(0,0,0); dir.addScaledVector(TETRA[0],a/s); dir.addScaledVector(TETRA[1],b/s); dir.addScaledVector(TETRA[2],c/s); dir.addScaledVector(TETRA[3],d/s); return dir.normalize(); }

const RADIUS = 3.5;
const geo = buildGeoThree(RADIUS, 2);
const geoOuter = buildGeoThree(RADIUS * 1.08, 1);
const geoInner = buildGeoThree(RADIUS * 0.92, 2);
const faceMeshes = [];
const nodeToFace = new Map();

// Outer shell wireframe
const oPos = [];
for(let i=0; i<geoOuter.edges.length; i++) {
  const [a,b] = geoOuter.edges[i];
  oPos.push(geoOuter.verts[a].x, geoOuter.verts[a].y, geoOuter.verts[a].z);
  oPos.push(geoOuter.verts[b].x, geoOuter.verts[b].y, geoOuter.verts[b].z);
}
const oGeo = new THREE.BufferGeometry();
oGeo.setAttribute('position', new THREE.Float32BufferAttribute(oPos, 3));
const oMat = new THREE.LineBasicMaterial({ color: 0x1a3040, transparent: true, opacity: 0.3 });
const outerShell = new THREE.LineSegments(oGeo, oMat);

// Inner shell
const iMatBase = makeHubInnerShellMaterial(domePerfLite);
const innerShell = new THREE.Group();
for(let i=0; i<geoInner.faces.length; i++) {
  const f = geoInner.faces[i];
  const [a,b,c] = f.indices;
  const va = geoInner.verts[a], vb = geoInner.verts[b], vc = geoInner.verts[c];
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.Float32BufferAttribute([va.x,va.y,va.z, vb.x,vb.y,vb.z, vc.x,vc.y,vc.z], 3));
  tGeo.computeVertexNormals();
  innerShell.add(new THREE.Mesh(tGeo, iMatBase.clone()));
}

// Assign nodes
const sorted = Object.entries(VERTICES).map(([id,d])=>({id, label:d[0], a:d[1], b:d[2], c:d[3], d:d[4], state:d[5], bus:d[6], notes:d[7], dir:nodeDir(d[1],d[2],d[3],d[4]), p:d[5]==='countdown'?0:1})).sort((x,y)=>x.p-y.p);
const used = new Set();
const assignments = [];
for(const n of sorted) {
  let best=-1, bd=-2;
  for(let i=0; i<geo.faces.length; i++) { if(used.has(i)) continue; const dot=geo.faces[i].centroid.clone().normalize().dot(n.dir); if(dot>bd) {bd=dot; best=i;} }
  if(best>=0) { used.add(best); const a={faceIdx:best, node:n, color:getNodeColor(n.a,n.b,n.c,n.d), glow:STATE_GLOW[n.state]||0.5}; assignments.push(a); nodeToFace.set(n.id, a); geo.faces[best].assignment = a; }
}

// Draw wireframe
const wPos=[], eProg=[];
for(let i=0; i<geo.edges.length; i++) { const [a,b]=geo.edges[i]; wPos.push(geo.verts[a].x, geo.verts[a].y, geo.verts[a].z, geo.verts[b].x, geo.verts[b].y, geo.verts[b].z); eProg.push(i/geo.edges.length, i/geo.edges.length); }
const wGeo=new THREE.BufferGeometry(); wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3)); wGeo.setAttribute('edgeProgress', new THREE.Float32BufferAttribute(eProg, 1));
const wMat=new THREE.ShaderMaterial({ 
  uniforms:{uTime:{value:0}}, 
  vertexShader:`attribute float edgeProgress; varying float vP; void main(){vP=edgeProgress; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, 
  fragmentShader:`
    uniform float uTime; 
    varying float vP; 
    void main(){ 
      float p=smoothstep(0.,0.05,fract(vP-uTime*0.12))*(1.-smoothstep(0.05,0.15,fract(vP-uTime*0.12))); 
      float shimmer = 0.3 + 0.7 * sin(uTime * 3.0 + vP * 10.0) * 0.5;
      gl_FragColor=vec4(0.15,0.35,0.45,0.3 + p * 0.7) * shimmer; 
    }
  `, 
  transparent:true, 
  depthWrite:false 
});
scene.add(new THREE.LineSegments(wGeo, wMat));

// Draw faces - EXACT 3D TETRAHEDRAL BLOCKS FROM /dome
const domeGroup = new THREE.Group();
for(let i=0; i<geo.faces.length; i++) {
  const f=geo.faces[i], a=f.assignment, [ai,bi,ci]=f.indices;

  const va=geo.verts[ai].clone();
  const vb=geo.verts[bi].clone();
  const vc=geo.verts[ci].clone();
  const cent = new THREE.Vector3().add(va).add(vb).add(vc).divideScalar(3);

  // Shrink outer face towards centroid to create gaps
  const gap = 0.08;
  va.lerp(cent, gap);
  vb.lerp(cent, gap);
  vc.lerp(cent, gap);

  // Inner vertex to create the 3D block volume (points inward to core)
  const vd = cent.clone().multiplyScalar(0.85);

  const tGeo = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    // Outer face
    va.x,va.y,va.z, vb.x,vb.y,vb.z, vc.x,vc.y,vc.z,
    // Side 1
    va.x,va.y,va.z, vc.x,vc.y,vc.z, vd.x,vd.y,vd.z,
    // Side 2
    vc.x,vc.y,vc.z, vb.x,vb.y,vb.z, vd.x,vd.y,vd.z,
    // Side 3
    vb.x,vb.y,vb.z, va.x,va.y,va.z, vd.x,vd.y,vd.z
  ]);
  tGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  tGeo.computeVertexNormals();

  const mat = makeHubFaceMaterial(
    a ? { glow: a.glow, color: a.color } : null,
    domePerfLite
  );

  const mesh=new THREE.Mesh(tGeo, mat);
  mesh.userData = {
    a,
    centroidDir: cent.clone().normalize(),
    randomPhase: Math.random() * Math.PI * 2,
  };

  // Edge definitions attached to each block
  const edgeGeo = new THREE.EdgesGeometry(tGeo);
  const edgeMat = new THREE.LineBasicMaterial({
    color: a ? a.color : 0x223344,
    transparent: true,
    opacity: a ? 0.4 : 0.15
  });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  
  domeGroup.add(mesh);
  domeGroup.add(edges);
  faceMeshes.push(mesh);
}
// Add layered shells
domeGroup.add(outerShell);
domeGroup.add(innerShell);
scene.add(domeGroup);

// Base Ring Frame - always visible
const baseGeo = new THREE.BufferGeometry();
const basePoints = [];
for(let i=0; i<geo.verts.length; i++) {
  if(geo.verts[i].y < 0.1) { // only lower hemisphere vertices
    basePoints.push(geo.verts[i].x, -0.3, geo.verts[i].z);
    basePoints.push(0, -0.3, 0);
  }
}
baseGeo.setAttribute('position', new THREE.Float32BufferAttribute(basePoints, 3));
const baseMat = new THREE.LineBasicMaterial({ color: 0x225566, opacity: 0.7, transparent: true });
const baseFrame = new THREE.LineSegments(baseGeo, baseMat);
scene.add(baseFrame);

// Deep Molecular Soup - EXACT 1:1 COPY FROM DOME
const pCount = domePerfLite ? 4000 : 12000;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(pCount*3), pSiz = new Float32Array(pCount), pCol = new Float32Array(pCount*3);
for(let i=0; i<pCount; i++) {
  const r=4+Math.random()*30, th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1);
  pPos[i*3]=r*Math.sin(ph)*Math.cos(th); pPos[i*3+1]=r*Math.sin(ph)*Math.sin(th); pPos[i*3+2]=r*Math.cos(ph);
  pSiz[i]=0.01+Math.random()*0.04;
  const cBase = r>15 ? 0x15151a : 0x1a201f;
  pCol[i*3]=(cBase>>16)/255; pCol[i*3+1]=((cBase>>8)&0xff)/255; pCol[i*3+2]=(cBase&0xff)/255;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSiz,1));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol,3));

const pMat = new THREE.PointsMaterial({ color:0xffffff, vertexColors:true, size:0.03, transparent:true, opacity:0.5, sizeAttenuation:true, depthWrite:false });
const molField = new THREE.Points(pGeo, pMat);
scene.add(molField);

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveredFace: THREE.Mesh | null = null;
const panel = $("node-detail-panel");

// Raycaster: hover for click + cursor
container.addEventListener("mousemove", (e) => {
  const rect = container.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(faceMeshes);
  hoveredFace = (hits[0]?.object as THREE.Mesh) ?? null;
  if (e.target === renderer.domElement) {
    document.body.style.cursor =
      hits.length && hits[0].object.userData.a ? "pointer" : "grab";
  }
});

container.addEventListener("click", () => {
  if (!hoveredFace?.userData.a) return;
  const assignment = hoveredFace.userData.a;
  const n = assignment.node;

  $("nd-title").innerText = n.label;
  $("nd-axis").innerText = getDominantAxis(
    n.a,
    n.b,
    n.c,
    n.d
  ).toUpperCase();
  $("nd-state").innerText = n.state.toUpperCase();
  $("nd-state").style.color = STATE_CSS[n.state];
  $("nd-bus").innerText = n.bus?.toUpperCase() || "MAIN";
  $("nd-notes").innerText = n.notes || "No description";

  const edges = EDGES.filter((ed) => ed[0] === n.id || ed[1] === n.id);
  $("nd-conns").innerHTML = edges.length
    ? edges
        .map((ed) => {
          const otherId = ed[0] === n.id ? ed[1] : ed[0];
          const label = VERTICES[otherId]?.[0] || otherId;
          return `<span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">${label}</span>`;
        })
        .join("")
    : '<span class="text-xs text-p31-cloud-40 italic">Isolated</span>';

  if (panel) {
    panel.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
  }
});

$("node-detail-close")?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (panel) {
    panel.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
  }
});

let time = 0;
let isVisible = true;
let lastFrame = 0;
const minFrameTime = domePerfLite ? 1000 / 60 : 1000 / 30;

// Pause rendering when page is hidden or scrolled out of view
document.addEventListener('visibilitychange', () => {
  isVisible = !document.hidden;
});

function animate(timestamp) {
  requestAnimationFrame(animate);
  
  if (!isVisible) return;
  
  // FPS throttling
  if (timestamp - lastFrame < minFrameTime) return;
  lastFrame = timestamp;
  
  const dt = 0.016; time += 0.002;
  

  
  // Auto-rotate - EXACT SPEED FROM DOME
  domeGroup.rotation.y += 0.0008;
  domeGroup.rotation.x = Math.sin(time) * 0.05;
  
  // Particle rotation - EXACT FROM DOME
  molField.rotation.y += 0.0003;
  molField.rotation.x += Math.sin(time*0.3) * 0.0001;

  wMat.uniforms.uTime.value += dt;

  // Dome pulse - EXACT FROM /dome
  const breath = 1.0 + 0.005 * Math.sin(time * 1.5);

  for(const m of faceMeshes) {
    // Block insertion animation
    if(!m.userData.insertProgress) m.userData.insertProgress = Math.random() * 0.3;
    if(!m.userData.insertTarget) m.userData.insertTarget = 1.0;
    
    m.userData.insertProgress += (m.userData.insertTarget - m.userData.insertProgress) * 0.08;
    const insertOffset = (1.0 - m.userData.insertProgress) * 1.5;

    // Organic floating per block (stable phase — no per-frame random)
    const rp = m.userData.randomPhase ?? 0;
    const floatOffset = Math.sin(time * 2.5 + rp) * 0.04;
    m.position.copy(m.userData.centroidDir).multiplyScalar(floatOffset + insertOffset);

    m.scale.setScalar(breath);
    m.material.opacity = 0.3 + m.userData.insertProgress * 0.6;
  }

  composer.render();
}
animate(0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
    if (bloomPass) {
      bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }
});

// Fix button handler (DOM now fully loaded)
const domeBtn = document.getElementById('btn-explore-dome');
if (domeBtn) {
  domeBtn.addEventListener('click', () => {
    window.location.href = '/dome';
  });
}
}

document.addEventListener('DOMContentLoaded', landingMain);
