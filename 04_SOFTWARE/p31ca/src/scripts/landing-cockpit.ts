import { trimHzFromKnob, breathInhaleHz, breathExhaleHz } from "../lib/dome/p31-dome-constants";
import {
  TELEMETRY_URLS,
  fetchWithCache,
  formatTrimHz,
} from "../lib/dome/cockpit-shared";
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
let prevSpoonsForSunrise: number | undefined;

function applyQFavicon(score: number) {
  let stroke = "#4db8a8";
  if (score > 0.8) stroke = "#4db8a8";
  else if (score > 0.5) stroke = "#7a9e96";
  else if (score > 0.3) stroke = "#cda852";
  else stroke = "#cc6247";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="none" stroke="${stroke}" stroke-width="2" d="M16 4 L28 24 L4 24 Z"/></svg>`;
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

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
    if (typeof qData.score === "number" && Number.isFinite(qData.score)) applyQFavicon(qData.score);
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
    const sn = Number(spoonData.spoons);
    if (
      prevSpoonsForSunrise !== undefined &&
      Number.isFinite(sn) &&
      Number.isFinite(prevSpoonsForSunrise) &&
      Math.abs(sn - prevSpoonsForSunrise) >= 2
    ) {
      (window as unknown as { __p31SpoonSunrise?: () => void }).__p31SpoonSunrise?.();
    }
    prevSpoonsForSunrise = sn;
    currentSpoons = spoonData.spoons;
    if ($('nav-spoon-val')) $('nav-spoon-val').innerText = currentSpoons;
    if ($('nav-spoon-fill')) $('nav-spoon-fill').style.width = `${(currentSpoons/MAX_SPOONS)*100}%`;
  }

  await refreshMeshHud();
  void refreshStarfieldFromApi();
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
  $('trimtab-trigger')?.addEventListener('click', (e) => { if (e.target !== $trimCanvas) activateLayer0(); else if (!_trimIsDown) trimToggleAudio(); });
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
// 3. STARFIELD (2D canvas — canonical module from design-assets; mesh touches)
// ================================================================
type StarfieldApi = {
  destroy: () => void;
  setConfig: (partial: Record<string, unknown>) => void;
  fireBurst: (type: string, meta?: object) => void;
  ingestTouchHints: (h: Record<string, unknown>) => void;
  pulseAccommodationShimmer: () => void;
  spoonSunrise: () => void;
  setAccommodationNight: (n: boolean) => void;
};
type StarfieldMod = {
  initStarfield: (canvas: HTMLCanvasElement, config: unknown, opts?: Record<string, unknown>) => StarfieldApi;
  resolveStarfieldConfig: (apiUrl?: string) => Promise<{ config: unknown; hints: Record<string, unknown> }>;
};
let starfieldMod: StarfieldMod | null = null;
let starfieldApi: StarfieldApi | null = null;

function maybeAccommodationShimmer() {
  const d = new Date();
  if (d.getHours() !== 21 || d.getMinutes() > 10) return;
  const key = `p31_acc_shimmer_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    starfieldApi?.pulseAccommodationShimmer();
  } catch {
    /* private mode */
  }
}

async function refreshStarfieldFromApi() {
  if (!starfieldApi || !starfieldMod) return;
  try {
    const { config, hints } = await starfieldMod.resolveStarfieldConfig();
    starfieldApi.setConfig(config);
    starfieldApi.ingestTouchHints(hints);
    const mt = await import("../../../../../design-assets/starfield/p31-mesh-touches.js");
    let lastMed: number | null = null;
    try {
      lastMed = Number(localStorage.getItem(mt.STORAGE.lastMedTs)) || null;
    } catch {
      lastMed = null;
    }
    starfieldApi.ingestTouchHints({
      calciumWindowActive: mt.calciumWindowActive(Date.now(), lastMed),
    });
    maybeAccommodationShimmer();
    const hour = new Date().getHours();
    starfieldApi.setAccommodationNight(hour >= 21 && hour < 24);
  } catch {
    /* Gray Rock */
  }
}

const particleCanvas = document.getElementById("hub-particle-canvas");
if (particleCanvas instanceof HTMLCanvasElement) {
  void (async () => {
    try {
      const mod = (await import(
        "../../../../../design-assets/starfield/p31-starfield.js"
      )) as StarfieldMod;
      starfieldMod = mod;
      const { config, hints } = await mod.resolveStarfieldConfig();
      const pulsePollUrl =
        typeof window !== "undefined" &&
        (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
          ? "http://127.0.0.1:3131/api/mesh-pulse"
          : "";
      starfieldApi = mod.initStarfield(particleCanvas, config, {
        surface: "hub",
        touchRipple: true,
        ...(pulsePollUrl ? { pulsePollUrl } : {}),
      });
      starfieldApi.ingestTouchHints(hints);
      (window as unknown as { __p31SpoonSunrise?: () => void }).__p31SpoonSunrise = () =>
        starfieldApi?.spoonSunrise();
    } catch {
      /* offline */
    }
  })();
}

// Node detail panel: close only (face picking removed with WebGL hub shell)
const panel = $("node-detail-panel");
$("node-detail-close")?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (panel) {
    panel.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
  }
});

const domeBtnEarly = document.getElementById("btn-explore-dome");
if (domeBtnEarly) {
  domeBtnEarly.addEventListener("click", () => {
    window.location.href = "/dome";
  });
}
}

document.addEventListener('DOMContentLoaded', landingMain);
