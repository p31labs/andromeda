import * as THREE from "three";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════
const SIGNALING_BASE = "wss://p31-signaling.trimtab-signal.workers.dev";
const STUN_SERVERS = [{ urls: "stun:stun.cloudflare.com:3478" }];

const FAMILY_NODES = {
  will:    { label: "Will",      color: 0x22d3ee, vertexIndex: 0 },
  sj:      { label: "S.J.",      color: 0x34d399, vertexIndex: 1 },
  wj:      { label: "W.J.",      color: 0xc084fc, vertexIndex: 2 },
  christyn:{ label: "Christyn",  color: 0xf472b6, vertexIndex: 3 },
};

const SIBLING_KEYS = ["sj", "wj"];

const SENTINEL_WHITELIST = [
  "smallball", "gridiron", "liquid-sculptor",
  "magnetic-poetry", "geodesic-builder",
];

const LOVE_COLOR = 0xb65ad8;
const EDGE_REST_OPACITY = 0.25;
const PARTICLE_COUNT_PER_FLOW = 20;
const MAX_PARTICLES = 300;
const CYCLE_INHALE = 4000;
const CYCLE_HOLD = 4000;
const CYCLE_EXHALE = 6000;
const CYCLE_TOTAL = CYCLE_INHALE + CYCLE_HOLD + CYCLE_EXHALE;
const SPOON_DECAY_MS = 180000;
const SPOON_RECOVERY_MS = 45000;
const NODE_TIMEOUT_MS = 30000;
const LARMOR_HZ = 863;

const VERTEX_POSITIONS = [
  new THREE.Vector3(1, 1, 1),
  new THREE.Vector3(-1, -1, 1),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(1, -1, -1),
];

const CRDT_KEY = "p31-mesh-state-v2";

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════
const S = {
  myId: null,
  myNodeKey: null,
  myRoomId: null,
  sigWs: null,
  peerConns: new Map(),
  dataChannels: new Map(),
  nodeStatus: {},
  careFlows: [],
  breathActive: false,
  breathInterval: null,
  breathStart: 0,
  sigReconnect: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  spoons: 6,
  spoonDecayTimer: null,
  spoonRecoveryTimer: null,
  lastInteraction: Date.now(),
  particlePool: [],
  isMobile: window.matchMedia("(max-width: 768px)").matches,
  nocMode: window.location.pathname.includes("mesh-noc"),
  simPeerId: null,
};

// ══════════════════════════════════════════════════════════════════════════════
// THREE.JS
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

const nodeMeshes = [];
Object.keys(FAMILY_NODES).forEach((key) => {
  const cfg = FAMILY_NODES[key];
  const pos = VERTEX_POSITIONS[cfg.vertexIndex].clone();
  const geo = new THREE.SphereGeometry(0.12, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: cfg.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.userData = { nodeKey: key };
  scene.add(mesh);
  nodeMeshes.push(mesh);
});

const internalFillMat = new THREE.MeshBasicMaterial({
  color: LOVE_COLOR, transparent: true, opacity: 0,
  side: THREE.DoubleSide, depthWrite: false,
});
const internalFill = new THREE.Mesh(new THREE.TetrahedronGeometry(1.8, 0), internalFillMat);
scene.add(internalFill);

const sharedParticleGeo = new THREE.OctahedronGeometry(0.04, 0);

function spawnParticles(sourceKey, targetKey) {
  const sIdx = FAMILY_NODES[sourceKey]?.vertexIndex;
  const tIdx = FAMILY_NODES[targetKey]?.vertexIndex;
  if (sIdx === undefined || tIdx === undefined) return;
  if (S.particlePool.length > MAX_PARTICLES) {
    const old = S.particlePool.shift();
    scene.remove(old);
    old.material.dispose();
  }
  const start = VERTEX_POSITIONS[sIdx].clone();
  const end = VERTEX_POSITIONS[tIdx].clone();
  for (let i = 0; i < PARTICLE_COUNT_PER_FLOW; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: LOVE_COLOR, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(sharedParticleGeo, mat);
    mesh.position.copy(start);
    mesh.userData = {
      start: start.clone(), end: end.clone(),
      t: i / PARTICLE_COUNT_PER_FLOW,
      speed: 0.003 + Math.random() * 0.004,
    };
    scene.add(mesh);
    S.particlePool.push(mesh);
  }
  const n = S.particlePool.length;
  internalFillMat.opacity = Math.min(n / (PARTICLE_COUNT_PER_FLOW * 6), 0.18);
}

function updateParticles() {
  for (let i = S.particlePool.length - 1; i >= 0; i--) {
    const p = S.particlePool[i];
    p.userData.t += p.userData.speed;
    if (p.userData.t >= 1) {
      scene.remove(p);
      p.material.dispose();
      S.particlePool.splice(i, 1);
      continue;
    }
    p.position.lerpVectors(p.userData.start, p.userData.end, p.userData.t);
    p.material.opacity = 0.85 * (1 - p.userData.t);
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  if (S.spoons > 1) {
    wireframe.rotation.y = Math.sin(t * 0.1) * 0.05;
    wireframe.rotation.x = Math.cos(t * 0.07) * 0.03;
  }
  updateParticles();
  updateNodeMeshStates(t);
  renderer.render(scene, camera);
}

function updateNodeMeshStates(t) {
  nodeMeshes.forEach((mesh) => {
    const key = mesh.userData.nodeKey;
    const st = S.nodeStatus[key];
    const cfg = FAMILY_NODES[key];
    if (st?.domain === "arcade") {
      mesh.material.color.setHex(0xfacc15);
      mesh.scale.setScalar(1.0 + Math.sin(t * 2) * 0.3);
    } else if (st?.spectating) {
      mesh.material.color.setHex(LOVE_COLOR);
      mesh.scale.setScalar(1.0 + Math.sin(t * 0.5) * 0.1);
    } else if (st?.online) {
      mesh.material.color.setHex(cfg.color);
      mesh.scale.setScalar(1.0 + Math.sin(t * 0.8) * 0.15);
    } else {
      mesh.material.color.setHex(0x475569);
      mesh.scale.setScalar(0.7);
    }
  });
}

function resizeRenderer() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ══════════════════════════════════════════════════════════════════════════════
function meshLog(msg, cls) {
  const el = document.getElementById("meshLog");
  if (!el) return;
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const d = document.createElement("div");
  d.className = cls || "sys";
  d.textContent = "[" + ts + "] " + msg;
  el.appendChild(d);
  if (el.children.length > 200) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

// ══════════════════════════════════════════════════════════════════════════════
// ID
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
  if (S.sigWs) {
    S.sigWs.onclose = null;
    S.sigWs.close();
  }
  const url = SIGNALING_BASE + "/signal/" + roomId + "?peerId=" + encodeURIComponent(peerId);
  meshLog("Connecting: " + roomId, "sys");
  meshSetStatus("init", "Connecting...");
  S.sigWs = new WebSocket(url);
  S.sigWs.onopen = function () {
    clearTimeout(S.sigReconnect);
    S.reconnectAttempts = 0;
    meshSetStatus("on", "Online — waiting for peers");
    document.getElementById("meshBtnConnect").disabled = false;
    document.getElementById("meshBtnJoin").disabled = false;
    meshLog("Signaling connected. Node: " + S.myId, "sys");
    broadcastPresence();
  };
  S.sigWs.onmessage = function (ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    handleSignalingMsg(msg);
  };
  S.sigWs.onclose = function (e) {
    meshLog("Signaling closed (" + e.code + ")", "err");
    document.getElementById("meshBtnConnect").disabled = true;
    if (S.reconnectAttempts >= S.maxReconnectAttempts) {
      meshSetStatus("off", "Offline — click to retry");
      meshLog("Max reconnect attempts reached. Tap status to retry.", "err");
      return;
    }
    var delay = Math.min(1000 * Math.pow(2, S.reconnectAttempts), 30000);
    S.reconnectAttempts++;
    meshSetStatus("init", "Reconnecting in " + (delay / 1000) + "s...");
    S.sigReconnect = setTimeout(function () { connectSignaling(roomId, peerId); }, delay);
  };
  S.sigWs.onerror = function () { meshLog("Signaling error", "err"); };
}

function sendSignal(msg) {
  if (S.sigWs && S.sigWs.readyState === WebSocket.OPEN) {
    S.sigWs.send(JSON.stringify(msg));
  }
}

function broadcastPresence() {
  sendSignal({ type: "presence", from: S.myId, nodeKey: S.myNodeKey, ts: Date.now() });
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNALING DISPATCH
// ══════════════════════════════════════════════════════════════════════════════
function handleSignalingMsg(msg) {
  var type = msg.type, from = msg.from;
  if (!from || from === S.myId) return;

  if (type === "peer-joined") {
    meshLog("Peer joined (" + msg.peerCount + " total)", "rx");
    if (!S.peerConns.has(from) && S.myId > from) {
      initiateOffer(from);
    }
    return;
  }
  if (type === "peer-left") {
    meshLog("Peer left: " + (from || msg.peerId), "err");
    closePeer(from || msg.peerId);
    return;
  }
  if (type === "presence") {
    setNodeStatus(msg.nodeKey || from, { online: true, domain: "industry", playing: false, spectating: false, lastSeen: Date.now() });
    meshLog("Presence: " + (msg.nodeKey || from), "rx");
    return;
  }
  if (type === "node-update") {
    setNodeStatus(msg.nodeKey, Object.assign({}, S.nodeStatus[msg.nodeKey], msg.status, { lastSeen: Date.now() }));
    return;
  }
  if (type === "care-flow") {
    handleRemoteCareFlow(msg);
    return;
  }
  if (type === "offer") handleOffer(from, msg.sdp);
  else if (type === "answer") handleAnswer(from, msg.sdp);
  else if (type === "candidate") handleCandidate(from, msg.candidate);
  else if (type === "bye") closePeer(from);
}

// ══════════════════════════════════════════════════════════════════════════════
// WebRTC
// ══════════════════════════════════════════════════════════════════════════════
function createPeerConn(remotePeerId) {
  if (S.peerConns.has(remotePeerId)) return S.peerConns.get(remotePeerId);
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  S.peerConns.set(remotePeerId, pc);
  pc.onicecandidate = function (e) {
    if (e.candidate) sendSignal({ type: "candidate", to: remotePeerId, candidate: e.candidate });
  };
  pc.oniceconnectionstatechange = function () {
    meshLog("ICE " + remotePeerId.slice(0, 8) + ".. -> " + pc.iceConnectionState, "sys");
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      closePeer(remotePeerId);
    }
  };
  pc.ondatachannel = function (e) { setupDataChannel(remotePeerId, e.channel); };
  return pc;
}

function initiateOffer(remotePeerId) {
  meshLog("Offer -> " + remotePeerId, "tx");
  const pc = createPeerConn(remotePeerId);
  const dc = pc.createDataChannel("p31-k4", { ordered: true });
  setupDataChannel(remotePeerId, dc);
  pc.createOffer().then(function (offer) {
    return pc.setLocalDescription(offer);
  }).then(function () {
    sendSignal({ type: "offer", to: remotePeerId, sdp: pc.localDescription });
  });
}

function handleOffer(remotePeerId, sdp) {
  meshLog("Offer <- " + remotePeerId, "rx");
  const pc = createPeerConn(remotePeerId);
  pc.setRemoteDescription(new RTCSessionDescription(sdp)).then(function () {
    return pc.createAnswer();
  }).then(function (answer) {
    return pc.setLocalDescription(answer);
  }).then(function () {
    sendSignal({ type: "answer", to: remotePeerId, sdp: pc.localDescription });
  });
}

function handleAnswer(remotePeerId, sdp) {
  meshLog("Answer <- " + remotePeerId, "rx");
  const pc = S.peerConns.get(remotePeerId);
  if (pc) pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

function handleCandidate(remotePeerId, candidate) {
  const pc = S.peerConns.get(remotePeerId);
  if (pc && candidate) {
    try { pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* */ }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA CHANNEL
// ══════════════════════════════════════════════════════════════════════════════
function setupDataChannel(remotePeerId, dc) {
  S.dataChannels.set(remotePeerId, dc);
  dc.onopen = function () {
    updatePeerCount();
    meshSetStatus("on", "Linked — " + S.dataChannels.size + " peer(s)");
    meshLog("Linked -> " + remotePeerId, "rx");
    document.getElementById("meshBreathCard").style.display = "block";
    dcSend(remotePeerId, { type: "hello", from: S.myId, nodeKey: S.myNodeKey, ts: Date.now() });
    if (bothSiblingsOnline()) startBreath(true);
  };
  dc.onmessage = function (ev) {
    var data;
    try { data = JSON.parse(ev.data); } catch (e) { return; }
    if (data.type === "breath") onRemoteBreath(data);
    else if (data.type === "hello") meshLog("Hello <- " + (data.from || remotePeerId), "rx");
    else if (data.type === "care-flow") handleRemoteCareFlow(data);
    else if (data.type === "node-update") setNodeStatus(data.nodeKey, Object.assign({}, S.nodeStatus[data.nodeKey], data.status));
    else if (data.type === "ping") meshVibrate([80, 40, 80]);
  };
  dc.onclose = function () { closePeer(remotePeerId); };
  dc.onerror = function (err) { meshLog("DC error: " + err, "err"); };
}

function dcSend(peerId, data) {
  const dc = S.dataChannels.get(peerId);
  if (dc && dc.readyState === "open") dc.send(JSON.stringify(data));
}

function dcBroadcast(data) {
  S.dataChannels.forEach(function (_, peerId) { dcSend(peerId, data); });
}

function closePeer(peerId) {
  const dc = S.dataChannels.get(peerId);
  if (dc) { try { dc.close(); } catch (e) { /* */ } S.dataChannels.delete(peerId); }
  const pc = S.peerConns.get(peerId);
  if (pc) { try { pc.close(); } catch (e) { /* */ } S.peerConns.delete(peerId); }
  updatePeerCount();
  meshLog("Peer disconnected: " + peerId, "err");
  if (S.dataChannels.size === 0) {
    meshSetStatus("on", "Online — waiting for peers");
    document.getElementById("meshBreathCard").style.display = "none";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// NODE STATUS
// ══════════════════════════════════════════════════════════════════════════════
function setNodeStatus(key, status) {
  S.nodeStatus[key] = status;
  updateNodeList();
  if (autoSpectateCheck()) enableSpectateButton();
}

function updateNodeList() {
  const el = document.getElementById("meshNodeList");
  if (!el) return;
  el.innerHTML = "";
  Object.keys(FAMILY_NODES).forEach(function (key) {
    const cfg = FAMILY_NODES[key];
    const st = S.nodeStatus[key];
    const isOnline = st?.online;
    const isPlaying = st?.domain === "arcade";
    const isSpectating = st?.spectating;
    const row = document.createElement("div");
    row.className = "mesh-node-row";
    let dotClass = "mesh-node-dot-off";
    let tagText = "Offline";
    if (isPlaying) { dotClass = "mesh-node-dot-arcade"; tagText = "Arcade: Playing"; }
    else if (isSpectating) { dotClass = "mesh-node-dot-love"; tagText = "Love: Spectating"; }
    else if (isOnline) { dotClass = "mesh-node-dot-on"; tagText = domainTag(st?.domain); }
    row.innerHTML = '<div class="mesh-node-dot ' + dotClass + '"></div><span class="mesh-node-label">' + cfg.label + '</span><span class="mesh-node-tag">' + tagText + '</span>';
    el.appendChild(row);
  });
}

function domainTag(d) {
  if (d === "arcade") return "Arcade";
  if (d === "love") return "Love";
  if (d === "chump") return "CHUMP";
  return "Industry";
}

// ══════════════════════════════════════════════════════════════════════════════
// CARE FLOWS
// ══════════════════════════════════════════════════════════════════════════════
function emitCareFlow(sourceKey, targetKey, flowType, value) {
  const flow = {
    flowId: (Date.now().toString(36) + Math.random().toString(36).slice(2)),
    sourceNode: sourceKey, targetNode: targetKey,
    type: flowType, value: value || 1, ts: Date.now(),
  };
  S.careFlows.push(flow);
  dcBroadcast({ type: "care-flow", from: S.myId, flowId: flow.flowId, sourceNode: sourceKey, targetNode: targetKey, type: flowType, value: flow.value, ts: flow.ts });
  if (S.dataChannels.size === 0) {
    sendSignal({ type: "care-flow", from: S.myId, sourceNode: sourceKey, targetNode: targetKey, type: flowType, value: flow.value, ts: flow.ts });
  }
  spawnParticles(sourceKey, targetKey);
  meshLog("Care flow: " + sourceKey + " -> " + targetKey + " (" + flowType + ")", "tx");
  persistCRDT();
}

function handleRemoteCareFlow(data) {
  S.careFlows.push(data);
  if (data.sourceNode && data.targetNode) spawnParticles(data.sourceNode, data.targetNode);
  meshLog("Care flow: " + data.sourceNode + " -> " + data.targetNode + " (" + data.type + ")", "rx");
  persistCRDT();
}

// ══════════════════════════════════════════════════════════════════════════════
// SENTINEL SPECTATE
// ══════════════════════════════════════════════════════════════════════════════
function autoSpectateCheck() {
  return SIBLING_KEYS.some(function (key) {
    if (key === S.myNodeKey) return false;
    return S.nodeStatus[key]?.online && S.nodeStatus[key]?.domain === "arcade";
  });
}

function enableSpectateButton() {
  const btn = document.getElementById("meshBtnSpectate");
  if (btn) btn.disabled = false;
}

function getPlayingSibling() {
  return SIBLING_KEYS.find(function (key) {
    if (key === S.myNodeKey) return false;
    return S.nodeStatus[key]?.online && S.nodeStatus[key]?.domain === "arcade";
  }) || null;
}

function meshSpectate() {
  const targetKey = getPlayingSibling();
  if (!targetKey) { meshLog("Spectate: no sibling playing", "err"); return; }
  const st = S.nodeStatus[targetKey];
  const gameUrl = st.playingUrl || "about:blank";
  const gameId = gameUrl.split("/").pop()?.split("?")[0];
  if (gameId && SENTINEL_WHITELIST.indexOf(gameId) === -1) {
    meshLog("SENTINEL BLOCK: " + gameId, "err");
    return;
  }
  const iframe = document.getElementById("meshSpectateFrame");
  iframe.src = gameUrl + "?spectate=" + S.myId;
  iframe.style.display = "block";
  document.getElementById("meshBtnCloseSpectate").style.display = "block";
  broadcastNodeUpdate({ spectating: true, domain: "love" });
  emitCareFlow(S.myNodeKey, targetKey, "sibling_spectate", 2);
  meshLog("Spectating " + targetKey, "rx");
}

function meshCloseSpectate() {
  const iframe = document.getElementById("meshSpectateFrame");
  iframe.src = "about:blank";
  iframe.style.display = "none";
  document.getElementById("meshBtnCloseSpectate").style.display = "none";
  broadcastNodeUpdate({ spectating: false, domain: "industry" });
  meshLog("Spectate closed", "sys");
}

// ══════════════════════════════════════════════════════════════════════════════
// BREATHING
// ══════════════════════════════════════════════════════════════════════════════
function startBreath(auto) {
  if (S.breathActive) { stopBreath(); return; }
  S.breathActive = true;
  S.breathStart = Date.now();
  document.getElementById("meshBtnBreath").textContent = "STOP SYNC";
  meshLog((auto ? "Auto-" : "") + "Breath sync started (4-4-6)", "tx");
  breathTick();
  S.breathInterval = setInterval(breathTick, 100);
}

function stopBreath() {
  S.breathActive = false;
  clearInterval(S.breathInterval);
  S.breathInterval = null;
  document.getElementById("meshBtnBreath").textContent = "START SYNC";
  document.getElementById("meshBreathRing").className = "mesh-breath-ring";
  document.getElementById("meshBreathLabel").textContent = "READY";
  document.getElementById("meshBreathTimer").textContent = "—";
  meshLog("Breath sync stopped", "sys");
}

function breathTick() {
  const elapsed = (Date.now() - S.breathStart) % CYCLE_TOTAL;
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
      setTimeout(function () { ring.style.boxShadow = "none"; }, 600);
    }
  }
}

function meshVibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function bothSiblingsOnline() {
  return S.nodeStatus["sj"]?.online && S.nodeStatus["wj"]?.online;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPOON THEORY
// ══════════════════════════════════════════════════════════════════════════════
function updateSpoonUI() {
  const barsEl = document.getElementById("meshSpoonBars");
  const zoneEl = document.getElementById("meshSpoonZone");
  if (!barsEl || !zoneEl) return;
  barsEl.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const bar = document.createElement("div");
    bar.className = "mesh-spoon-bar" + (i < S.spoons ? " active" : "");
    if (S.spoons <= 1) bar.classList.add("red");
    else if (S.spoons <= 3) bar.classList.add("yellow");
    else bar.classList.add("green");
    barsEl.appendChild(bar);
  }
  if (S.spoons >= 6) zoneEl.textContent = "GREEN — Nominal";
  else if (S.spoons >= 3) zoneEl.textContent = "YELLOW — Reduction";
  else zoneEl.textContent = "RED — Critical Safe";
}

function applySpoonDegradation() {
  const s = S.spoons;
  updateSpoonUI();
  if (s >= 6) {
    edgeMat.opacity = EDGE_REST_OPACITY;
    internalFill.visible = true;
  } else if (s >= 3) {
    edgeMat.opacity = EDGE_REST_OPACITY * 0.6;
    internalFill.visible = false;
  } else {
    edgeMat.opacity = EDGE_REST_OPACITY * 0.3;
    internalFill.visible = false;
    if (S.breathActive) stopBreath();
  }
}

function decaySpoon() {
  if (S.spoons > 0) {
    S.spoons--;
    meshLog("Spoon consumed. Remaining: " + S.spoons, "sys");
    applySpoonDegradation();
    if (S.spoons > 0) {
      S.spoonDecayTimer = setTimeout(decaySpoon, SPOON_DECAY_MS);
    }
  }
}

function startSpoonDecay() {
  if (S.spoonDecayTimer) clearTimeout(S.spoonDecayTimer);
  S.spoonDecayTimer = setTimeout(decaySpoon, SPOON_DECAY_MS);
}

function startSpoonRecovery() {
  if (S.spoonRecoveryTimer) clearTimeout(S.spoonRecoveryTimer);
  S.spoonRecoveryTimer = setTimeout(function recover() {
    if (S.spoons < 6) {
      S.spoons++;
      meshLog("Spoon recovered. Total: " + S.spoons, "sys");
      applySpoonDegradation();
      if (S.spoons < 6) S.spoonRecoveryTimer = setTimeout(recover, SPOON_RECOVERY_MS);
    }
  }, SPOON_RECOVERY_MS);
}

function onMeaningfulInteraction(e) {
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
  S.lastInteraction = Date.now();
  startSpoonDecay();
  startSpoonRecovery();
}

// ══════════════════════════════════════════════════════════════════════════════
// CRDT
// ══════════════════════════════════════════════════════════════════════════════
function persistCRDT() {
  try {
    localStorage.setItem(CRDT_KEY, JSON.stringify({
      careFlows: S.careFlows.slice(-200),
      nodeStatus: S.nodeStatus,
      ts: Date.now(),
    }));
  } catch (e) { /* quota */ }
}

function restoreCRDT() {
  try {
    const raw = localStorage.getItem(CRDT_KEY);
    if (!raw) return;
    const blob = JSON.parse(raw);
    if (blob.nodeStatus) S.nodeStatus = Object.assign({}, S.nodeStatus, blob.nodeStatus);
    if (blob.careFlows) S.careFlows = blob.careFlows;
    meshLog("Restored offline state (" + (blob.careFlows?.length || 0) + " flows)", "sys");
  } catch (e) { /* corrupt */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// BROADCAST
// ══════════════════════════════════════════════════════════════════════════════
function broadcastNodeUpdate(status) {
  if (!S.myNodeKey) return;
  const payload = { type: "node-update", nodeKey: S.myNodeKey, status: status };
  dcBroadcast(payload);
  sendSignal(Object.assign({}, payload, { from: S.myId }));
  setNodeStatus(S.myNodeKey, Object.assign({}, S.nodeStatus[S.myNodeKey], status, { online: true, lastSeen: Date.now() }));
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
  const n = S.dataChannels.size;
  if (el) el.textContent = n > 0 ? n + " peer" + (n > 1 ? "s" : "") + " connected" : "";
}

// ══════════════════════════════════════════════════════════════════════════════
// SIMULATION
// ══════════════════════════════════════════════════════════════════════════════
function meshSimConnect() {
  S.simPeerId = "sim-peer-" + Math.random().toString(36).slice(2, 6);
  meshLog("Sim: virtual peer connected (" + S.simPeerId + ")", "sys");
  updatePeerCount();
  meshSetStatus("on", "Sim — 1 virtual peer");
  document.getElementById("meshBreathCard").style.display = "block";
  setNodeStatus("sj", { online: true, domain: "industry", playing: false, spectating: false, lastSeen: Date.now() });
  setNodeStatus("wj", { online: true, domain: "industry", playing: false, spectating: false, lastSeen: Date.now() });
}

function meshSimCareFlow() {
  const pairs = [["will","sj"],["sj","wj"],["wj","will"],["will","christyn"],["sj","christyn"],["wj","christyn"]];
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const types = ["coop_bonus", "parent_sponsor", "sibling_spectate", "checkin"];
  emitCareFlow(pair[0], pair[1], types[Math.floor(Math.random() * types.length)], Math.ceil(Math.random() * 3));
}

function meshSimSiblingPlaying() {
  const sibling = Math.random() > 0.5 ? "sj" : "wj";
  setNodeStatus(sibling, { online: true, domain: "arcade", playing: true, spectating: false, playingUrl: "https://p31ca.org/arcade/smallball", lastSeen: Date.now() });
  meshLog("Sim: " + sibling + " now playing smallball", "sys");
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL CALLBACKS
// ══════════════════════════════════════════════════════════════════════════════
window.meshJoinRoom = function () {
  const roomId = document.getElementById("meshRoomInput").value.trim();
  if (!roomId) return;
  S.myRoomId = roomId;
  meshLog("Joining room: " + roomId, "tx");
  connectSignaling(roomId, S.myId);
  broadcastNodeUpdate({ online: true });
};

window.meshConnect = function () {
  const remoteId = document.getElementById("meshPeerInput").value.trim();
  if (!remoteId) return;
  connectSignaling(remoteId, S.myId);
};

window.meshSpectate = meshSpectate;
window.meshCloseSpectate = meshCloseSpectate;
window.meshToggleBreath = function () { if (S.breathActive) stopBreath(); else startBreath(); };
window.meshSimConnect = meshSimConnect;
window.meshSimCareFlow = meshSimCareFlow;
window.meshSimSiblingPlaying = meshSimSiblingPlaying;

// ══════════════════════════════════════════════════════════════════════════════
// NODE KEY DETECTION
// ══════════════════════════════════════════════════════════════════════════════
function detectNodeKey() {
  const params = new URLSearchParams(window.location.search);
  const node = params.get("node")?.toLowerCase();
  if (FAMILY_NODES[node]) return node;
  return "will";
}

// ══════════════════════════════════════════════════════════════════════════════
// NOC
// ══════════════════════════════════════════════════════════════════════════════
function renderNoc() {
  const el = document.getElementById("meshNoc");
  if (!el) return;
  el.style.display = "block";
  el.innerHTML = "";
  const auditLink = document.createElement("div");
  auditLink.style.cssText = "margin:12px 0;padding:12px;background:rgba(182,90,216,0.08);border:1px solid rgba(182,90,216,0.2);border-radius:8px";
  auditLink.innerHTML = '<strong style="color:#b65ad8;font-size:13px">NOC Audit Suite</strong><p style="font-size:11px;color:rgba(216,214,208,0.7);margin:4px 0 8px">Run full E2E loopback tests: signaling, STUN/ICE, WebRTC handshake, data channel stress.</p><a href="./mesh-audit.html" style="font-size:12px;color:#22d3ee;text-decoration:none;font-family:monospace;padding:6px 14px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.25);border-radius:6px;display:inline-block">OPEN AUDIT SUITE →</a>';
  el.appendChild(auditLink);
  const auditLink = document.createElement("div");
  auditLink.style.cssText = "margin:12px 0;padding:12px;background:rgba(182,90,216,0.08);border:1px solid rgba(182,90,216,0.2);border-radius:8px";
  auditLink.innerHTML = '<strong style="color:#b65ad8;font-size:13px">NOC Audit Suite</strong><p style="font-size:11px;color:rgba(216,214,208,0.7);margin:4px 0 8px">Run full E2E loopback tests: signaling, STUN/ICE, WebRTC handshake, data channel stress.</p><a href="./mesh-audit.html" style="font-size:12px;color:#22d3ee;text-decoration:none;font-family:monospace;padding:6px 14px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.25);border-radius:6px;display:inline-block">OPEN AUDIT SUITE →</a>';
  el.appendChild(auditLink);
  const sections = [
    { name: "Identity", data: { myId: S.myId, myNodeKey: S.myNodeKey, room: S.myRoomId } },
    { name: "Connections", data: { peers: S.simPeerId ? [S.simPeerId] : [...S.peerConns.keys()], channels: [...S.dataChannels.keys()], spoons: S.spoons } },
    { name: "Node Status", data: S.nodeStatus },
    { name: "Care Flows (last 50)", data: S.careFlows.slice(-50) },
    { name: "ICE State", data: [...S.peerConns.entries()].map(function (e) { return { peer: e[0], ice: e[1].iceConnectionState, sig: e[1].signalingState }; }) },
  ];
  sections.forEach(function (s) {
    const sec = document.createElement("div");
    sec.style.cssText = "margin:12px 0;padding:12px;background:rgba(0,0,0,0.5);border-radius:8px";
    const h3 = document.createElement("h3");
    h3.textContent = s.name;
    h3.style.cssText = "font-size:13px;color:#eab308;margin:0 0 8px";
    sec.appendChild(h3);
    const pre = document.createElement("pre");
    pre.style.cssText = "font-size:11px;color:#d8d6d0;overflow-x:auto;margin:0;white-space:pre-wrap";
    pre.textContent = JSON.stringify(s.data, null, 2);
    sec.appendChild(pre);
    el.appendChild(sec);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════
(function init() {
  S.myId = genId();
  S.myNodeKey = detectNodeKey();
  S.myRoomId = "p31-family";

  restoreCRDT();
  applySpoonDegradation();

  const idEl = document.getElementById("meshMyId");
  if (idEl) {
    idEl.textContent = S.myId;
    idEl.addEventListener("click", function () {
      navigator.clipboard.writeText(S.myId).then(function () {
        meshLog("ID copied", "sys");
        const orig = idEl.textContent;
        idEl.textContent = "COPIED";
        setTimeout(function () { idEl.textContent = orig; }, 1000);
      });
    });
  }

  meshSetStatus("init", "Connecting to signaling...");
  connectSignaling(S.myRoomId, S.myId);

  if (S.myNodeKey) {
    setNodeStatus(S.myNodeKey, { online: true, domain: "industry", playing: false, spectating: false, lastSeen: Date.now() });
  }

  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  animate();

  document.addEventListener("click", onMeaningfulInteraction);
  document.addEventListener("touchstart", onMeaningfulInteraction);

  meshLog("K4 Family Mesh initialized — Larmor " + LARMOR_HZ + " Hz", "sys");

  var statusCard = document.getElementById("meshStatusCard");
  if (statusCard) {
    statusCard.style.cursor = "pointer";
    statusCard.addEventListener("click", function () {
      if (S.reconnectAttempts >= S.maxReconnectAttempts) {
        S.reconnectAttempts = 0;
        connectSignaling(S.myRoomId, S.myId);
      }
    });
  }

  if (S.nocMode) renderNoc();

  if (autoSpectateCheck()) enableSpectateButton();

  setInterval(function () {
    const now = Date.now();
    Object.keys(S.nodeStatus).forEach(function (key) {
      const st = S.nodeStatus[key];
      if (st.online && now - (st.lastSeen || 0) > NODE_TIMEOUT_MS) {
        setNodeStatus(key, Object.assign({}, st, { online: false }));
      }
    });
  }, 5000);
})();
