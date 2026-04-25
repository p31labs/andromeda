export function buildK4MeshDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>P31 | K4 Mesh — Neuro-Inclusive Command</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --void: #050505;
      --surface: #0a0a0f;
      --surface-800: rgba(12, 14, 20, 0.85);
      --text: #d8d6d0;
      --text-muted: #6b7280;
      --accent-teal: #4db8a8;
      --accent-orange: #e8873a;
      --accent-coral: #E8636F;
      --accent-gold: #cda852;
      --glass: rgba(12, 14, 20, 0.75);
      --border: rgba(255, 255, 255, 0.08);
    }
    
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: "Inter", system-ui, -apple-system, sans-serif;
      background-color: var(--void);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      overflow: hidden;
    }
    
    .font-mono { font-family: "JetBrains Mono", monospace; }
    .text-teal { color: var(--accent-teal); }
    .text-orange { color: var(--accent-orange); }
    .text-coral { color: var(--accent-coral); }
    .text-gold { color: var(--accent-gold); }
    .text-muted { color: var(--text-muted); }
    
    .ambient-grid {
      position: fixed;
      inset: 0;
      background-image: radial-gradient(rgba(77, 184, 168, 0.08) 1px, transparent 1px);
      background-size: 32px 32px;
      opacity: 0.05;
      pointer-events: none;
      z-index: 0;
    }
    
    .glass-panel {
      background: var(--glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    
    .rounded-xl { border-radius: 12px; }
    
    .nav-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: rgba(5, 5, 8, 0.9);
    }
    
    .voltage-strip {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 60;
      transition: background-color 0.5s ease;
    }
    
    .voltage-strip.teal { background: var(--accent-teal); box-shadow: 0 0 12px var(--accent-teal); }
    .voltage-strip.amber { background: var(--accent-gold); box-shadow: 0 0 12px var(--accent-gold); }
    .voltage-strip.coral { background: var(--accent-coral); box-shadow: 0 0 12px var(--accent-coral); }
    
    #canvas-container {
      position: fixed;
      inset: 0;
      z-index: 1;
    }
    
    .hud-top-left {
      position: fixed;
      top: 60px;
      left: 20px;
      z-index: 10;
      padding: 16px;
      min-width: 240px;
    }
    
    .hud-top-right {
      position: fixed;
      top: 60px;
      right: 20px;
      z-index: 10;
      padding: 16px;
      min-width: 200px;
    }
    
    .hud-bottom-left {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 10;
      padding: 16px;
      max-width: 320px;
    }
    
    .hud-bottom-right {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10;
      padding: 16px;
    }
    
    .section-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .section-label::before {
      content: "";
      width: 4px;
      height: 4px;
      background: var(--accent-teal);
      border-radius: 50%;
    }
    
    .kpi-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
    }
    
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }
    
    .kpi-value {
      font-size: 14px;
      font-weight: 600;
      font-family: "JetBrains Mono", monospace;
    }
    
    .spoon-meter {
      width: 100%;
      height: 6px;
      background: var(--surface);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .spoon-fill {
      height: 100%;
      background: var(--accent-teal);
      transition: width 0.3s ease, background-color 0.3s ease;
      border-radius: 3px;
    }
    
    .casualty-overlay {
      position: fixed;
      inset: 0;
      z-index: 60;
      background: rgba(5, 5, 8, 0.92);
      display: none;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      gap: 24px;
    }
    
    .casualty-overlay.active {
      display: flex;
    }
    
    .casualty-prompt {
      font-size: 18px;
      font-weight: 600;
      color: var(--accent-orange);
      text-align: center;
      max-width: 500px;
      line-height: 1.6;
      letter-spacing: 0.02em;
    }
    
    .casualty-subtext {
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
      font-family: "JetBrains Mono", monospace;
    }
    
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      font-family: "JetBrains Mono", monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    
    .btn-teal {
      border-color: var(--accent-teal);
      color: var(--accent-teal);
    }
    
    .btn-teal:hover {
      background: rgba(77, 184, 168, 0.12);
    }
    
    .toast-container {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 55;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }
    
    .toast {
      padding: 10px 20px;
      background: var(--surface-800);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      font-family: "JetBrains Mono", monospace;
      color: var(--text);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: auto;
    }
    
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .toast.info { border-left: 3px solid var(--accent-teal); }
    .toast.warning { border-left: 3px solid var(--accent-gold); }
    .toast.error { border-left: 3px solid var(--accent-coral); }
  </style>
</head>
<body>
  <div class="ambient-grid"></div>
  
  <div class="voltage-strip teal" id="voltage-strip"></div>
  
  <nav class="nav-bar">
    <div style="display:flex;align-items:center;gap:16px">
      <span style="font-weight:700;letter-spacing:0.2em;font-size:14px">
        P31<span class="text-teal">_K4</span>
      </span>
      <div style="width:1px;height:16px;background:var(--border)"></div>
      <span class="text-muted font-mono" style="font-size:10px;letter-spacing:0.1em" id="auth-display">
        AUTHENTICATING...
      </span>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="font-mono text-muted" style="font-size:9px;letter-spacing:0.1em" id="qfactor-display">
        Q: --
      </span>
      <button class="btn" id="toggle-audio">[ AUDIO ]</button>
      <button class="btn btn-teal" id="sync-btn">[ SYNC ]</button>
    </div>
  </nav>
  
  <div id="canvas-container"></div>
  
  <div class="hud-top-left glass-panel rounded-xl" id="hud-k4">
    <div class="section-label">K4 TETRAHEDRON</div>
    <div class="kpi-row">
      <span class="kpi-label">Energy</span>
      <span class="kpi-value text-teal" id="kpi-energy">--</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Tasks</span>
      <span class="kpi-value text-teal" id="kpi-tasks">--</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Environment</span>
      <span class="kpi-value text-teal" id="kpi-env">--</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Creation</span>
      <span class="kpi-value text-teal" id="kpi-creation">--</span>
    </div>
    <div style="margin-top:12px">
      <div class="kpi-label" style="margin-bottom:4px">SPOONS</div>
      <div class="spoon-meter">
        <div class="spoon-fill" id="spoon-fill" style="width:100%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span class="text-muted font-mono" style="font-size:9px" id="spoon-count">12/12</span>
        <span class="text-muted font-mono" style="font-size:9px" id="spoon-rate">-0.5/hr</span>
      </div>
    </div>
  </div>
  
  <div class="hud-top-right glass-panel rounded-xl" id="hud-telemetry">
    <div class="section-label">TELEMETRY</div>
    <div class="kpi-row">
      <span class="kpi-label">Q-Factor</span>
      <span class="kpi-value" id="tele-qfactor">--</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Larmor</span>
      <span class="kpi-value text-teal" id="tele-larmor">863 Hz</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Nodes</span>
      <span class="kpi-value text-teal" id="tele-nodes">4</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Edges</span>
      <span class="kpi-value text-teal" id="tele-edges">6</span>
    </div>
    <div class="kpi-row">
      <span class="kpi-label">Mode</span>
      <span class="kpi-value" id="tele-mode">HIGH</span>
    </div>
  </div>
  
  <div class="hud-bottom-left glass-panel rounded-xl" id="hud-events">
    <div class="section-label">EVENT LOG</div>
    <div id="event-list" style="max-height:150px;overflow-y:auto;font-size:10px;font-family:'JetBrains Mono',monospace">
      <div class="text-muted" style="padding:4px 0">Awaiting telemetry...</div>
    </div>
  </div>
  
  <div class="hud-bottom-right glass-panel rounded-xl" id="hud-controls">
    <div class="section-label">CONTROLS</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="window.k4Mesh.zoomTo('energy')">[ E ]</button>
      <button class="btn" onclick="window.k4Mesh.zoomTo('tasks')">[ T ]</button>
      <button class="btn" onclick="window.k4Mesh.zoomTo('env')">[ V ]</button>
      <button class="btn" onclick="window.k4Mesh.zoomTo('creation')">[ C ]</button>
    </div>
    <div style="margin-top:8px;display:flex;gap:8px">
      <button class="btn" onclick="window.k4Mesh.resetView()">[ RESET ]</button>
      <button class="btn btn-teal" onclick="window.k4Mesh.pingMesh()">[ PING ]</button>
    </div>
  </div>
  
  <div class="casualty-overlay" id="casualty-overlay">
    <div class="casualty-prompt">
      What tool are you holding and what task are you doing?
    </div>
    <div class="casualty-subtext">
      Press any key or click to acknowledge
    </div>
  </div>
  
  <div class="toast-container" id="toast-container"></div>
  
  <script src="/k4/viz.js"></script>
  
  <script>
    // Fisher-Escola Q-Factor Engine
    class QFactorEngine {
      constructor() {
        this.pods = {
          energy: { value: 1.0, label: 'Energy' },
          tasks: { value: 1.0, label: 'Tasks' },
          env: { value: 1.0, label: 'Environment' },
          creation: { value: 1.0, label: 'Creation' }
        };
        this.lastCompute = Date.now();
        this.larmorFrequency = 863;
      }
      
      updatePod(podName, value) {
        if (this.pods[podName]) {
          this.pods[podName].value = Math.max(0, Math.min(1, value));
        }
      }
      
      computeQFactor() {
        var values = [];
        Object.values(this.pods).forEach(function(p) { values.push(p.value); });
        var product = 1;
        for (var i = 0; i < values.length; i++) { product *= values[i]; }
        var geometricMean = Math.pow(product, 1 / values.length);
        
        var minValue = Math.min.apply(null, values);
        if (minValue <= 0.01) {
          return geometricMean * Math.exp(-5 * (0.01 - minValue));
        }
        
        return geometricMean;
      }
      
      getSpoonCount() {
        var total = 0;
        Object.values(this.pods).forEach(function(p) { total += Math.floor(p.value * 12); });
        return total;
      }
    }
    
    // Neuro-Inclusive Audio System
    class NeuroAudioSystem {
      constructor() {
        this.audioCtx = null;
        this.isEnabled = false;
      }
      
      init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Pink noise generation
        var bufferSize = 2 * this.audioCtx.sampleRate;
        var noiseBuffer = this.audioCtx.createBuffer(2, bufferSize, this.audioCtx.sampleRate);
        
        for (var channel = 0; channel < 2; channel++) {
          var output = noiseBuffer.getChannelData(channel);
          var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          
          for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
          }
        }
        
        this.pinkNoiseNode = this.audioCtx.createBufferSource();
        this.pinkNoiseNode.buffer = noiseBuffer;
        this.pinkNoiseNode.loop = true;
        
        var gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.15;
        
        this.pinkNoiseNode.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        this.pinkNoiseNode.start();
        
        // Theta binaural beats (6 Hz)
        this.binauralLeft = this.audioCtx.createOscillator();
        this.binauralLeft.frequency.value = 132;
        this.binauralRight = this.audioCtx.createOscillator();
        this.binauralRight.frequency.value = 138;
        
        var leftGain = this.audioCtx.createGain();
        var rightGain = this.audioCtx.createGain();
        leftGain.gain.value = 0.1;
        rightGain.gain.value = 0.1;
        
        var merger = this.audioCtx.createChannelMerger(2);
        this.binauralLeft.connect(leftGain);
        this.binauralRight.connect(rightGain);
        leftGain.connect(merger, 0, 0);
        rightGain.connect(merger, 0, 1);
        merger.connect(this.audioCtx.destination);
        
        this.binauralLeft.start();
        this.binauralRight.start();
        
        this.isEnabled = true;
      }
      
      toggle() {
        var self = this;
        if (this.isEnabled) {
          this.audioCtx.suspend();
          this.isEnabled = false;
          return Promise.resolve(false);
        } else {
          return this.init().then(function() { return true; });
        }
      }
    }
    
    // Toast Notification System
    function showToast(message, type) {
      type = type || 'info';
      var container = document.getElementById('toast-container');
      var toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      
      requestAnimationFrame(function() {
        toast.classList.add('show');
      });
      
      setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
      }, 3000);
    }
    
    // Initialize Systems
    var qEngine = new QFactorEngine();
    var audioSystem = new NeuroAudioSystem();
    window.casualtyDismissed = false;
    
    window.k4Mesh = {
      qEngine: qEngine,
      audioSystem: audioSystem,
      zoomTo: function(pod) { showToast('Zooming to ' + pod, 'info'); },
      resetView: function() { showToast('View reset', 'info'); },
      pingMesh: function() { showToast('Mesh ping sent', 'info'); }
    };
    
    // UI Update Loop
    function updateUI() {
      var qFactor = qEngine.computeQFactor();
      var spoonCount = qEngine.getSpoonCount();
      
      // Update voltage strip
      var strip = document.getElementById('voltage-strip');
      strip.className = 'voltage-strip ' + (qFactor > 0.8 ? 'teal' : qFactor > 0.4 ? 'amber' : 'coral');
      
      // Update Q-Factor display
      document.getElementById('qfactor-display').textContent = 'Q: ' + qFactor.toFixed(3);
      
      var qFactorElem = document.getElementById('tele-qfactor');
      qFactorElem.textContent = qFactor.toFixed(3);
      qFactorElem.className = 'kpi-value ' + (qFactor > 0.8 ? 'text-teal' : qFactor > 0.4 ? 'text-gold' : 'text-coral');
      
      // Update spoon meter
      var spoonPercent = (spoonCount / 48) * 100;
      document.getElementById('spoon-fill').style.width = spoonPercent + '%';
      
      var spoonFill = document.getElementById('spoon-fill');
      spoonFill.style.background = spoonPercent > 60 ? 'var(--accent-teal)' : spoonPercent > 30 ? 'var(--accent-gold)' : 'var(--accent-coral)';
      document.getElementById('spoon-count').textContent = spoonCount + '/48';
      
      // Update mode
      var mode = qFactor > 0.8 ? 'HIGH' : qFactor > 0.4 ? 'NORM' : 'SAFE';
      var modeElem = document.getElementById('tele-mode');
      modeElem.textContent = mode;
      modeElem.className = 'kpi-value ' + (mode === 'HIGH' ? 'text-teal' : mode === 'NORM' ? 'text-gold' : 'text-coral');
      
      // Check for casualty mode (with dismiss flag)
      var overlay = document.getElementById('casualty-overlay');
      if (qFactor <= 0.4 || spoonCount < 12) {
        if (!window.casualtyDismissed) {
          overlay.classList.add('active');
          if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
        }
      } else {
        overlay.classList.remove('active');
        window.casualtyDismissed = false; // Reset when Q recovers
      }
      
      // Update pod KPIs
      ['energy', 'tasks', 'env', 'creation'].forEach(function(pod) {
        var val = qEngine.pods[pod].value;
        var elem = document.getElementById('kpi-' + pod);
        elem.textContent = val.toFixed(2);
        elem.className = 'kpi-value ' + (val > 0.6 ? 'text-teal' : val > 0.3 ? 'text-gold' : 'text-coral');
      });
    }
    
    // Event Listeners
    document.getElementById('sync-btn').addEventListener('click', function() {
      showToast('Syncing telemetry...', 'info');
      updateUI();
    });
    
    document.getElementById('toggle-audio').addEventListener('click', function() {
      audioSystem.toggle().then(function(enabled) {
        showToast(enabled ? 'Audio enabled' : 'Audio disabled', 'info');
      });
    });
    
    document.getElementById('casualty-overlay').addEventListener('click', function() {
      document.getElementById('casualty-overlay').classList.remove('active');
      window.casualtyDismissed = true;
      showToast('Casualty control acknowledged', 'warning');
    });
    
    document.addEventListener('keydown', function(e) {
      if (document.getElementById('casualty-overlay').classList.contains('active')) {
        document.getElementById('casualty-overlay').classList.remove('active');
        window.casualtyDismissed = true;
        showToast('Casualty control acknowledged', 'warning');
      }
    });
    
    // Simulate Telemetry (for demo) - slow drift so Q stays stable
    var simTime = 0;
    setInterval(function() {
      simTime += 100;
      Object.keys(qEngine.pods).forEach(function(pod) {
        // Very small oscillation around 0.85 (Q~0.52) to 1.0 (Q=1.0)
        var drift = (Math.sin(simTime * 0.0005) * 0.002);
        var newVal = qEngine.pods[pod].value + drift;
        qEngine.updatePod(pod, newVal);
      });
      updateUI();
    }, 1000); // Slower interval: every 1 second
    
    // Auth Check
    fetch('/api/whoami')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        document.getElementById('auth-display').textContent = 
          data.authenticated ? data.email.toUpperCase() + ' [' + data.role + ']' : 'ANONYMOUS';
      })
      .catch(function() {
        document.getElementById('auth-display').textContent = 'AUTH FAILED';
      });
    
    // Initial UI update
    updateUI();
  </script>
</body>
</html>`;
}
