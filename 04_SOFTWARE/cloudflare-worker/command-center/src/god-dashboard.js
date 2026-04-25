export function buildGodDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>G.O.D. — Geodesic Operations Daemon</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --void: #030305;
      --surface: #0a0c10;
      --surface-elevated: #12151c;
      --border: rgba(255,255,255,0.08);
      --border-focus: rgba(77,184,168,0.4);
      --text: #d8d6d0;
      --text-muted: #5a5f69;
      --accent-teal: #3dd6c5;
      --accent-orange: #e8636f;
      --accent-gold: #cda852;
      --accent-blue: #4069ff;
      --bg-grid: rgba(61,214,197,0.03);
    }
    
    *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: "Space Grotesk", system-ui, sans-serif;
      background: var(--void);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(var(--bg-grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
      z-index: 0;
    }
    
    .font-mono { font-family: "JetBrains Mono", monospace; }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-online { background: var(--accent-teal); box-shadow: 0 0 12px var(--accent-teal); }
    .status-warning { background: var(--accent-gold); box-shadow: 0 0 12px var(--accent-gold); }
    .status-offline { background: var(--accent-orange); box-shadow: 0 0 12px var(--accent-orange); }
    
    .god-dashboard {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 1px;
      background: rgba(255,255,255,0.05);
      min-height: 100vh;
      position: relative;
      z-index: 1;
    }
    
    @media (max-width: 1024px) {
      .god-dashboard {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto auto;
      }
    }
    
    .quadrant {
      background: var(--surface);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    
    .quadrant::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, var(--accent-teal), transparent);
    }
    
    .quadrant-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .quadrant-title {
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    
    .quadrant-badge {
      font-family: "JetBrains Mono", monospace;
      font-size: 9px;
      padding: 2px 6px;
      background: rgba(61,214,197,0.1);
      color: var(--accent-teal);
      border: 1px solid rgba(61,214,197,0.2);
      border-radius: 2px;
    }
    
    .metric-value {
      font-family: "JetBrains Mono", monospace;
      font-size: 28px;
      font-weight: 700;
      color: var(--accent-teal);
      line-height: 1;
    }
    
    .metric-value.teal { color: var(--accent-teal); }
    .metric-value.orange { color: var(--accent-orange); }
    .metric-value.gold { color: var(--accent-gold); }
    .metric-value.blue { color: var(--accent-blue); }
    
    .metric-label {
      display: block;
      font-family: "JetBrains Mono", monospace;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    
    .qfactor-value {
      font-family: "JetBrains Mono", monospace;
      font-size: 24px;
      font-weight: 700;
      color: var(--accent-gold);
    }
    
    .qfactor-value.high { color: #4ade80; }
    .qfactor-value.medium { color: var(--accent-gold); }
    .qfactor-value.low { color: var(--accent-orange); }
    
    /* Worker Cards */
    .worker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    
    .worker-card {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.2s;
    }
    
    .worker-card:hover {
      border-color: var(--accent-teal);
    }
    
    .worker-name {
      font-family: "JetBrains Mono", monospace;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 8px;
    }
    
    .worker-type {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    
    .worker-version {
      font-family: "JetBrains Mono", monospace;
      font-size: 10px;
      color: var(--accent-teal);
      margin-bottom: 8px;
    }
    
    .worker-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .worker-uptime {
      font-size: 10px;
      color: var(--text-muted);
    }
    
    .btn-group {
      display: flex;
      gap: 4px;
    }
    
    .btn {
      font-family: "JetBrains Mono", monospace;
      font-size: 9px;
      padding: 3px 6px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn:hover {
      background: rgba(255,255,255,0.1);
      border-color: var(--accent-teal);
    }
    
    .btn-danger {
      border-color: var(--accent-orange);
      color: var(--accent-orange);
    }
    
    .btn-danger:hover {
      background: rgba(232,99,111,0.1);
    }
    
    /* Mesh Canvas */
    #mesh-container {
      position: relative;
      width: 100%;
      height: 300px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      overflow: hidden;
    }
    
    #mesh-canvas {
      width: 100%;
      height: 100%;
    }
    
    .mesh-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 12px;
    }
    
    /* Toast */
    #toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
    }
    
    .toast {
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
      padding: 8px 16px;
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 8px;
      animation: slideIn 0.3s ease;
    }
    
    .toast.success { border-color: var(--accent-teal); }
    .toast.warning { border-color: var(--accent-gold); }
    .toast.error { border-color: var(--accent-orange); }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    /* Auth Fetch */
    .auth-fetch-btn {
      font-size: 11px;
      padding: 4px 8px;
      background: rgba(64,105,255,0.1);
      border: 1px solid var(--accent-blue);
      color: var(--accent-blue);
      border-radius: 4px;
      cursor: pointer;
    }
    
    .auth-fetch-btn:hover {
      background: rgba(64,105,255,0.2);
    }
  </style>
</head>
<body>
  <div class="god-dashboard">
    <!-- Quadrant 1: Fleet Status -->
    <div class="quadrant">
      <div class="quadrant-header">
        <span class="quadrant-title">Fleet Status</span>
        <span class="quadrant-badge">LIVE</span>
      </div>
      <div class="metric-value teal" id="online-count">--</div>
      <div class="metric-label">Online Nodes</div>
      
      <div class="metric-value" id="total-count">--</div>
      <div class="metric-label">Total Workers</div>
      
      <div class="worker-grid" id="worker-grid"></div>
    </div>
    
    <!-- Quadrant 2: Mesh Topology -->
    <div class="quadrant">
      <div class="quadrant-header">
        <span class="quadrant-title">Mesh Topology</span>
        <span class="quadrant-badge" id="mesh-phase">K4 Complete</span>
      </div>
      <div id="mesh-container">
        <canvas id="mesh-canvas"></canvas>
      </div>
      <div class="mesh-metrics">
        <div>
          <div class="metric-label">Q-Factor</div>
          <div class="metric-value teal" id="mesh-qfactor">--</div>
        </div>
        <div>
          <!-- Cognitive Coherence Indicator -->
          <div class="metric-label">COGNITIVE</div>
          <div class="qfactor-value" id="qfactor-display">--</div>
        </div>
        <div>
          <div class="metric-label">Love</div>
          <div class="metric-value teal" id="mesh-love">--</div>
        </div>
        <div>
          <div class="metric-label">Edges</div>
          <div class="metric-value" id="mesh-edges">--</div>
        </div>
      </div>
    </div>
    
    <!-- Quadrant 3: Queue Status -->
    <div class="quadrant">
      <div class="quadrant-header">
        <span class="quadrant-title">CRDT Queue</span>
        <span class="quadrant-badge" id="queue-status">Active</span>
      </div>
      <div class="metric-value orange" id="queue-count">--</div>
      <div class="metric-label">Pending Operations</div>
      <div id="queue-list"></div>
    </div>
    
    <!-- Quadrant 4: Cloud Resources -->
    <div class="quadrant">
      <div class="quadrant-header">
        <span class="quadrant-title">Cloud Resources</span>
        <span class="quadrant-badge">CF</span>
      </div>
      <div id="cf-resources"></div>
    </div>
  </div>
  
  <div id="toast-container"></div>
  
  <script>
    // Global state
    const STATE = {
      workers: [],
      queue: [],
      mesh: { online: 4, love: 128, qfactor: 0.0, edges: 6 },
      crdtSession: null,
      ws: null
    };
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      init();
    });
    
    function init() {
      renderWorkers();
      renderQueue();
      updateMeshMetrics();
      
      // Fetch initial data
      fetch('/api/status')
        .then(r => r.json())
        .then(data => {
          STATE.workers = data.workers || [];
          STATE.queue = data.queue || [];
          renderWorkers();
          renderQueue();
        })
        .catch(console.warn);
      
      // Connect CRDT WebSocket
      connectCrdtWs();
      
      // Start mesh animation
      renderMesh();
      
      // Initialize WebGPU for qFactor calculation
      if (typeof initWebGPU === 'function') {
        initWebGPU();
      }
      
      // Auto-authenticate with SE050 if available
      if (typeof autoAuthenticate === 'function') {
        autoAuthenticate().catch(console.warn);
      }
      
      showToast('G.O.D. Dashboard connected', 'success');
    }
    
    // ── CRDT WebSocket ──
    let crdtWs = null;
    let crdtSessionId = null;
    
    function connectCrdtWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      crdtWs = new WebSocket(\`\${protocol}//\${window.location.host}/api/crdt/session\`);
      
      crdtWs.onopen = () => {
        console.log('[CRDT] Connected');
        showToast('CRDT session connected', 'success');
      };
      
      crdtWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleCrdtMessage(msg);
        } catch (e) {
          console.warn('[CRDT] Invalid message:', e);
        }
      };
      
      crdtWs.onclose = () => {
        console.log('[CRDT] Disconnected, reconnecting...');
        setTimeout(connectCrdtWs, 2000);
      };
    }
    
    function handleCrdtMessage(msg) {
      switch (msg.type) {
        case 'connected':
          crdtSessionId = msg.session_id;
          console.log('[CRDT] Session', crdtSessionId, 'VC:', msg.vector_clock);
          showToast('CRDT session connected', 'success');
          break;
        case 'mesh_updated':
          console.log('[CRDT] Mesh updated by', msg.source_session, ':', msg.key);
          if (msg.key && msg.key.startsWith('queue_')) {
            const id = msg.key.replace('queue_', '');
            const item = STATE.queue.find(q => q.id == id);
            if (item && msg.value) {
              Object.assign(item, msg.value);
              renderQueue();
              updateQueueCount();
            }
          } else if (msg.key && msg.key.startsWith('vertex_')) {
            if (typeof renderMesh === 'function') renderMesh();
          }
          if (msg.vector_clock) {
            STATE.mesh.vc = msg.vector_clock;
          }
          break;
        case 'conflict':
          showToast('Conflict on ' + msg.key + ': ' + msg.message, 'warning');
          break;
        case 'full_state':
          console.log('[CRDT] Full state received:', msg.mesh_state.length, 'items');
          break;
        case 'mesh_message':
          if (typeof spawnParticle === 'function') {
            spawnParticle(msg.from, msg.to, msg.msgType);
          }
          break;
        case 'qfactor_update':
          if (msg.value) {
            updateQFactorDisplay(msg.value);
          }
          break;
      }
    }
    
    function sendMeshUpdate(key, value) {
      if (crdtWs && crdtWs.readyState === WebSocket.OPEN) {
        crdtWs.send(JSON.stringify({
          type: 'mesh_update',
          key: key,
          value: value,
          vector_clock: (function() { var vc = {}; vc[key] = Date.now(); return vc; })()
        }));
      }
    }
    
    // ── qFactor Display ──
    function updateQFactorDisplay(value) {
      const display = document.getElementById('qfactor-display');
      if (display) {
        display.textContent = value.toFixed(3);
        display.className = 'qfactor-value';
        if (value > 0.8) display.classList.add('high');
        else if (value > 0.4) display.classList.add('medium');
        else display.classList.add('low');
      }
      
      // Update mesh qfactor too
      const meshQ = document.getElementById('mesh-qfactor');
      if (meshQ) meshQ.textContent = value.toFixed(3);
    }
    
    // ── WebGPU qFactor Integration ──
    async function initWebGPU() {
      // Import QFactorGPU module
      try {
        const module = await import('./qfactor-gpu.js');
        window.QFactorGPU = module.QFactorGPU;
        
        const qgpu = new module.QFactorGPU();
        await qgpu.initialize();
        
        // Calculate every 30 seconds
        setInterval(async () => {
          const metrics = {
            calcium: 7.5,
            coherence: 0.82,
            stress: 0.23,
            time_of_day: new Date().getHours() + new Date().getMinutes() / 60
          };
          const qFactor = await qgpu.calculateQFactor(metrics);
          updateQFactorDisplay(qFactor);
          
          // Stream to CRDT
          if (crdtWs && crdtWs.readyState === WebSocket.OPEN) {
            crdtWs.send(JSON.stringify({
              type: 'qfactor_update',
              value: qFactor
            }));
          }
        }, 30000);
        
        // Initial calculation
        const metrics = {
          calcium: 7.5,
          coherence: 0.82,
          stress: 0.23,
          time_of_day: new Date().getHours() + new Date().getMinutes() / 60
        };
        const qFactor = await qgpu.calculateQFactor(metrics);
        updateQFactorDisplay(qFactor);
        
      } catch (err) {
        console.warn('[QFactor] WebGPU not available, using CPU fallback');
      }
    }
    
    // ── SE050 Authentication ──
    async function autoAuthenticate() {
      try {
        const module = await import('./se050-auth.js');
        const auth = new module.SE050Authenticator();
        const connected = await auth.connect();
        if (connected) {
          console.log('[SE050] Hardware token detected');
        }
      } catch (err) {
        console.log('[SE050] No hardware token, using standard auth');
      }
    }
    
    // ── Render Functions ──
    function renderWorkers() {
      const grid = document.getElementById('worker-grid');
      if (!grid) return;
      
      const workerList = STATE.workers.filter(w => w.name !== 'command-center');
      
      if (!workerList.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-muted)">No worker telemetry available</div>';
        return;
      }
      
      grid.innerHTML = workerList.map(w => {
        const status = w.status || 'inactive';
        const statusClass = status === 'active' ? 'status-online' : status === 'error' ? 'status-offline' : 'status-warning';
        return \`
          <div class="worker-card">
            <div class="worker-name">
              <span class="status-dot \${statusClass}"></span>
              \${w.name}
            </div>
            <div class="worker-type">\${w.type || 'worker'}</div>
            <div class="worker-version">v\${w.version || '1.0.0'}</div>
            <div class="worker-status">
              <span class="worker-uptime">\${w.last_health ? new Date(w.last_health).toLocaleTimeString() : 'never'}</span>
            </div>
          </div>
        \`;
      }).join('');
      
      document.getElementById('online-count').textContent = workerList.filter(w => w.status === 'active').length;
      document.getElementById('total-count').textContent = workerList.length;
    }
    
    function renderQueue() {
      const list = document.getElementById('queue-list');
      if (!list) return;
      
      if (!STATE.queue.length) {
        list.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Queue empty</div>';
        return;
      }
      
      list.innerHTML = STATE.queue.slice(0, 5).map(item => \`
        <div style="font-size:10px;padding:4px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--accent-gold)">\${item.type}</span>
          <span style="float:right;color:var(--text-muted)">\${item.status}</span>
        </div>
      \`).join('');
      
      updateQueueCount();
    }
    
    function updateQueueCount() {
      const count = document.getElementById('queue-count');
      if (count) count.textContent = STATE.queue.length;
    }
    
    function updateMeshMetrics() {
      document.getElementById('mesh-online').textContent = STATE.mesh.online || 4;
      document.getElementById('mesh-love').textContent = STATE.mesh.love || 128;
      document.getElementById('mesh-edges').textContent = STATE.mesh.edges || 6;
    }
    
    // ── Mesh Visualization ──
    function renderMesh() {
      const canvas = document.getElementById('mesh-canvas');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.35;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections (tetrahedron edges)
      const vertices = [
        { x: centerX, y: centerY - radius },
        { x: centerX - radius * 0.8, y: centerY + radius * 0.5 },
        { x: centerX + radius * 0.8, y: centerY + radius * 0.5 },
        { x: centerX, y: centerY + radius * 0.2 }
      ];
      
      ctx.strokeStyle = 'rgba(61,214,197,0.3)';
      ctx.lineWidth = 1;
      
      // Draw all 6 edges of tetrahedron
      for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
          ctx.beginPath();
          ctx.moveTo(vertices[i].x, vertices[i].y);
          ctx.lineTo(vertices[j].x, vertices[j].y);
          ctx.stroke();
        }
      }
      
      // Draw vertices
      vertices.forEach((v, i) => {
        const pulse = Math.sin(Date.now() / 1000 + i) * 0.2 + 0.8;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61,214,197,0.8)';
        ctx.fill();
      });
      
      requestAnimationFrame(renderMesh);
    }
    
    // ── Utilities ──
    function showToast(msg, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = \`toast \${type}\`;
      toast.textContent = msg;
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
    
    // Auth fetch helper
    async function authFetch(url, options = {}) {
      const token = localStorage.getItem('status_token');
      if (token) {
        options.headers = { ...options.headers, 'Authorization': 'Bearer ' + token };
      }
      return fetch(url, options);
    }
  </script>
</body>
</html>`;
}
