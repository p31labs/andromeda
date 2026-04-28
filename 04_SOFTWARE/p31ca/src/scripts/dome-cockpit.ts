import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildGeoThree } from "../lib/dome/icosphere-to-three";
import {
  trimHzFromKnob,
  breathInhaleHz,
  breathExhaleHz,
} from "../lib/dome/p31-dome-constants";
import {
  TELEMETRY_URLS,
  fetchWithCache,
  formatTrimHz,
  readDomePerfLite,
} from "../lib/dome/cockpit-shared";
import { makeDomeCockpitFaceMaterial } from "../lib/dome/three-dome-materials";
import {
  fetchPersonalMeshForHud,
  formatMeshHudLine,
} from "../lib/mesh/mesh-snapshot";

// ================================================================
// 1. TELEMETRY & HUD STATE
// ================================================================
const $ = (id) => document.getElementById(id);

let currentSpoons = 10;
const MAX_SPOONS = 20;

// ================================================================
// 1a. INTERNATIONALIZATION (i18n)
// ================================================================
// Simple keyed translation system for future expansion
const i18n = {
  currentLang: 'en',
  messages: {
    en: {
      // Loading
      'loading.title': 'Materializing K4 Tetrahedron',
      'loading.initializing': 'Initializing...',
      'loading.details': 'Loading 3D scene',
      'loading.eta': 'ETA: ',
      // HUD
      'hud.cockpit': 'Cockpit',
      'hud.qFactor.label': 'Q-FACTOR:',
      'hud.qFactor.title': 'Fisher-Escolà Coherence Score',
      'hud.volume.title': 'Ambient Volume',
      'hud.volume.mute': 'Toggle mute',
      'hud.volume.sliderLabel': 'Volume control',
      'hud.volume.tooltip': '70%',
      'hud.connection.label': 'SYNC',
      'hud.connection.status.title': 'Connection status',
      'hud.connection.status.connected': 'Connected',
      'hud.connection.status.reconnecting': 'Reconnecting...',
      'hud.connection.status.failed': 'Connection failed',
      'hud.toggleUI': 'Toggle heads-up display',
      'hud.spoons.label': 'SPOONS',
      'hud.spoons.title': 'Vertex A: Operator State',
      'hud.love.label': 'L.O.V.E.',
      'hud.love.title': 'L.O.V.E. Ledger Balance',
      'hud.fleet.label': 'FLEET:',
      'hud.fleet.title': 'Active K4 Vertices',
      'hud.trimtab.label': 'Trimtab frequency control',
      'hud.trimtab.frequency': '863Hz',
      // Filters
      'filters.all': 'ALL',
      'filters.allAria': 'Show all axes',
      'filters.body': 'Body',
      'filters.bodyAria': 'Show Body axis only',
      'filters.mesh': 'Mesh',
      'filters.meshAria': 'Show Mesh axis only',
      'filters.forge': 'Forge',
      'filters.forgeAria': 'Show Forge axis only',
      'filters.shield': 'Shield',
      'filters.shieldAria': 'Show Shield axis only',
      'filters.groupLabel': 'Filter by axis',
      // Search
      'search.placeholder': 'Search topology...',
      'search.ariaLabel': 'Search topology nodes',
      // Stats & Legend
      'stats.nodes': 'NODES IDENTIFIED',
      'legend.active': 'Active',
      'legend.deployed': 'Deployed',
      'legend.countdown': 'Countdown',
      'legend.research': 'Research',
      'legend.missing': 'Missing',
      // Node Detail
      'nodeDetail.title': 'Node Name',
      'nodeDetail.axis': 'Axis',
      'nodeDetail.state': 'State',
      'nodeDetail.bus': 'Bus',
      'nodeDetail.close': 'Close node details',
      // Noscript
      'noscript.title': 'JavaScript Required',
      'noscript.description': 'The Sovereign Cockpit Dome requires JavaScript to render the 3D visualization and interactive elements. Please enable JavaScript in your browser settings.',
      'noscript.backLink': 'Back to hub',
      // Performance
      'perf.render': 'Render:',
      'perf.fps': 'FPS:',
      // Shortcuts
      'shortcuts.title': 'Keyboard Shortcuts',
      'shortcuts.close': 'Close shortcuts',
      'shortcuts.focusSearch': 'Focus search',
      'shortcuts.toggleUI': 'Toggle HUD',
      'shortcuts.activateLayer0': 'Activate Layer 0',
      'shortcuts.prompt': 'Press any key to close',
      // A11y scan
      'a11y.scanButton': 'A11y Scan',
      'a11y.violationsTitle': 'Accessibility violations found',
      'a11y.noViolations': 'No accessibility violations detected',
      // Errors
      'error.webgl.title': 'WebGL Not Supported',
      'error.webgl.message': 'Your browser or device does not support WebGL, which is required for the 3D visualization. Please try a modern browser like Chrome, Firefox, or Edge.',
      'error.loading.title': 'Loading Failed',
      'error.loading.message': 'Failed to load 3D resources. Please check your connection and try again.',
      'error.retry': 'Retry',
      // Layer 0
      'layer0.spoonsLabel': 'SPOONS',
      'layer0.inhale': 'INHALE',
      'layer0.escapeHint': 'Hold ESC for 3 seconds to disengage',
      'layer0.larmorFreq': 'Larmor Frequency: 863Hz Active',
      // Theme
      'theme.toggle': 'Theme: A'
    }
  },
  t(key) {
    return this.messages[this.currentLang][key] || key;
  },
  // Apply translations to DOM elements with data-i18n attributes
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      el.setAttribute('aria-label', this.t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  }
};

  // Apply i18n on load
  i18n.apply();

  const domePerfLite = readDomePerfLite();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Audio system singleton
let audioContext = null;
let masterGain = null;
let ambientOscillator = null;
let isAudioInitialized = false;

// Load volume from localStorage or default to 70%
const savedVolume = localStorage.getItem('p31:dome:volume') || '70';
const volumeSlider = $("hud-volume-slider");
if (volumeSlider) volumeSlider.value = savedVolume;
const volumeValue = $("hud-volume-value");
if (volumeValue) volumeValue.textContent = `${savedVolume}%`;

 // Initialize audio on first user interaction (browser requirement)
 function initAudio() {
   if (isAudioInitialized || prefersReducedMotion) return;
   
   try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    
    // Create ambient music oscillator (sine wave at 110Hz - A2 harmonic)
    ambientOscillator = audioContext.createOscillator();
    ambientOscillator.type = 'sine';
    ambientOscillator.frequency.setValueAtTime(110, audioContext.currentTime);
    
    // Connect: oscillator -> masterGain -> destination
    ambientOscillator.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Set initial volume from saved setting, fade in over 2 seconds
    const volume = parseInt(savedVolume);
    const gain = Math.pow(volume / 100, 2) * 0.3; // Max gain 0.3 at 100%
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(gain, audioContext.currentTime + 2.0);
    
    ambientOscillator.start();
    isAudioInitialized = true;
  } catch (e) {
    console.warn('Failed to initialize audio:', e);
  }
}

function initAudioOnInteraction() {
  if (isAudioInitialized) return;
  
  const initOnce = () => {
    initAudio();
    document.removeEventListener('click', initOnce);
    document.removeEventListener('keydown', initOnce);
    document.removeEventListener('touchstart', initOnce);
  };
  
  document.addEventListener('click', initOnce);
  document.addEventListener('keydown', initOnce);
  document.addEventListener('touchstart', initOnce);
}

// Custom Volume Slider State
let isMuted = localStorage.getItem('p31:dome:muted') === 'true';
const volumeSliderContainer = document.getElementById('volume-slider-container');
const volumeFill = document.getElementById('volume-fill');
const volumeThumb = document.getElementById('volume-thumb');
const volumeTooltip = document.getElementById('volume-tooltip');
const volumeMuteBtn = document.getElementById('volume-mute-btn');
const volumeIcon = document.getElementById('volume-icon');
const muteIcon = document.getElementById('mute-icon');
let currentVolume = parseInt(savedVolume);

function updateVolumeUI(vol, isMute = false) {
  const percent = isMute ? 0 : vol;
  if (volumeFill) volumeFill.style.width = `${percent}%`;
  if (volumeThumb) {
    const containerWidth = volumeSliderContainer ? volumeSliderContainer.offsetWidth : 80;
    const thumbLeft = Math.max(0, (percent / 100) * (containerWidth - 12));
    volumeThumb.style.left = `${thumbLeft}px`;
  }
  if (volumeValue) volumeValue.textContent = `${isMute ? 0 : vol}%`;
  if (volumeTooltip) volumeTooltip.textContent = `${isMute ? 0 : vol}%`;
  if (volumeIcon && muteIcon) {
    volumeIcon.classList.toggle('hidden', isMute);
    muteIcon.classList.toggle('hidden', !isMute);
  }
}

// Initialize volume UI
updateVolumeUI(currentVolume, isMuted);

// Set up volume slider (custom implementation)
if (volumeSliderContainer) {
  // Disable if reduced motion is preferred (audio disabled)
  if (prefersReducedMotion) {
    volumeSliderContainer.disabled = true;
    volumeSliderContainer.title = "Ambient audio disabled (prefers-reduced-motion)";
  }
  
  let isDragging = false;
  
  function handleVolumeInteraction(e) {
    e.preventDefault();
    const rect = volumeSliderContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    
    currentVolume = Math.round(percent);
    updateVolumeUI(currentVolume, isMuted);
    
    // Show tooltip
    if (volumeTooltip) {
      volumeTooltip.style.opacity = '1';
      volumeTooltip.style.left = `${percent}%`;
    }
    
    // Update audio
    localStorage.setItem('p31:dome:volume', currentVolume.toString());
    if (masterGain && audioContext && !isMuted) {
      const gain = Math.pow(currentVolume / 100, 2) * 0.3;
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(gain, audioContext.currentTime, 0.01);
    }
    
    // Haptic feedback if supported and not reduced motion
    if (navigator.vibrate && !prefersReducedMotion) {
      navigator.vibrate(10);
    }
  }
  
  volumeSliderContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleVolumeInteraction(e);
  });
  
  volumeSliderContainer.addEventListener('touchstart', (e) => {
    isDragging = true;
    handleVolumeInteraction(e);
  }, { passive: false });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) handleVolumeInteraction(e);
  });
  
  document.addEventListener('touchmove', (e) => {
    if (isDragging) handleVolumeInteraction(e);
  }, { passive: false });
  
  const stopDrag = () => {
    isDragging = false;
    if (volumeTooltip) volumeTooltip.style.opacity = '0';
  };
  
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);
}

// Mute toggle
if (volumeMuteBtn) {
  volumeMuteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem('p31:dome:muted', isMuted.toString());
    updateVolumeUI(currentVolume, isMuted);
    
    if (masterGain && audioContext) {
      if (isMuted) {
        masterGain.gain.cancelScheduledValues(audioContext.currentTime);
        masterGain.gain.setTargetAtTime(0.001, audioContext.currentTime, 0.01);
      } else {
        const gain = Math.pow(currentVolume / 100, 2) * 0.3;
        masterGain.gain.cancelScheduledValues(audioContext.currentTime);
        masterGain.gain.setTargetAtTime(gain, audioContext.currentTime, 0.01);
      }
    }
    
    // Haptic feedback
    if (navigator.vibrate && !prefersReducedMotion) {
      navigator.vibrate(20);
    }
  });
}

// Initialize audio on first user interaction
initAudioOnInteraction();

  const updateTelemetry = async () => {
    // Q-Factor
    const qData = await fetchWithCache(TELEMETRY_URLS.qFactor, "p31_cache_qfactor", { score: 0.925, vertexHealth: { A:1, B:1, C:1, D:1 } });
 if (qData && qData.score) {
   const score = qData.score.toFixed(3);
   const isOpt = qData.score >= 0.9, isStab = qData.score >= 0.7;
   const colorClass = isOpt ? "text-[#3ba372]" : isStab ? "text-[#cda852]" : "text-[#E8636F]";
   const bgClass = isOpt ? "bg-[#3ba372]" : isStab ? "bg-[#cda852]" : "bg-[#E8636F]";
   
   const nq = $("hud-q-val"), nd = $("hud-q-dot");
   if (nq) { nq.innerText = score; nq.className = `font-bold tracking-wider ${colorClass}`; }
   if (nd) { nd.className = `w-2 h-2 rounded-full animate-pulse ${bgClass}`; nd.style.boxShadow = `0 0 8px ${isOpt?"#3ba372":isStab?"#cda852":"#E8636F"}`; }
 }

    // LOVE
    const loveData = await fetchWithCache(TELEMETRY_URLS.love, "p31_cache_love", { availableBalance: 3.28 });
    const loveEl = $("hud-love-val");
    if (loveEl && loveData) {
      const v =
        loveData.availableBalance ?? loveData.balance ?? loveData.available;
      if (typeof v === "number" && Number.isFinite(v)) {
        loveEl.textContent = v.toFixed(2);
      }
    }

    // Spoons
    const spoonData = await fetchWithCache(TELEMETRY_URLS.spoons, "p31_cache_spoons", { spoons: 10 });
 if (spoonData.spoons !== undefined) {
   currentSpoons = spoonData.spoons;
   if ($("hud-spoon-val")) $("hud-spoon-val").innerText = currentSpoons;
   if ($("hud-spoon-fill")) $("hud-spoon-fill").style.width = `${(currentSpoons/MAX_SPOONS)*100}%`;
 }

    await refreshMeshHud();
  };

  async function refreshMeshHud() {
    const meshP = await fetchPersonalMeshForHud();
    const { vit, love, detail } = formatMeshHudLine(meshP);
    const vEl = $("hud-mesh-vit");
    const veEl = $("hud-mesh-ve");
    const dEl = $("hud-mesh-detail");
    if (vEl) vEl.textContent = vit;
    if (veEl) veEl.textContent = love;
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
  // 2. EDE TRIMTAB & LAYER 0 (Somatic Breathing)
  // ================================================================
  const $trimCanvas = $("trimtab-canvas");
  const $trimFreq = $("trimtab-freq");
  let trimValue = 1.0; 
  let trimOn = false;
  let trimAudioCtx = null, trimOsc = null, trimGain = null;
  let _trimIsDown = false, _trimAngle = null;

  function trimFreq() { return trimHzFromKnob(trimValue); }

  function drawTrimtab() {
 const ctx = $trimCanvas.getContext("2d");
 ctx.clearRect(0, 0, 24, 24);
 const cx = 12, cy = 12, r = 8, start = 3*Math.PI/4, sweep = 3*Math.PI/2;
 
 ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2; ctx.lineCap = "round";
 ctx.beginPath(); ctx.arc(cx, cy, r, start, start + sweep); ctx.stroke();

 const valEnd = start + trimValue * sweep;
 ctx.strokeStyle = trimOn ? "#cda852" : "rgba(205,168,82,0.4)";
 ctx.beginPath(); ctx.arc(cx, cy, r, start, valEnd); ctx.stroke();

 ctx.fillStyle = trimOn ? "#cda852" : "rgba(205,168,82,0.6)";
 ctx.beginPath(); ctx.arc(cx + r*Math.cos(valEnd), cy + r*Math.sin(valEnd), 2.5, 0, Math.PI*2); ctx.fill();

    const f = trimFreq();
    if ($trimFreq) $trimFreq.innerText = formatTrimHz(f);
  }

  function trimToggleAudio() {
 trimOn = !trimOn;
 if (trimOn) {
   try {
     if (!trimAudioCtx) trimAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
     if(trimAudioCtx.state === "suspended") trimAudioCtx.resume();
     trimOsc = trimAudioCtx.createOscillator(); trimGain = trimAudioCtx.createGain();
     trimOsc.type = "sine"; trimOsc.frequency.setValueAtTime(trimFreq(), trimAudioCtx.currentTime);
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

  $trimCanvas.addEventListener("pointerdown", e => {
 e.preventDefault(); $trimCanvas.setPointerCapture(e.pointerId);
 _trimIsDown = true;
 const rect = $trimCanvas.getBoundingClientRect();
 _trimAngle = Math.atan2(e.clientY - rect.top - 12, e.clientX - rect.left - 12);
  });
  $trimCanvas.addEventListener("pointermove", e => {
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
  $trimCanvas.addEventListener("pointerup", trimUp);
  $trimCanvas.addEventListener("pointercancel", trimUp);
  
  $("trimtab-trigger").addEventListener("click", (e) => { 
 if (e.target !== $trimCanvas) activateLayer0(); 
 else if (!_trimIsDown) trimToggleAudio(); 
  });
  
  drawTrimtab();

  // Layer 0 Logic
  let l0Timer = null, l0Audio = null, escStart = null, escTimer = null, spoons = 15;
  
  function activateLayer0() {
 $("layer0").classList.remove("opacity-0", "pointer-events-none");
 if (!l0Timer) runBreathCycle();
 if (!trimOn) trimToggleAudio(); // start hum
  }
  
  function deactivateLayer0() {
 $("layer0").classList.add("opacity-0", "pointer-events-none");
 clearTimeout(l0Timer); l0Timer = null;
 if (l0Audio) { try { l0Audio.close(); } catch(e){} l0Audio = null; }
  }

  function playBreath(phase, durMs, freq) {
 $("l0-phase").innerText = phase;
 const dot = $("l0-dot");
 dot.style.animation = "none"; void dot.offsetWidth;
 dot.style.animation = `l0-${phase.toLowerCase()} ${durMs}ms ease-in-out forwards`;
 
 // Regen spoons slowly
 if(phase === "INHALE" && spoons < 20) {
   spoons += 0.5;
   $("l0-spoon-fill").style.width = `${(spoons/20)*100}%`;
   $("l0-spoon-pct").innerText = `${Math.round((spoons/20)*100)}%`;
   $("hud-spoon-fill").style.width = `${(spoons/20)*100}%`;
   $("hud-spoon-val").innerText = Math.floor(spoons);
 }

 if (!freq) return;
 try {
   if (!l0Audio) l0Audio = new (window.AudioContext || window.webkitAudioContext)();
   if(l0Audio.state === "suspended") l0Audio.resume();
   const osc = l0Audio.createOscillator(), gain = l0Audio.createGain();
   osc.frequency.setValueAtTime(freq, l0Audio.currentTime); osc.type = "sine";
   gain.gain.setValueAtTime(0, l0Audio.currentTime);
   gain.gain.linearRampToValueAtTime(0.04, l0Audio.currentTime + 0.4);
   gain.gain.linearRampToValueAtTime(0, l0Audio.currentTime + (durMs/1000) - 0.4);
   osc.connect(gain); gain.connect(l0Audio.destination);
   osc.start(); osc.stop(l0Audio.currentTime + (durMs/1000));
 } catch(e) {}
  }

  function runBreathCycle() {
    playBreath("INHALE", 4000, breathInhaleHz());
    l0Timer = setTimeout(() => {
      playBreath("HOLD", 4000, null);
      l0Timer = setTimeout(() => {
        playBreath("EXHALE", 6000, breathExhaleHz());
        l0Timer = setTimeout(runBreathCycle, 6000);
      }, 4000);
    }, 4000);
  }

  document.addEventListener("keydown", e => {
 if (e.key !== "Escape" || $("layer0").classList.contains("pointer-events-none")) return;
 e.preventDefault();
 if (escStart) return;
 escStart = Date.now();
 $("l0-escape-fill").style.transition = "width 3s linear";
 $("l0-escape-fill").style.width = "100%";
 escTimer = setTimeout(() => { deactivateLayer0(); escStart = null; $("l0-escape-fill").style.width = "0%"; }, 3000);
  });
  document.addEventListener("keyup", e => {
 if (e.key === "Escape") { clearTimeout(escTimer); escStart = null; $("l0-escape-fill").style.transition = "width 0.15s linear"; $("l0-escape-fill").style.width = "0%"; }
  });

  // Global toggle UI
  window.toggleUI = () => {
 const isHidden = $("top-hud").classList.contains("-translate-y-full");
 $("top-hud").classList.toggle("-translate-y-full", !isHidden);
 $("left-hud").classList.toggle("opacity-0", !isHidden);
 $("left-hud").classList.toggle("pointer-events-none", !isHidden);
  };

  document.addEventListener("keydown", (e) => {
 if(e.key === "Tab") { e.preventDefault(); window.toggleUI(); }
  });

// ================================================================
// 3. WEBGL SPACESHIP EARTH DOME (Three.js)
// ================================================================

// Loading manager for progress tracking and error handling
const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(`Started loading: ${url} (${itemsLoaded}/${itemsTotal})`);
};

loadingManager.onLoad = () => {
  console.log('All resources loaded');
  // Hide loading screen — stop blocking input immediately (opacity alone keeps hit target)
  const loadingScreen = $('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.pointerEvents = 'none';
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 1000);
  }
  // Audio will initialize on first user interaction (initAudioOnInteraction)
};

 // Track time for ETA calculation
 let loadStartTime = Date.now();
 let estimatedTotalTime = 0;
 
 loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
   const progress = itemsLoaded / itemsTotal;
   const progressBar = $('loading-bar');
   const loadingText = $('loading-text');
   const loadingDetails = $('loading-details');
   const loadingETA = $('loading-eta');
   
   if (progressBar) progressBar.style.width = `${progress * 100}%`;
   if (loadingText) loadingText.textContent = `Loading... ${Math.round(progress * 100)}%`;
   if (loadingDetails) loadingDetails.textContent = `${itemsLoaded} of ${itemsTotal} resources`;
   
   // Calculate ETA
   if (loadingETA && progress > 0) {
     const elapsedTime = Date.now() - loadStartTime;
     const estimatedTotal = elapsedTime / progress;
     const remainingTime = estimatedTotal - elapsedTime;
     if (remainingTime > 0 && !isNaN(remainingTime)) {
       const seconds = Math.max(0, Math.floor(remainingTime / 1000));
       loadingETA.textContent = `${i18n.t('loading.eta')}${seconds}s`;
     }
   }
 };

loadingManager.onError = (url) => {
  console.error(`Failed to load: ${url}`);
  showLoadingError();
};

// Check WebGL support before proceeding
let webglSupported = true;
try {
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
  if (!gl) webglSupported = false;
} catch (e) {
  webglSupported = false;
}

if (!webglSupported) {
  showWebGLError();
  const loadingScreenFail = $('loading-screen');
  if (loadingScreenFail) {
    loadingScreenFail.style.pointerEvents = 'none';
    loadingScreenFail.style.opacity = '0';
    setTimeout(() => { loadingScreenFail.style.display = 'none'; }, 400);
  }
} else {
const container = $("webgl-container");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.5, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const maxPR = domePerfLite ? 1 : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(maxPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// Camera Controls (Orbit)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
controls.minDistance = 3;
controls.maxDistance = 10;
controls.enablePan = false;

// Respect user's motion preferences
if (prefersReducedMotion) {
  controls.autoRotate = false;
  controls.enableZoom = false;
} else {
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
}

// Touch gestures: OrbitControls handles pinch zoom and single-finger rotate by default
// No additional configuration needed

// Post Processing
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

  // Lighting
  scene.add(new THREE.AmbientLight(0x0a0a0a, 0.5));
  const domeLight = new THREE.PointLight(0x1a2a3a, 2, 15);
  domeLight.position.set(0, 0, 0);
  scene.add(domeLight);

  // Data
  const AXIS_COLORS = { a: 0xff9944, b: 0x44aaff, c: 0x44ffaa, d: 0xff4466 };
  const AXIS_LABELS = { a: 'Operator', b: 'Signals', c: 'Context', d: 'Shield' };
  const STATE_CSS = { active: '#3ba372', deployed: '#25897d', countdown: '#cda852', complete: '#4db8a8', missing: '#cc6247', ongoing: '#25897d', prototype: '#cda852', research: '#4db8a8' };
  const STATE_GLOW = { countdown: 2.0, critical: 2.5, complete: 0.4, active: 1.0, ongoing: 0.6, deployed: 0.7, prototype: 0.8, missing: 1.2, research: 0.5 };

  const VERTICES = {
 'operator-state': ['Vertex A: Operator', 4, 0, 0, 0, 'active', 'vital', 'Spoons, Bio, Medication'],
 'signal-processor': ['Vertex B: Signals', 0, 4, 0, 0, 'active', 'ac', 'Message Queue, Fawn Guard'],
 'context-engine': ['Vertex C: Context', 0, 0, 4, 0, 'active', 'dc', 'Timeline, Mesh Topology'],
 'shield-engine': ['Vertex D: Shield', 0, 0, 0, 4, 'active', 'ac', 'AI Orchestration, Synthesis'],
 'bonding': ['BONDING', 0, 3, 1, 0, 'deployed', 'ac', 'WebRTC Social Protocol'],
 'spaceship': ['Spaceship Earth', 0, 1, 3, 0, 'deployed', 'ac', 'Sovereign Command Center'],
 'ede': ['EDE', 1, 1, 2, 0, 'deployed', 'ac', 'Browser IDE & Compiler'],
 'buffer': ['The Buffer', 2, 1, 1, 0, 'active', 'dc', 'Voltage Gate'],
 'love-econ': ['L.O.V.E. Ledger', 1, 1, 2, 0, 'deployed', 'ac', 'Care Economy'],
 'genesis': ['Genesis Gate', 0, 1, 3, 0, 'building', 'ac', 'Auth Node'],
 'fawn': ['Fawn Guard', 0, 3, 0, 1, 'active', 'ac', 'Trauma Interceptor'],
 'node-zero': ['Node Zero', 1, 0, 3, 0, 'prototype', 'dc', 'Hardware Rig'],
 'alchemy': ['Neuro-Cognition Alchemy', 1, 1, 1, 1, 'research', 'dc', 'Zenodo Published'],
 'p31-mesh': ['P31 Mesh', 0, 1, 3, 0, 'active', 'dc', 'CRDT PGLite Sync'],
 'vault': ['P31 Vault', 0, 0, 3, 1, 'building', 'ac', 'Encrypted Storage'],
 'oqe-icosa': [
   'OQE Icosa (forensic)',
   1,
   1,
   1,
   1,
   'deployed',
   'dc',
   'Twenty-face contradiction map. Short /oqe; lexicon /p31-oqe-twenty.json; schema p31.oqeTwenty',
 ],
  };

  const EDGES = [
 ['operator-state', 'signal-processor', 'modulates'],
 ['operator-state', 'context-engine', 'timeline'],
 ['operator-state', 'shield-engine', 'prompt_context'],
 ['signal-processor', 'context-engine', 'metadata'],
 ['signal-processor', 'shield-engine', 'analysis'],
 ['context-engine', 'shield-engine', 'alignment'],
 ['bonding', 'love-econ', 'earns'],
 ['spaceship', 'p31-mesh', 'reads'],
 ['ede', 'shield-engine', 'compiles'],
 ['fawn', 'signal-processor', 'filters'],
 ['vault', 'operator-state', 'protects'],
 ['oqe-icosa', 'context-engine', 'forensic_index'],
  ];

  $("node-count").innerText = `${Object.keys(VERTICES).length} ${i18n.t('stats.nodes')}`;

  function getDominantAxis(a,b,c,d) { const v={a,b,c,d}; let m=-1, ax='a'; for(let k of ['a','b','c','d']) { if(v[k]>m) { m=v[k]; ax=k; } } return ax; }
  function getNodeColor(a,b,c,d) { const s=a+b+c+d||1, col=new THREE.Color(0); const ac={a:new THREE.Color(AXIS_COLORS.a),b:new THREE.Color(AXIS_COLORS.b),c:new THREE.Color(AXIS_COLORS.c),d:new THREE.Color(AXIS_COLORS.d)}; for(let k of ['a','b','c','d']) { const w=({a,b,c,d})[k]/s; col.r+=ac[k].r*w; col.g+=ac[k].g*w; col.b+=ac[k].b*w; } return col; }

  const TETRA = [new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1/3,Math.sqrt(8/9)), new THREE.Vector3(-Math.sqrt(2/3),-1/3,-Math.sqrt(2/9)), new THREE.Vector3(Math.sqrt(2/3),-1/3,-Math.sqrt(2/9))];
  function nodeDir(a,b,c,d) { const s=a+b+c+d||1, dir=new THREE.Vector3(0,0,0); dir.addScaledVector(TETRA[0],a/s); dir.addScaledVector(TETRA[1],b/s); dir.addScaledVector(TETRA[2],c/s); dir.addScaledVector(TETRA[3],d/s); return dir.normalize(); }

  // Build Geodesic Geometry (see src/lib/dome/icosphere-geometry.ts)
  const RADIUS = 3.5;
  const geo = buildGeoThree(RADIUS, 2);
  const faceMeshes = [];
  const nodeToFace = new Map();

  const domeGroup = new THREE.Group();
  scene.add(domeGroup);

  // Map Nodes to Faces
  const sortedNodes = Object.entries(VERTICES).map(([id,d])=>({id, label:d[0], a:d[1], b:d[2], c:d[3], d:d[4], state:d[5], bus:d[6], notes:d[7], dir:nodeDir(d[1],d[2],d[3],d[4]), p:d[5]==='countdown'?0:1})).sort((x,y)=>x.p-y.p);
  const usedFaces = new Set();
  const assignments = [];
  for(const n of sortedNodes) {
 let best=-1, bd=-2;
 for(let i=0; i<geo.faces.length; i++) {
   if(usedFaces.has(i)) continue;
   const dot=geo.faces[i].centroid.clone().normalize().dot(n.dir);
   if(dot>bd) {bd=dot; best=i;}
 }
 if(best>=0) {
   usedFaces.add(best);
   const a={faceIdx:best, node:n, color:getNodeColor(n.a,n.b,n.c,n.d), glow:STATE_GLOW[n.state]||0.5};
   assignments.push(a);
   nodeToFace.set(n.id, a);
   geo.faces[best].assignment = a;
 }
  }

  // 1. Construct 3D Tetrahedral Blocks
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

 const mat = makeDomeCockpitFaceMaterial(
   a ? { glow: a.glow, color: a.color } : null,
   domePerfLite
 );

 const mesh=new THREE.Mesh(tGeo, mat);

 // Edge definitions attached to each block
 const edgeGeo = new THREE.EdgesGeometry(tGeo);
 const edgeMat = new THREE.LineBasicMaterial({
   color: a ? a.color : 0x223344,
   transparent: true,
   opacity: a ? 0.8 : 0.3,
   blending: THREE.AdditiveBlending
 });
 const blockEdges = new THREE.LineSegments(edgeGeo, edgeMat);
 mesh.add(blockEdges);

 // Interactive animation state
 mesh.userData = {
   a,
   centroidDir: cent.clone().normalize(),
   randomPhase: Math.random() * Math.PI * 2,
   currentOffset: 0,
   targetOffset: 0
 };

 domeGroup.add(mesh);
 faceMeshes.push(mesh);
  }

  // 2. Global Wireframe Encapsulation Layer (The Grid)
  const wPos=[], eProg=[];
  for(let i=0; i<geo.edges.length; i++) {
 const [a,b]=geo.edges[i];
 wPos.push(geo.verts[a].x, geo.verts[a].y, geo.verts[a].z, geo.verts[b].x, geo.verts[b].y, geo.verts[b].z);
 eProg.push(i/geo.edges.length, i/geo.edges.length);
  }
  const wGeo=new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
  wGeo.setAttribute('edgeProgress', new THREE.Float32BufferAttribute(eProg, 1));
  const wMat=new THREE.ShaderMaterial({
 uniforms:{uTime:{value:0}},
 vertexShader:`attribute float edgeProgress; varying float vP; void main(){vP=edgeProgress; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform float uTime; varying float vP; void main(){ float p=smoothstep(0.,0.05,fract(vP-uTime*0.08))*(1.-smoothstep(0.05,0.1,fract(vP-uTime*0.08))); gl_FragColor=vec4(0.2,0.4,0.5,0.15+p*0.7); }`,
 transparent:true,
 depthWrite:false,
 blending: THREE.AdditiveBlending
  });
  const wireMesh = new THREE.LineSegments(wGeo, wMat);
  wireMesh.scale.setScalar(1.02); // Push outward to encapsulate the blocks
  domeGroup.add(wireMesh);

  // 3. Central Core and Inner Struts (Connections)
  const strutGeo = new THREE.BufferGeometry();
  const strutPos = [];
  for(let i=0; i<geo.faces.length; i++) {
   const cent = geo.faces[i].centroid;
   const inner = cent.clone().multiplyScalar(0.85); // Matches `vd` inner block point
   strutPos.push(inner.x, inner.y, inner.z);
   strutPos.push(0, 0, 0); // Connects to origin
  }
  strutGeo.setAttribute('position', new THREE.Float32BufferAttribute(strutPos, 3));
  const strutMat = new THREE.LineBasicMaterial({ color: 0x112233, transparent: true, opacity: 0.5 });
  const struts = new THREE.LineSegments(strutGeo, strutMat);
  domeGroup.add(struts);

  const coreGeo = new THREE.IcosahedronGeometry(0.4, 1);
  const coreMat = new THREE.MeshPhysicalMaterial({ color: 0x4db8a8, emissive: 0x4db8a8, emissiveIntensity: 2.0, wireframe: true });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  domeGroup.add(coreMesh);

  // Deep Molecular Soup
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

  // ================================================================
  // 4. INTERACTION & RAYCASTING
  // ================================================================
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selectedNode = null;
  let activeAxis = 'all';

  // Filter Logic
  document.querySelectorAll('#axis-filters button').forEach(btn => {
 btn.addEventListener('click', (e) => {
   document.querySelectorAll('#axis-filters button').forEach(b => {
     b.classList.remove('bg-white/10', 'border-white/20');
     b.classList.add('bg-p31-void', 'border-white/5');
   });
   e.target.classList.add('bg-white/10', 'border-white/20');
   e.target.classList.remove('bg-p31-void', 'border-white/5');

   activeAxis = e.target.dataset.axis;
   applyFilters();
 });
  });

  $('search-input').addEventListener('input', applyFilters);

  function applyFilters() {
 const q = $('search-input').value.toLowerCase().trim();

 for(const m of faceMeshes) {
   const a = m.userData.a;
   if(!a) { m.visible = !(q || activeAxis !== 'all'); continue; }

   const n = a.node;
   let visible = true;
   if(activeAxis !== 'all' && getDominantAxis(n.a, n.b, n.c, n.d) !== activeAxis) visible = false;
   if(q && ![n.label, n.id, n.notes||'', n.state].some(s => s.toLowerCase().includes(q))) visible = false;

   m.visible = visible;
   if(visible) {
     m.material.opacity = 0.9;
     m.material.emissiveIntensity = a.glow >= 1.0 ? 3.0 : 1.2;
   } else {
     m.material.opacity = 0.05;
     m.material.emissiveIntensity = 0;
   }
 }
  }

  // Hover & Click
  window.addEventListener('pointermove', e => {
 pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
 pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

 if(e.target.tagName !== 'CANVAS') { document.body.style.cursor = 'default'; return; }

 raycaster.setFromCamera(pointer, camera);
 const hits = raycaster.intersectObjects(faceMeshes);
 document.body.style.cursor = (hits.length && hits[0].object.userData.a) ? 'pointer' : 'grab';
  });

  window.addEventListener('click', e => {
 if(e.target.tagName !== 'CANVAS') return;

 raycaster.setFromCamera(pointer, camera);
 const hits = raycaster.intersectObjects(faceMeshes);
 const panel = $('node-detail-panel');

 if (hits.length && hits[0].object.userData.a) {
   const n = hits[0].object.userData.a.node;
   selectedNode = n;
   $('nd-title').innerText = n.label;

   const ax = getDominantAxis(n.a, n.b, n.c, n.d);
   $('nd-axis').innerText = AXIS_LABELS[ax];
   $('nd-axis').style.color = '#' + AXIS_COLORS[ax].toString(16);

   $('nd-state').innerText = n.state;
   $('nd-state').style.color = STATE_CSS[n.state] || '#d8d6d0';
   $('nd-state').style.borderColor = STATE_CSS[n.state] || '#d8d6d0';

   $('nd-bus').innerText = n.bus;
   $('nd-notes').innerText = n.notes || 'Core topology node verified by K4 edge network.';

   const edges = EDGES.filter(e => e[0] === n.id || e[1] === n.id);
   $('nd-conns').innerHTML = edges.length ? edges.map(e => {
     const otherId = e[0] === n.id ? e[1] : e[0];
     const other = VERTICES[otherId];
     return other ? `<span class="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] hover:bg-white/10 transition-colors">${other[0]}</span>` : '';
   }).join('') : '<span class="text-xs text-p31-muted-50 italic">Isolated Node</span>';

   panel.classList.remove('opacity-0', 'translate-x-10', 'pointer-events-none');

   // Fly camera
   const targetPos = hits[0].object.userData.centroidDir.clone().multiplyScalar(7);
   camera.position.lerp(targetPos, 0.1);
 } else {
   selectedNode = null;
   panel.classList.add('opacity-0', 'translate-x-10', 'pointer-events-none');
 }

 // Interaction State Update
 for(const m of faceMeshes) {
   const a = m.userData.a;
   if(!a) continue;
   if(selectedNode && a.node.id === selectedNode.id) {
     m.material.emissiveIntensity = 4.0;
     m.material.opacity = 1.0;
     m.userData.targetOffset = 0.5; // POP OUT the selected block
   } else {
     m.material.emissiveIntensity = a.glow >= 1.0 ? 2.5 : 0.8;
     m.material.opacity = selectedNode ? 0.2 : 0.9;
     m.userData.targetOffset = 0.0;
   }
 }
  });

$('node-detail-close').addEventListener('click', () => {
  selectedNode = null;
  $('node-detail-panel').classList.add('opacity-0', 'translate-x-10', 'pointer-events-none');
  for(const m of faceMeshes) {
    const a = m.userData.a;
    if(a) {
      m.material.emissiveIntensity = a.glow >= 1.0 ? 3.0 : 1.2;
      m.material.opacity = 0.9;
    }
    m.userData.targetOffset = 0.0;
  }
});

// ================================================================
// 5. ERROR HANDLING
// ================================================================
 function showWebGLError() {
   const container = $("webgl-container");
   if (container) {
     container.innerHTML = `
       <div class="flex flex-col items-center justify-center h-full text-center p-6">
         <svg width="64" height="64" viewBox="0 0 512 512" class="mb-6"><rect width="512" height="512" rx="112" fill="#25897d"/><circle cx="390" cy="120" r="48" fill="#cc6247"/><text x="256" y="340" font-family="system-ui" font-weight="900" font-size="220" fill="#d8d6d0" text-anchor="middle">P31</text><rect x="156" y="380" width="200" height="16" rx="8" fill="#cda852"/></svg>
         <h2 class="text-2xl font-bold text-red-400 mb-3" data-i18n="error.webgl.title">WebGL Not Supported</h2>
         <p class="text-p31-cloud mb-6" data-i18n="error.webgl.message">Your browser or device does not support WebGL, which is required for the 3D visualization. Please try a modern browser like Chrome, Firefox, or Edge.</p>
         <button onclick="location.reload()" class="px-6 py-3 bg-white/20 hover:bg-white/30 text-p31-cloud rounded transition-colors" data-i18n="error.retry">Retry</button>
       </div>
     `;
     // Apply i18n to the error message
     i18n.apply();
   }
 }

 function showLoadingError() {
   const loadingScreen = $("loading-screen");
   if (!loadingScreen) return;
   
   loadingScreen.innerHTML = `
     <div class="flex flex-col items-center justify-center text-center">
       <svg width="64" height="64" viewBox="0 0 512 512" class="mb-8"><rect width="512" height="512" rx="112" fill="#25897d"/><circle cx="390" cy="120" r="48" fill="#cc6247"/><text x="256" y="340" font-family="system-ui" font-weight="900" font-size="220" fill="#d8d6d0" text-anchor="middle">P31</text><rect x="156" y="380" width="200" height="16" rx="8" fill="#cda852"/></svg>
       <div class="text-red-400 font-bold mb-4" data-i18n="error.loading.title">Loading Failed</div>
       <div class="text-p31-cloud mb-6" data-i18n="error.loading.message">Failed to load 3D resources. Please check your connection and try again.</div>
       <button onclick="location.reload()" class="px-6 py-3 bg-white/20 hover:bg-white/30 text-p31-cloud rounded transition-colors" data-i18n="error.retry">Retry</button>
     </div>
   `;
   i18n.apply();
 }

// ================================================================
// 5. ANIMATION & RENDER LOOP
// ================================================================
let time = 0;
let animationFrameId = null;
const FPS_LIMIT = 60;
const FRAME_TIME = 1000 / FPS_LIMIT;
let lastTime = performance.now();

// Time scale multiplier based on hardware concurrency (1x to 2x)
const timeScale = Math.min(navigator.hardwareConcurrency || 4, 8) / 4;

function animate(timestamp = 0) {
  let dt: number;
  // Handle hidden tabs: use setTimeout to reduce power consumption
  if (document.hidden) {
    animationFrameId = setTimeout(animate, FRAME_TIME);
    dt = FRAME_TIME / 1000;
    time += dt * 0.1 * timeScale; // Slow-motion when hidden
  } else {
    animationFrameId = requestAnimationFrame(animate);
    dt = (timestamp - lastTime) / 1000 || 0.016;
    lastTime = timestamp;
    time += dt * timeScale;
  }

// Auto-rotate with smooth lerp (respects prefers-reduced-motion)
if(!selectedNode && !controls.isDragging && !prefersReducedMotion) {
  const targetY = Math.sin(time * 0.5) * 0.1;
  const targetX = Math.sin(time * 0.3) * 0.05;
  
  // Smoothly interpolate towards target rotation
  domeGroup.rotation.y = THREE.MathUtils.lerp(domeGroup.rotation.y, targetY, 0.02);
  domeGroup.rotation.x = THREE.MathUtils.lerp(domeGroup.rotation.x, targetX, 0.02);
}

 molField.rotation.y += 0.0003;
 molField.rotation.x += Math.sin(time*0.3) * 0.0001;

 wMat.uniforms.uTime.value += dt;

 // Breathing & Displacement effect on blocks
 const breath = 1.0 + 0.005 * Math.sin(time * 1.5);

 for(const m of faceMeshes) {
   // Organic floating per block
   const floatOffset = Math.sin(time * 2.5 + m.userData.randomPhase) * 0.04;

   // Smoothly lerp towards target offset (interaction)
   m.userData.currentOffset += (m.userData.targetOffset - m.userData.currentOffset) * 0.1;

   // Apply final displacement along the node's outward centroid direction
   const totalOffset = floatOffset + m.userData.currentOffset;
   m.position.copy(m.userData.centroidDir).multiplyScalar(totalOffset);

   m.scale.setScalar(breath);
 }

 coreMesh.rotation.y += 0.01;
 coreMesh.rotation.x += 0.005;

 composer.render();
  }
  animate();

  queueMicrotask(() => {
    if (typeof loadingManager.onLoad === "function") {
      (loadingManager.onLoad as () => void)();
    }
  });

window.addEventListener('resize', () => {
     camera.aspect = window.innerWidth / window.innerHeight;
     camera.updateProjectionMatrix();
     renderer.setSize(window.innerWidth, window.innerHeight);
     composer.setSize(window.innerWidth, window.innerHeight);
     if (bloomPass) {
       bloomPass.resolution.set(window.innerWidth, window.innerHeight);
     }
   });

 // Fallback: hide loading screen after 10 seconds even if resources stall
 setTimeout(() => {
   const loadingScreen = $('loading-screen');
   if (loadingScreen && loadingScreen.style.display !== 'none') {
     loadingScreen.style.pointerEvents = 'none';
     loadingScreen.style.opacity = '0';
     setTimeout(() => {
       loadingScreen.style.display = 'none';
     }, 1000);
   }
 }, 10000);
 
 // ================================================================
 // 6. HUD AUTO-HIDE & LATENCY TRACKING
 // ================================================================
 
 // HUD Auto-hide after 3s of inactivity
 let hudTimer = null;
 const hud = $('top-hud');
 const hudContent = $('hud-content');
 let isHudHidden = false;
 
 function showHUD() {
   if (!hud) return;
   isHudHidden = false;
   hud.classList.remove('translate-y-[-100%]');
   hud.classList.remove('opacity-0');
   if (hudContent) hudContent.classList.remove('hidden');
 }
 
 function hideHUD() {
   if (!hud) return;
   isHudHidden = true;
   hud.classList.add('translate-y-[-100%]');
   hud.classList.add('opacity-0');
   if (hudContent) hudContent.classList.add('hidden');
 }
 
 function resetHUDTimer() {
   if (hudTimer) clearTimeout(hudTimer);
   if (isHudHidden) showHUD();
   hudTimer = setTimeout(() => {
     if (!isHudHidden) hideHUD();
   }, 3000);
 }
 
 // Show HUD on hover/touch/focus
 if (hud) {
   hud.addEventListener('mouseenter', resetHUDTimer);
   hud.addEventListener('mousemove', resetHUDTimer);
   hud.addEventListener('touchstart', resetHUDTimer);
   hud.addEventListener('focusin', resetHUDTimer);
   hud.addEventListener('mouseleave', () => {
     if (hudTimer) clearTimeout(hudTimer);
     hudTimer = setTimeout(() => {
       if (!isHudHidden) hideHUD();
     }, 3000);
   });
 }
 
 // Initialize HUD timer
 resetHUDTimer();
 
 // Performance Monitoring (Dev Mode)
 const perfIndicators = $('performance-indicators');
 const renderTimeEl = $('render-time');
 const fpsCounterEl = $('fps-counter');
 const webglStatusEl = $('webgl-status');
 const connectionStatusEl = $('connection-status');
 
 // Only show in dev mode (localhost or dev query param)
 const isDevMode = window.location.hostname === 'localhost' || window.location.search.includes('dev=true');
 if (perfIndicators) {
   perfIndicators.classList.toggle('hidden', !isDevMode);
 }
 
 // Render time tracking
 let frameCount = 0;
 let lastFpsTime = performance.now();
 let fpsValues = [];
 
 function updatePerformanceMetrics(dt) {
   if (!isDevMode) return;
   
   // Render time
   if (renderTimeEl) renderTimeEl.textContent = (dt * 1000).toFixed(1);
   
   // FPS calculation (2s average)
   frameCount++;
   const now = performance.now();
   if (now - lastFpsTime >= 2000) {
     const fps = (frameCount / ((now - lastFpsTime) / 1000));
     fpsValues.push(fps);
     if (fpsValues.length > 10) fpsValues.shift();
     const avgFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
     if (fpsCounterEl) fpsCounterEl.textContent = Math.round(avgFps);
     frameCount = 0;
     lastFpsTime = now;
   }
   
   // WebGL status
   if (webglStatusEl) {
     webglStatusEl.textContent = renderer.getContext().isContextLost() ? '✗' : '✓';
     webglStatusEl.className = renderer.getContext().isContextLost() ? 'text-red-400' : 'text-emerald';
   }
 }
 
 // Connection status simulation (replace with real WebSocket in production)
 let connectionState = 'connected'; // connected, reconnecting, failed
 function updateConnectionStatus() {
   if (!connectionStatusEl) return;
   
   const statusConfig = {
     connected: { color: 'bg-emerald', title: 'Connected', ariaLabel: 'Connected' },
     reconnecting: { color: 'bg-amber', title: 'Reconnecting...', ariaLabel: 'Reconnecting' },
     failed: { color: 'bg-red-400', title: 'Connection failed', ariaLabel: 'Failed' }
   };
   
   const config = statusConfig[connectionState] || statusConfig.connected;
   connectionStatusEl.className = `w-2 h-2 rounded-full ${config.color}`;
   connectionStatusEl.title = config.title;
   connectionStatusEl.setAttribute('aria-label', config.ariaLabel);
 }
 
 // Simulate connection state changes (for demo)
 setInterval(() => {
   // In real implementation, update based on WebSocket/EventBus events
   updateConnectionStatus();
 }, 5000);
 
 updateConnectionStatus();
 
 // Modify animate function to track performance
 const originalAnimate = animate;
 
 // Hook into animation loop to measure performance
 let animationStartTime = 0;
 function measureFramePerformance(timestamp) {
   if (animationStartTime === 0) animationStartTime = timestamp;
   const dt = (timestamp - animationStartTime) / 1000 || 0.016;
   animationStartTime = timestamp;
   updatePerformanceMetrics(dt);
 }
 
 // Override composer.render to measure frame time
 const originalRender = composer.render.bind(composer);
 composer.render = function() {
   const start = performance.now();
   originalRender();
   const end = performance.now();
   measureFramePerformance(end);
 };
 
 // Focus-visible styles via JS (for browsers that don't support :focus-visible)
 document.addEventListener('focusin', (e) => {
   if (e.target.matches('button, [role="button"], input, [tabindex]')) {
     e.target.classList.add('focus-visible');
   }
 });
 
 document.addEventListener('focusout', (e) => {
   if (e.target.matches('button, [role="button"], input, [tabindex]')) {
     e.target.classList.remove('focus-visible');
   }
 });
 
 // Add focus-visible styles to head
 const focusStyle = document.createElement('style');
 focusStyle.textContent = `
    .focus-visible {
      outline: 2px solid var(--p31-cyan);
      outline-offset: 2px;
      transition: outline 0.15s ease;
    }
    /* Ensure touch targets are at least 44x44px */
    button, [role="button"], input[type="range"] {
      min-width: 44px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    #volume-slider-container {
      min-width: 80px;
      min-height: 44px;
      padding: 0;
    }
    #volume-slider-container > div {
      height: 100%;
      align-items: center;
    }
 `;
 document.head.appendChild(focusStyle);
 
  // UI Toggle Button functionality
  const uiToggleBtn = $('ui-toggle-btn');
  if (uiToggleBtn) {
    uiToggleBtn.addEventListener('click', () => {
      const isCurrentlyHidden = hud.classList.contains('translate-y-[-100%]');
      if (isCurrentlyHidden) {
        showHUD();
        resetHUDTimer();
      } else {
        hideHUD();
      }
      
      // Haptic feedback
      if (navigator.vibrate && !prefersReducedMotion) {
        navigator.vibrate(10);
      }
    });
  }
  
  // ================================================================
  // 7b. A/B THEME VARIANT SWITCHER
  // ================================================================
  const themeToggleBtn = $('theme-toggle-btn');
  const THEME_KEY = 'p31:dome:themeVariant';
  const defaultVariant = 'tm'; // teal-magenta
  const variants = { tm: 'A (teal-magenta)', cv: 'B (cyan-violet)' };
  
  function applyTheme(variant) {
    document.documentElement.setAttribute('data-palette', variant);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = `Theme: ${variants[variant]}`;
      themeToggleBtn.title = `Current: ${variants[variant]}`;
    }
    localStorage.setItem(THEME_KEY, variant);
  }
  
  // Load saved theme
  const savedVariant = localStorage.getItem(THEME_KEY) || defaultVariant;
  applyTheme(savedVariant);
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-palette') || defaultVariant;
      const next = current === 'tm' ? 'cv' : 'tm';
      applyTheme(next);
      
      // Haptic feedback
      if (navigator.vibrate && !prefersReducedMotion) {
        navigator.vibrate(5);
      }
    });
  }
  
  // ================================================================
  // 7. KEYBOARD SHORTCUTS OVERLAY
  // ================================================================
  const shortcutsOverlay = $('keyboard-shortcuts-overlay');
  const closeShortcutsBtn = $('close-shortcuts');
  let shortcutsVisible = false;
  let shortcutsTimeout = null;
  
  function showShortcuts(autoClose = true) {
    if (!shortcutsOverlay) return;
    shortcutsOverlay.classList.remove('opacity-0', 'pointer-events-none');
    shortcutsVisible = true;
    
    if (autoClose) {
      // Auto-close after 2.5 seconds and then focus search
      shortcutsTimeout = setTimeout(() => {
        hideShortcuts();
        // Focus the search input after overlay closes
        const searchInput = $('search-input');
        if (searchInput) searchInput.focus();
      }, 2500);
    }
  }
  
  function hideShortcuts() {
    if (!shortcutsOverlay) return;
    shortcutsOverlay.classList.add('opacity-0', 'pointer-events-none');
    shortcutsVisible = false;
    if (shortcutsTimeout) {
      clearTimeout(shortcutsTimeout);
      shortcutsTimeout = null;
    }
  }
  
  // Toggle with "/" key
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === '/' && !shortcutsVisible) {
      e.preventDefault();
      showShortcuts(true);
    } else if (shortcutsVisible && e.key !== 'Escape') {
      // Any key (except Escape which is handled separately) dismisses overlay immediately
      e.preventDefault();
      hideShortcuts();
      // If the key is a letter/digit, could focus appropriate control; but focus search after brief
      setTimeout(() => {
        const searchInput = $('search-input');
        if (searchInput && document.activeElement !== searchInput) searchInput.focus();
      }, 50);
    }
  });
  
  // Also allow Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shortcutsVisible) {
      hideShortcuts();
    }
  });
  
  if (closeShortcutsBtn) {
    closeShortcutsBtn.addEventListener('click', hideShortcuts);
  }
  
  // Close on backdrop click
  if (shortcutsOverlay) {
    shortcutsOverlay.addEventListener('click', (e) => {
      if (e.target === shortcutsOverlay) hideShortcuts();
    });
  }
  
  // ================================================================
  // 8. AXE-CORE ACCESSIBILITY SCANNER (DEV ONLY)
  // ================================================================
  const a11yScanBtn = $('a11y-scan-btn');
  
  if (a11yScanBtn) {
    a11yScanBtn.addEventListener('click', async () => {
      if (typeof axe === 'undefined') {
        alert('axe-core not loaded. Please refresh to load the accessibility scanner.');
        return;
      }
      
      try {
        const results = await axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2aa']
          }
        });
        
        if (results.violations.length === 0) {
          alert(i18n.t('a11y.noViolations'));
        } else {
          const msg = `${i18n.t('a11y.violationsTitle')}\n\n` +
            results.violations.map(v => `${v.impact.toUpperCase()}: ${v.id} - ${v.description}`).join('\n');
          alert(msg);
          console.group('Accessibility Violations');
          console.table(results.violations);
          console.groupEnd();
        }
      } catch (error) {
        console.error('Axe scan failed:', error);
        alert('Accessibility scan failed. Check console.');
      }
    });
  }
  
  // ================================================================
  // 9. REDUCED MOTION ENFORCEMENT
  // ================================================================
  // Already detected at top via: const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // CSS handles transitions/animations; JS handles non-css motion in animate loop
  
  // Apply reduced-motion class to html for CSS overrides
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
  }
  
  // Watch for changes
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  });
  
  // ================================================================
  // 10. ENTRANCE ANIMATION
  // ================================================================
  // Fade-up entrance for main content when loading screen hides
  const hideLoading = () => {
    try {
      const loadingScreen = $('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.pointerEvents = 'none';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          // Trigger entrance animation
          document.body.classList.add('loaded');
        }, 1000);
      }
    } catch(e) {}
  };

} // WebGL branch (else opened when webglSupported)