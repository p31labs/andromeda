import * as THREE from "three";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════
const SIGNALING_BASE = "wss://p31-signaling.trimtab-signal.workers.dev";
const STUN_SERVERS = [{ urls: "stun:stun.cloudflare.com:3478" }];

const FAMILY_NODES = {
  will:  { label: "Will",      color: 0x22d3ee, domain: "industry",  vertexIndex: 0 },
  sj:    { label: "S.J.",      color: 0x34d399, domain: "industry",  vertexIndex: 1 },
  wj:    { label: "W.J.",      color: 0xc084fc, domain: "industry",  vertexIndex: 2 },
  christyn: { label: "Christyn", color: 0xf472b6, domain: "industry", vertexIndex: 3 },
};

const SENTINEL_WHITELIST = [
  "smallball",
  "gridiron",
  "liquid-sculptor",
  "magnetic-poetry",
  "geodesic-builder",
];

const LOVE_COLOR = 0xb65ad8;
const EDGE_REST_OPACITY = 0.25;
const EDGE_ACTIVE_OPACITY = 0.9;
const PARTICLE_COUNT = 24;
const CYCLE_INHALE = 4000;
const CYCLE_HOLD = 4000;
const CYCLE_EXHALE = 6000;
const CYCLE_TOTAL = CYCLE_INHALE + CYCLE_HOLD + CYCLE_EXHALE;
const SPOON_DECAY_MS = 120000;
const SPOON_RECOVERY_MS = 60000;
const LARMOR_HZ = 863;

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════
const state = {
  myId: null,
  myNodeKey: null,
  myRoomId: null,
  sigWs: null,
  peerConns: new Map(),
  dataChannels: new Map(),
  nodeStatus: {},       // key -> { online, domain, playing, spectating }
  careFlows: [],        // { source, target, ts, value }
  breathActive: false,
  breathInterval: null,
  breathStart: 0,
  sigReconnect: null,
  spoons: 6,
  spoonTimer: null,
  lastInteraction: Date.now(),
  particles: [],
  edgeMeshes: [],
  isMobile: window.matchMedia("(max-width: 768px)").matches,
  nocMode: window.location.pathname.includes("mesh-noc"),
};

// ══════════════════════════════════════════════════════════════════════════════
// THREE.JS SETUP
// ══════════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById("meshCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x050510, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 6);
camera.lookAt(0, 0, 0);

const tetraGeo = new THREE.TetrahedronGeometry(1.8, 0);
const edgesGeo = new THREE.EdgesGeometry(tetraGeo);
const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: EDGE_REST_OPACITY });
const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
scene.add(wireframe);

const vertexPositions = [
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(-1, -1, 1),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(1, -1, -1),
];

const nodeMeshes = [];
const nodeLabels = [];
const nodeOccluders = [];

Object.keys(FAMILY_NODES).forEach((key) => {
  const cfg = FAMILY_NODES[key];
  const vi = cfg.vertexIndex;
  const pos = vertexPositions[vi].clone().multiplyScalar(1.8);

  const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const sphereMat = new THREE.MeshBasicMaterial({ color: cfg.color });
  const mesh = new THREE.Mesh(sphereGeo, sphereMat);
  mesh.position.copy(pos);
  mesh.userData = { nodeKey: key, vertexIndex: vi };
  scene.add(mesh);
  nodeMeshes.push(mesh);

  const occluderGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const occluderMat = new THREE.MeshBasicMaterial({ color: 0x050510 });
  const occluder = new THREE.Mesh(occluderGeo, occluderMat);
  occluder.position.copy(pos);
  scene.add(occluder);
  nodeOccluders.push(occluder);
});

const internalFillMat = new THREE.MeshBasicMaterial({
  color: 0xb65ad8,
  transparent: true,
  opacity: 0.0,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const internalFillGeo = new THREE.TetrahedronGeometry(1.8, 0);
const internalFill = new THREE.Mesh(internalFillGeo, internalFillMat);
scene.add(internalFill);

const particlePool = [];
const particleGeo = new THREE.OctahedronGeometry(0.04, 0);

function spawnParticles(sourceKey, targetKey) {
  const sIdx = FAMILY_NODES[sourceKey]?.vertexIndex;
  const tIdx = FAMILY_NODES[targetKey]?.vertexIndex;
  if (sIdx === undefined || tIdx === undefined) return;
  const start = vertexPositions[sIdx].clone().multiplyScalar(1.8);
  const end = vertexPositions[tIdx].clone().multiplyScalar(1.8);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: LOVE_COLOR,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.position.copy(start);
    const t = i / PARTICLE_COUNT;
    mesh.userData = {
      start: start.clone(),
      end: end.clone(),
      t: t,
      speed: 0.003 + Math.random() * 0.004,
      alive: true,
    };
    scene.add(mesh);
    particlePool.push(mesh);
  }
  updateInternalFill();
}

function updateParticles() {
  for (let i = particlePool.length - 1; i >= 0; i--) {
    const p = particlePool[i];
    p.userData.t += p.userData.speed;
    if (p.userData.t >= 1) {
      scene.remove(p);
      p.material.dispose();
      particlePool.splice(i, 1);
      continue;
    }
    p.position.lerpVectors(p.userData.start, p.userData.end, p.userData.t);
    p.material.opacity = 0.8 * (1 - p.userData.t);
  }
}

function updateInternalFill() {
  const n = particlePool.length;
  internalFillMat.opacity = Math.min(n / (PARTICLE_COUNT * 6), 0.18);
}

let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const _e = clock.getElapsedTime();
  if (state.spoons > 1) {
    wireframe.rotation.y = Math.sin(_e * 0.1) * 0.05;
    wireframe.rotation.x = Math.cos(_e * 0.07) * 0.03;
  }
  updateParticles();
  updateNodeMeshStates();
  renderer.render(scene, camera);
}

function resizeRenderer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ══════════════════════════════════════════════════════════════════════════════
// NODE MESH STATE UPDATES
// ══════════════════════════════════════════════════════════════════════════════
function updateNodeMeshStates() {
  const t = Date.now() * 0.001;
  nodeMeshes.forEach((mesh) => {
    const key = mesh.userData.nodeKey;
    const status = state.nodeStatus[key];
    const cfg = FAMILY_NODES[key];
    const isOnline = status?.online;
    const isPlaying = status?.domain === "arcade";
    const isSpectating = status?.spectating;
    if (isPlaying) {
      mesh.material.color.setHex(0xfacc15);
      mesh.scale.setScalar(1.0 + Math.sin(t * 2) * 0.3);
    } else if (isSpectating) {
      mesh.material.color.setHex(LOVE_COLOR);
      mesh.scale.setScalar(1.0 + Math.sin(t * 0.5) * 0.1);
    } else if (isOnline) {
      mesh.material.color.setHex(cfg.color);
      mesh.scale.setScalar(1.0 + Math.sin(t * 0.8) * 0.15);
    } else {
      mesh.material.color.setHex(0x475569);
      mesh.scale.setScalar(0.7);
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ══════════════════════════════════════════════════════════════════════════════
function meshLog(msg, cls = "sys") {
  const el = document.getElementById("meshLog");
  if (!el) return;
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  el.innerHTML += `<div class="${cls}">[${ts}] ${msg}</div>`;
  el.scrollTop = el.scrollHeight;
}

// ══════════════════════════════════════════════════════════════════════════════
// ID / ROOM
// ══════════════════════════════════════════════════════════════════════════════
function genId() {
  const buf = new Uint8Array(5);
  crypto.getRandomValues(buf);
  return "p31-" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNALING
// ══════════════════════════════════════════════════════════════════════════════
function connectSignaling(roomId, peerId) {
  if (state.sigWs) {
    state.sigWs.onclose = null;
    state.sigWs.close();
  }
  const url = `${SIGNALING_BASE}/signal/${roomId}?peerId=${encodeURIComponent(peerId)}`;
  meshLog("Connecting: " + roomId, "sys");
  meshSetStatus("init", "Connecting...");
  state.sigWs = new WebSocket(url);
  state.sigWs.onopen = () => {
    clearTimeout(state.sigReconnect);
    meshSetStatus("on", "Online — waiting for peers");
    const btnConnect = document.getElementById("meshBtnConnect");
    const btnJoin = document.getElementById("meshBtnJoin");
    if (btnConnect) btnConnect.disabled = false;
    if (btnJoin) btnJoin.disabled = false;
    meshLog("Signaling connected. Node: " + state.myId);
    broadcastPresence();
  };
  state.sigWs.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleSignalingMsg(msg);
  };
  state.sigWs.onclose = (e) => {
    meshLog("Signaling closed (" + e.code + ") — reconnecting in 3s", "err");
    meshSetStatus("init", "Reconnecting...");

    const btnConnect = document.getElementById("meshBtnConnect");
    if (btnConnect) btnConnect.disabled = true;
    state.sigReconnect = setTimeout(() => connectSignaling(roomId, peerId), 3000);
  };
  state.sigWs.onerror = () => meshLog("Signaling error", "err");
}

function sendSignal(msg) {
  if (state.sigWs && state.sigWs.readyState === WebSocket.OPEN) {
    state.sigWs.send(JSON.stringify(msg));
  }
}

function broadcastPresence() {
  sendSignal({
    type: "presence",
    from: state.myId,
    nodeKey: state.myNodeKey,
    ts: Date.now(),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNALING MESSAGE DISPATCH
// ══════════════════════════════════════════════════════════════════════════════
async function handleSignalingMsg(msg) {
  const { type, from } = msg;
  if (!from || from === state.myId) return;

  if (type === "peer-joined") {
    meshLog("Peer joined (" + msg.peerCount + " total)", "rx");
    if (!state.peerConns.has(from)) await initiateOffer(from);
    return;
  }
  if (type === "peer-left") {
    meshLog("Peer left: " + (from || msg.peerId), "err");
    closePeer(from || msg.peerId);
    return;
  }
  if (type === "presence") {
    state.nodeStatus[msg.nodeKey || from] = {
      online: true,
      domain: "industry",
      playing: false,
      spectating: false,
      lastSeen: Date.now(),
    };
    updateNodeList();
    meshLog("Presence: " + (msg.nodeKey || from), "rx");
    return;
  }
  if (type === "node-update") {
    state.nodeStatus[msg.nodeKey] = {
      ...state.nodeStatus[msg.nodeKey],
      ...msg.status,
      lastSeen: Date.now(),
    };
    updateNodeList();
    if (autoSpectateCheck()) enableSpectateButton();
    return;
  }
  if (type === "care-flow") {
    handleRemoteCareFlow(msg);
    return;
  }
  if (type === "offer") await handleOffer(from, msg.sdp);
  else if (type === "answer") await handleAnswer(from, msg.sdp);
  else if (type === "candidate") await handleCandidate(from, msg.candidate);
  else if (type === "bye") closePeer(from);
}

// ══════════════════════════════════════════════════════════════════════════════
// WebRTC PEER CONNECTIONS
// ══════════════════════════════════════════════════════════════════════════════
function createPeerConn(remotePeerId) {
  if (state.peerConns.has(remotePeerId)) return state.peerConns.get(remotePeerId);
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  state.peerConns.set(remotePeerId, pc);
  pc.onicecandidate = (e) => {
    if (e.candidate) sendSignal({ type: "candidate", to: remotePeerId, candidate: e.candidate });
  };
  pc.oniceconnectionstatechange = () => {
    meshLog("ICE " + remotePeerId.slice(0, 8) + "… → " + pc.iceConnectionState, "sys");
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      closePeer(remotePeerId);
    }
  };
  pc.ondatachannel = (e) => setupDataChannel(remotePeerId, e.channel);
  return pc;
}

async function initiateOffer(remotePeerId) {
  meshLog("Offer → " + remotePeerId, "tx");
  const pc = createPeerConn(remotePeerId);
  const dc = pc.createDataChannel("p31-k4", { ordered: true });
  setupDataChannel(remotePeerId, dc);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendSignal({ type: "offer", to: remotePeerId, sdp: pc.localDescription });
}

async function handleOffer(remotePeerId, sdp) {
  meshLog("Offer ← " + remotePeerId, "rx");
  const pc = createPeerConn(remotePeerId);
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignal({ type: "answer", to: remotePeerId, sdp: pc.localDescription });
}

async function handleAnswer(remotePeerId, sdp) {
  meshLog("Answer ← " + remotePeerId, "rx");
  const pc = state.peerConns.get(remotePeerId);
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

async function handleCandidate(remotePeerId, candidate) {
  const pc = state.peerConns.get(remotePeerId);
  if (pc && candidate) {
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA CHANNEL
// ══════════════════════════════════════════════════════════════════════════════
function setupDataChannel(remotePeerId, dc) {
  state.dataChannels.set(remotePeerId, dc);
  dc.onopen = () => {
    updatePeerCount();
    meshSetStatus("on", "Linked — " + state.dataChannels.size + " peer(s)");
    meshLog("Linked → " + remotePeerId, "rx");
    const br = document.getElementById("meshBreathCard");
    if (br) br.style.display = "block";
    dcSend(remotePeerId, { type: "hello", from: state.myId, nodeKey: state.myNodeKey, ts: Date.now() });
    if (bothSiblingsOnline()) startBreath(true);
  };
  dc.onmessage = (ev) => {
    let data;
    try { data = JSON.parse(ev.data); } catch { return; }
    if (data.type === "breath") onRemoteBreath(data);
    else if (data.type === "hello") meshLog("Hello ← " + (data.from || remotePeerId), "rx");
    else if (data.type === "care-flow") handleRemoteCareFlow(data);
    else if (data.type === "node-update") {
      state.nodeStatus[data.nodeKey] = { ...state.nodeStatus[data.nodeKey], ...data.status };
      updateNodeList();
    }
    else if (data.type === "spectate-request") handleSpectateRequest(data, remotePeerId);
    else if (data.type === "ping") meshVibrate([80, 40, 80]);
  };
  dc.onclose = () => closePeer(remotePeerId);
  dc.onerror = (err) => meshLog("DC error: " + err, "err");
}

function dcSend(peerId, data) {
  const dc = state.dataChannels.get(peerId);
  if (dc && dc.readyState === "open") dc.send(JSON.stringify(data));
}

function dcBroadcast(data) {
  for (const [peerId] of state.dataChannels) dcSend(peerId, data);
}

function closePeer(peerId) {
  const dc = state.dataChannels.get(peerId);
  if (dc) { try { dc.close(); } catch { /* */ } state.dataChannels.delete(peerId); }
  const pc = state.peerConns.get(peerId);
  if (pc) { try { pc.close(); } catch { /* */ } state.peerConns.delete(peerId); }
  updatePeerCount();
  meshLog("Peer disconnected: " + peerId, "err");
  if (state.dataChannels.size === 0) {
    meshSetStatus("on", "Online — waiting for peers");
    const br = document.getElementById("meshBreathCard");
    if (br) br.style.display = "none";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// NODE LIST UI
// ══════════════════════════════════════════════════════════════════════════════
function updateNodeList() {
  const el = document.getElementById("meshNodeList");
  if (!el) return;
  el.innerHTML = "";
  Object.keys(FAMILY_NODES).forEach((key) => {
    const cfg = FAMILY_NODES[key];
    const status = state.nodeStatus[key];
    const isOnline = status?.online;
    const isPlaying = status?.domain === "arcade";
    const isSpectating = status?.spectating;
    const row = document.createElement("div");
    row.className = "mesh-node-row";
    let dotClass = "mesh-node-dot-off";
    let tagText = "Offline";
    if (isPlaying) { dotClass = "mesh-node-dot-arcade"; tagText = "Arcade: Playing"; }
    else if (isSpectating) { dotClass = "mesh-node-dot-love"; tagText = "Love: Spectating"; }
    else if (isOnline) { dotClass = "mesh-node-dot-on"; tagText = tagFromDomain(status?.domain); }
    row.innerHTML = `<div class="mesh-node-dot ${dotClass}"></div><span class="mesh-node-label">${cfg.label}</span><span class="mesh-node-tag">${tagText}</span>`;
    el.appendChild(row);
  });
}

function tagFromDomain(d) {
  if (d === "arcade") return "Arcade";
  if (d === "love") return "Love";
  if (d === "chump") return "CHUMP";
  return "Industry";
}

// ══════════════════════════════════════════════════════════════════════════════
// CARE FLOWS / LOVE ECONOMY
// ══════════════════════════════════════════════════════════════════════════════
function emitCareFlow(sourceKey, targetKey, flowType, value) {
  const flow = {
    flowId: crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
    sourceNode: sourceKey,
    targetNode: targetKey,
    type: flowType,
    value: value || 1,
    ts: Date.now(),
  };
  state.careFlows.push(flow);
  dcBroadcast({ type: "care-flow", ...flow });
  sendSignal({ type: "care-flow", ...flow, from: state.myId });
  spawnParticles(sourceKey, targetKey);
  meshLog("Care flow: " + sourceKey + " → " + targetKey + " (" + flowType + ")", "tx");
  persistCRDT();
}

function handleRemoteCareFlow(data) {
  state.careFlows.push(data);
  if (data.sourceNode && data.targetNode) spawnParticles(data.sourceNode, data.targetNode);
  meshLog("Care flow: " + data.sourceNode + " → " + data.targetNode + " (" + data.type + ")", "rx");
  persistCRDT();
}

// ══════════════════════════════════════════════════════════════════════════════
// SENTINEL SPECTATE PROTOCOL
// ══════════════════════════════════════════════════════════════════════════════
function autoSpectateCheck() {
  const siblings = ["sj", "wj"];
  return siblings.some((key) => {
    const me = state.myNodeKey;
    if (key === me) return false;
    return state.nodeStatus[key]?.online && state.nodeStatus[key]?.domain === "arcade";
  });
}

function enableSpectateButton() {
  const btn = document.getElementById("meshBtnSpectate");
  if (btn) btn.disabled = false;
}

function meshSpectate() {
  const targetKey = state.myNodeKey === "sj" ? "wj" : "sj";
  const status = state.nodeStatus[targetKey];
  if (!status?.online || status?.domain !== "arcade") {
    meshLog("Spectate: target sibling not playing", "err");
  return;
  }
  const iframe = document.getElementById("meshSpectateFrame");
  const gameUrl = status.playingUrl || "about:blank";
  const gameId = gameUrl.split("/").pop()?.split("?")[0];
  if (gameId && !SENTINEL_WHITELIST.includes(gameId)) {
    meshLog("SENTINEL BLOCK: " + gameId + " not in whitelist", "err");
    return;
  }
  iframe.src = gameUrl + "?spectate=" + state.myId;
  iframe.style.display = "block";
  broadcastNodeUpdate({ spectating: true, domain: "love" });
  emitCareFlow(state.myNodeKey, targetKey, "sibling_spectate", 2);
  meshLog("Spectating " + targetKey, "rx");
}

function handleSpectateRequest(data, remotePeerId) {
  meshLog("Spectate request from " + data.from, "rx");
}

// ══════════════════════════════════════════════════════════════════════════════
// BREATHING ENGINE
// ══════════════════════════════════════════════════════════════════════════════
function startBreath(auto = false) {
  if (state.breathActive) { stopBreath(); return; }
  state.breathActive = true;
  state.breathStart = Date.now();
  const btn = document.getElementById("meshBtnBreath");
  if (btn) btn.textContent = "STOP SYNC";
  meshLog((auto ? "Auto-" : "") + "Breath sync started (4-4-6)", "tx");
  breathTick();
  state.breathInterval = setInterval(breathTick, 100);
}

function stopBreath() {
  state.breathActive = false;
  clearInterval(state.breathInterval);
  state.breathInterval = null;
  const btn = document.getElementById("meshBtnBreath");
  if (btn) btn.textContent = "START SYNC";
  const ring = document.getElementById("meshBreathRing");
  const label = document.getElementById("meshBreathLabel");
  const timer = document.getElementById("meshBreathTimer");
  if (ring) ring.className = "mesh-breath-ring";
  if (label) label.textContent = "READY";
  if (timer) timer.textContent = "—";
  meshLog("Breath sync stopped", "sys");
}

function breathTick() {
  const elapsed = (Date.now() - state.breathStart) % CYCLE_TOTAL;
  const ring = document.getElementById("meshBreathRing");
  const label = document.getElementById("meshBreathLabel");
  const timer = document.getElementById("meshBreathTimer");
  if (!ring || !label || !timer) return;
  if (elapsed < CYCLE_INHALE) {
    ring.className = "mesh-breath-ring inhale";
    label.textContent = "INHALE";
    timer.textContent = Math.ceil((CYCLE_INHALE - elapsed) / 1000);
  } else if (elapsed < CYCLE_INHALE + CYCLE_HOLD) {
    ring.className = "mesh-breath-ring hold";
    label.textContent = "HOLD";
    timer.textContent = Math.ceil((CYCLE_INHALE + CYCLE_HOLD - elapsed) / 1000);
  } else {
    ring.className = "mesh-breath-ring exhale";
    label.textContent = "EXHALE";
    timer.textContent = Math.ceil((CYCLE_TOTAL - elapsed) / 1000);
    if (elapsed - (CYCLE_INHALE + CYCLE_HOLD) < 120) {
      meshVibrate([200, 100, 200, 100, 200]);
      dcBroadcast({ type: "breath", phase: "exhale", ts: Date.now() });
      sendSignal({ type: "breath", phase: "exhale", from: state.myId, ts: Date.now() });
    }
  }
}

function onRemoteBreath(data) {
  if (data.phase === "exhale") {
    meshVibrate([200, 100, 200, 100, 200]);
    meshLog("Remote exhale", "rx");
    const ring = document.getElementById("meshBreathRing");
    if (ring) {
      ring.style.boxShadow = "0 0 30px rgba(182,90,216,0.6)";
      setTimeout(() => { ring.style.boxShadow = "none"; }, 600);
    }
  }
}

function meshVibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function bothSiblingsOnline() {
  return state.nodeStatus["sj"]?.online && state.nodeStatus["wj"]?.online;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPOON THEORY DEGRADATION
// ══════════════════════════════════════════════════════════════════════════════
function updateSpoonUI() {
  const barsEl = document.getElementById("meshSpoonBars");
  const zoneEl = document.getElementById("meshSpoonZone");
  if (!barsEl || !zoneEl) return;
  barsEl.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const bar = document.createElement("div");
    bar.className = "mesh-spoon-bar" + (i < state.spoons ? " active" : "");
    if (state.spoons <= 1) bar.classList.add("red");
    else if (state.spoons <= 3) bar.classList.add("yellow");
    else bar.classList.add("green");
    barsEl.appendChild(bar);
  }
  if (state.spoons >= 6) zoneEl.textContent = "GREEN — Nominal";
  else if (state.spoons >= 3) zoneEl.textContent = "YELLOW — Reduction";
  else zoneEl.textContent = "RED — Critical Safe";
}

function applySpoonDegradation() {
  const s = state.spoons;
  updateSpoonUI();
  if (s >= 6) {
    edgeMat.opacity = EDGE_REST_OPACITY;
    wireframe.material = edgeMat;
    internalFill.visible = true;
  } else if (s >= 3) {
    edgeMat.opacity = EDGE_REST_OPACITY * 0.6;
    internalFill.visible = false;
  } else {
    edgeMat.opacity = EDGE_REST_OPACITY * 0.3;
    internalFill.visible = false;
    if (state.breathActive) stopBreath();
  }
}

function decaySpoon() {
  if (state.spoons > 0) {
    state.spoons--;
    meshLog("Spoon consumed. Remaining: " + state.spoons, "sys");
    applySpoonDegradation();
  }
}

function interactTouch() {
  state.lastInteraction = Date.now();
  if (state.spoonTimer) clearTimeout(state.spoonTimer);
  state.spoonTimer = setTimeout(() => {
    decaySpoon();
    if (state.spoons > 0) interactTouch();
  }, SPOON_DECAY_MS);
}

// ══════════════════════════════════════════════════════════════════════════════
// CRDT OFFLINE PERSISTENCE
// ══════════════════════════════════════════════════════════════════════════════
const CRDT_STORE = "p31-mesh-crdt";
const CRDT_KEY = "mesh-state";

function persistCRDT() {
  try {
    const blob = {
      careFlows: state.careFlows.slice(-200),
      nodeStatus: state.nodeStatus,
      ts: Date.now(),
    };
    localStorage.setItem(CRDT_KEY, JSON.stringify(blob));
  } catch { /* quota */ }
}

function restoreCRDT() {
  try {
    const raw = localStorage.getItem(CRDT_KEY);
    if (!raw) return;
    const blob = JSON.parse(raw);
    if (blob.nodeStatus) state.nodeStatus = { ...state.nodeStatus, ...blob.nodeStatus };
    if (blob.careFlows) state.careFlows = blob.careFlows;
    meshLog("Restored offline state (" + (blob.careFlows?.length || 0) + " flows)", "sys");
  } catch { /* corrupt */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// BROADCAST HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function broadcastNodeUpdate(status) {
  if (!state.myNodeKey) return;
  const payload = { type: "node-update", nodeKey: state.myNodeKey, status };
  dcBroadcast(payload);
  sendSignal({ ...payload, from: state.myId });
  state.nodeStatus[state.myNodeKey] = { ...state.nodeStatus[state.myNodeKey], ...status, online: true, lastSeen: Date.now() };
  updateNodeList();
}

// ══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function meshSetStatus(stat, text) {
  const dot = document.getElementById("meshStatusDot");
  const lbl = document.getElementById("meshStatusText");
  if (dot) dot.className = "mesh-dot dot-" + stat;
  if (lbl) lbl.textContent = text;
}

function updatePeerCount() {
  const el = document.getElementById("meshPeerCount");
  const n = state.dataChannels.size;
  if (el) el.textContent = n > 0 ? n + " peer" + (n > 1 ? "s" : "") + " connected" : "";
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL CALLBACKS (onclick targets)
// ══════════════════════════════════════════════════════════════════════════════
window.meshJoinRoom = function () {
  const input = document.getElementById("meshRoomInput");
  const roomId = input?.value?.trim();
  if (!roomId) return;
  state.myRoomId = roomId;
  meshLog("Joining room: " + roomId, "tx");
  connectSignaling(roomId, state.myId);
  broadcastNodeUpdate({ online: true });
};

window.meshConnect = function () {
  const input = document.getElementById("meshPeerInput");
  const remoteId = input?.value?.trim();
  if (!remoteId) return;
  connectSignaling(remoteId, state.myId);
};

window.meshSpectate = meshSpectate;

window.meshToggleBreath = function () {
  if (state.breathActive) stopBreath();
  else startBreath();
};

// ══════════════════════════════════════════════════════════════════════════════
// AUTO-DETECT NODE KEY from URL params or prompt
// ══════════════════════════════════════════════════════════════════════════════
function detectNodeKey() {
  const params = new URLSearchParams(window.location.search);
  const node = params.get("node")?.toLowerCase();
  if (FAMILY_NODES[node]) return node;
  return "will";
}

// ══════════════════════════════════════════════════════════════════════════════
// NETWORK OPERATIONS CENTER (mesh-noc)
// ══════════════════════════════════════════════════════════════════════════════
function renderNoc() {
  const el = document.getElementById("meshNoc");
  if (!el) return;
  el.style.display = "block";
  el.innerHTML = "";
  const title = document.createElement("h2");
  title.textContent = "Network Operations Center";
  el.appendChild(title);

  const sections = [
    { name: "Identity", data: { myId: state.myId, myNodeKey: state.myNodeKey, room: state.myRoomId } },
    { name: "Connections", data: { peers: [...state.peerConns.keys()], channels: [...state.dataChannels.keys()] } },
    { name: "Node Status", data: state.nodeStatus },
    { name: "Care Flows", data: state.careFlows.slice(-50) },
    { name: "ICE State", data: [...state.peerConns.entries()].map(([k, v]) => ({ peer: k, ice: v.iceConnectionState, signaling: v.signalingState })) },
  ];
  sections.forEach((s) => {
    const sec = document.createElement("div");
    sec.style.cssText = "margin:12px 0;padding:12px;background:rgba(0,0,0,0.5);border-radius:8px";
    const h3 = document.createElement("h3");
    h3.textContent = s.name;
    h3.style.cssText = "font-size:13px;color:#eab308;margin:0 0 8px";
    sec.appendChild(h3);
    const pre = document.createElement("pre");
    pre.style.cssText = "font-size:11px;color:#d8d6d0;overflow-x:auto;margin:0";
    pre.textContent = JSON.stringify(s.data, null, 2);
    sec.appendChild(pre);
    el.appendChild(sec);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════
(function init() {
  state.myId = genId();
  state.myNodeKey = detectNodeKey();
  state.myRoomId = "p31-family";

  restoreCRDT();
  applySpoonDegradation();

  const idEl = document.getElementById("meshMyId");
  if (idEl) {
    idEl.textContent = state.myId;
    idEl.addEventListener("click", () => {
      navigator.clipboard.writeText(state.myId).then(() => {
        meshLog("ID copied", "sys");
        const orig = idEl.textContent;
        idEl.textContent = "COPIED";
        setTimeout(() => { idEl.textContent = orig; }, 1000);
      });
    });
  }

  meshSetStatus("init", "Connecting to signaling...");
  connectSignaling(state.myRoomId, state.myId);

  if (state.myNodeKey) {
    state.nodeStatus[state.myNodeKey] = { online: true, domain: "industry", playing: false, spectating: false, lastSeen: Date.now() };
  }
  updateNodeList();

  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  animate();

  document.addEventListener("click", interactTouch);
  document.addEventListener("touchstart", interactTouch);
  document.addEventListener("keydown", interactTouch);

  meshVibrate([80, 40, 80]);
  meshLog("K4 Family Mesh initialized — Larmor " + LARMOR_HZ + " Hz", "sys");

  if (state.nocMode) renderNoc();

  setInterval(() => {
    Object.keys(state.nodeStatus).forEach((key) => {
      const s = state.nodeStatus[key];
      if (s.online && Date.now() - (s.lastSeen || 0) > 30000) {
        state.nodeStatus[key] = { ...s, online: false };
      }
    });
    updateNodeList();
  }, 5000);
})();
