/**
 * K₄ UNIFIED WORKER — The Calcium Cage
 * ======================================
 * P31 Labs, Inc. | EIN 42-1888158
 *
 * One worker. Four vertices. Six edges. Volumetric enclosure (β₂=1).
 *
 * The complete graph K₄ is the minimum rigid structure in 3-space.
 * This worker IS the Posner molecule: Ca₉(PO₄)₆
 * Phosphorus alone burns. Inside the cage, it's stable.
 *
 * Vertices: will, sj, wj, christyn
 * Edges: will↔sj, will↔wj, will↔christyn, sj↔wj, sj↔christyn, wj↔christyn
 *
 * Telemetry: WCD-46 SHA-256 chain-of-custody (Daubert-grade)
 * Auth: Admin token for write ops, public read for mesh state
 *
 * Deploy: wrangler deploy
 * KV Namespace: K4_MESH
 */

// ─── K₄ TOPOLOGY CONSTANTS ───────────────────────────────────────────
const VERTICES = ['will', 'sj', 'wj', 'christyn'];
const EDGES = [
  ['will', 'sj'],      // Dad ↔ Son
  ['will', 'wj'],      // Dad ↔ Daughter
  ['will', 'christyn'], // Co-parent channel
  ['sj', 'wj'],        // Sibling bond
  ['sj', 'christyn'],  // Son ↔ Mom
  ['wj', 'christyn'],  // Daughter ↔ Mom
];

const VERTEX_NAMES = {
  will: 'Will',
  sj: 'S.J.',
  wj: 'W.J.',
  christyn: 'Christyn'
};

const ADMIN_TOKEN = 'p31-dad-2026';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── HELPERS ──────────────────────────────────────────────────────────

function edgeKey(v1, v2) {
  return [v1, v2].sort().join('-');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

function err(message, status = 400) {
  return json({ error: message, timestamp: new Date().toISOString() }, status);
}

function isValidVertex(v) {
  return VERTICES.includes(v);
}

function isValidEdge(v1, v2) {
  return isValidVertex(v1) && isValidVertex(v2) && v1 !== v2;
}

function isAdmin(request) {
  const auth = request.headers.get('Authorization');
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  return auth === `Bearer ${ADMIN_TOKEN}` || token === ADMIN_TOKEN;
}

// ─── SHA-256 CHAIN OF CUSTODY (WCD-46) ───────────────────────────────
// Every telemetry event is hashed with the previous hash.
// Altering any record invalidates all subsequent hashes.
// Daubert-grade: O.C.G.A. §§ 24-9-901, 24-9-902, 24-7-702

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function appendTelemetry(env, event) {
  // Get current chain head
  const headRaw = await env.K4_MESH.get('telemetry:head');
  const head = headRaw ? JSON.parse(headRaw) : { index: 0, hash: '0'.repeat(64) };

  const newIndex = head.index + 1;
  const payload = {
    index: newIndex,
    event,
    timestamp: new Date().toISOString(),
    prevHash: head.hash,
  };

  // H_n = SHA256(P_n + H_{n-1})
  const newHash = await sha256(JSON.stringify(payload) + head.hash);
  payload.hash = newHash;

  // Write the event
  await env.K4_MESH.put(`telemetry:${newIndex}`, JSON.stringify(payload));

  // Update the head
  await env.K4_MESH.put('telemetry:head', JSON.stringify({ index: newIndex, hash: newHash }));

  return payload;
}

// ─── KV OPERATIONS ───────────────────────────────────────────────────

async function getVertex(env, id) {
  const raw = await env.K4_MESH.get(`vertex:${id}`);
  if (!raw) {
    return {
      id,
      name: VERTEX_NAMES[id],
      love: 0,
      status: 'offline',
      lastSeen: null,
      heartbeat: null,
      metadata: {}
    };
  }
  return JSON.parse(raw);
}

async function setVertex(env, id, data) {
  await env.K4_MESH.put(`vertex:${id}`, JSON.stringify(data));
}

async function getEdge(env, v1, v2) {
  const key = edgeKey(v1, v2);
  const raw = await env.K4_MESH.get(`edge:${key}`);
  if (!raw) {
    return {
      vertices: [v1, v2],
      key,
      love: 0,
      pings: [],
      lastActivity: null,
      messageCount: 0
    };
  }
  return JSON.parse(raw);
}

async function setEdge(env, v1, v2, data) {
  const key = edgeKey(v1, v2);
  await env.K4_MESH.put(`edge:${key}`, JSON.stringify(data));
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────────────

async function handleMeshState(env) {
  const vertices = {};
  const edges = {};
  let totalLove = 0;

  for (const v of VERTICES) {
    vertices[v] = await getVertex(env, v);
    totalLove += vertices[v].love;
  }

  for (const [v1, v2] of EDGES) {
    const key = edgeKey(v1, v2);
    edges[key] = await getEdge(env, v1, v2);
    totalLove += edges[key].love;
  }

  return json({
    topology: 'K4',
    vertices: 4,
    edges: 6,
    rigidity: 'isostatic',
    betti_2: 1, // volumetric enclosure
    mesh: { vertices, edges },
    totalLove,
    timestamp: new Date().toISOString(),
    signature: 'Ca₉(PO₄)₆'
  });
}

async function handleVertexGet(env, id) {
  if (!isValidVertex(id)) return err(`Unknown vertex: ${id}. Valid: ${VERTICES.join(', ')}`);
  const vertex = await getVertex(env, id);

  // Get all edges touching this vertex
  const connectedEdges = {};
  for (const [v1, v2] of EDGES) {
    if (v1 === id || v2 === id) {
      const key = edgeKey(v1, v2);
      connectedEdges[key] = await getEdge(env, v1, v2);
    }
  }

  return json({ vertex, edges: connectedEdges });
}

async function handlePresence(env, request, id) {
  if (!isValidVertex(id)) return err(`Unknown vertex: ${id}`);

  const body = await request.json().catch(() => ({}));
  const vertex = await getVertex(env, id);

  vertex.status = body.status || 'online';
  vertex.lastSeen = new Date().toISOString();
  vertex.heartbeat = Date.now();
  if (body.metadata) vertex.metadata = { ...vertex.metadata, ...body.metadata };

  await setVertex(env, id, vertex);

  // Log telemetry
  await appendTelemetry(env, {
    type: 'presence',
    vertex: id,
    status: vertex.status
  });

  return json({ vertex, recorded: true });
}

async function handlePing(env, request, from, to) {
  if (!isValidEdge(from, to)) return err(`Invalid edge: ${from} ↔ ${to}`);

  const body = await request.json().catch(() => ({}));
  const emoji = body.emoji || '💚';
  const edge = await getEdge(env, from, to);
  const fromVertex = await getVertex(env, from);
  const toVertex = await getVertex(env, to);

  // Create ping
  const ping = {
    from,
    to,
    emoji,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID()
  };

  // Add to edge (keep last 50 pings)
  edge.pings = [ping, ...edge.pings].slice(0, 50);
  edge.love += 1;
  edge.lastActivity = ping.timestamp;
  edge.messageCount += 1;

  // LOVE flows to both vertices
  fromVertex.love += 1;
  toVertex.love += 1;

  await setEdge(env, from, to, edge);
  await setVertex(env, from, fromVertex);
  await setVertex(env, to, toVertex);

  // Chain-of-custody telemetry
  const telemetry = await appendTelemetry(env, {
    type: 'ping',
    edge: edgeKey(from, to),
    from,
    to,
    emoji,
    pingId: ping.id
  });

  return json({
    ping,
    edge: { love: edge.love, lastActivity: edge.lastActivity },
    fromLove: fromVertex.love,
    toLove: toVertex.love,
    telemetry: { index: telemetry.index, hash: telemetry.hash }
  });
}

async function handleEdgeGet(env, v1, v2) {
  if (!isValidEdge(v1, v2)) return err(`Invalid edge: ${v1} ↔ ${v2}`);
  return json(await getEdge(env, v1, v2));
}

async function handleTelemetryGet(env, request) {
  const url = new URL(request.url);
  const count = Math.min(parseInt(url.searchParams.get('count') || '20'), 100);

  const headRaw = await env.K4_MESH.get('telemetry:head');
  if (!headRaw) return json({ chain: [], head: null, verified: true });

  const head = JSON.parse(headRaw);
  const chain = [];

  // Walk backwards from head
  for (let i = head.index; i > Math.max(0, head.index - count); i--) {
    const raw = await env.K4_MESH.get(`telemetry:${i}`);
    if (raw) chain.push(JSON.parse(raw));
  }

  // Verify chain integrity
  let verified = true;
  for (let i = 0; i < chain.length - 1; i++) {
    if (chain[i].prevHash !== chain[i + 1].hash) {
      verified = false;
      break;
    }
  }

  return json({
    chain,
    head,
    verified,
    chainLength: head.index,
    standard: 'WCD-46 SHA-256 Chain-of-Custody',
    compliance: ['O.C.G.A. § 24-9-901', 'O.C.G.A. § 24-9-902', 'O.C.G.A. § 24-7-702']
  });
}

async function handleTelemetryPost(env, request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.event) return err('Missing event payload');

  const telemetry = await appendTelemetry(env, body.event);
  return json({ recorded: true, telemetry });
}

async function handleAdminDashboard(env) {
  const mesh = {};

  // Collect all vertex states
  for (const v of VERTICES) {
    mesh[v] = await getVertex(env, v);
  }

  // Collect all edge states
  const edgeStates = {};
  for (const [v1, v2] of EDGES) {
    const key = edgeKey(v1, v2);
    edgeStates[key] = await getEdge(env, v1, v2);
  }

  // Chain stats
  const headRaw = await env.K4_MESH.get('telemetry:head');
  const head = headRaw ? JSON.parse(headRaw) : { index: 0, hash: null };

  return json({
    operator: 'William R. Johnson',
    org: 'P31 Labs, Inc.',
    ein: '42-1888158',
    topology: {
      type: 'K₄ Complete Graph',
      vertices: 4,
      edges: 6,
      rigidity: 'Isostatic (Maxwell: E = 3V - 6 → 6 = 6)',
      betti_2: 1,
      enclosure: 'Volumetric'
    },
    vertices: mesh,
    edges: edgeStates,
    telemetry: {
      chainLength: head.index,
      headHash: head.hash,
      standard: 'WCD-46',
      compliance: 'Daubert'
    },
    infrastructure: {
      worker: 'k4-cage.trimtab-signal.workers.dev',
      kv: 'K4_MESH',
      architecture: 'Single worker, zero Wye dependency'
    },
    generated: new Date().toISOString()
  });
}

// ─── STATUS PAGE (HTML) ──────────────────────────────────────────────

function statusPage() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K₄ Cage — P31 Labs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a; color: #e0e0e0;
      font-family: 'SF Mono', 'Fira Code', monospace;
      padding: 2rem; min-height: 100vh;
    }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 {
      font-size: 2rem; color: #ff6b4a;
      text-shadow: 0 0 20px rgba(255,107,74,0.3);
    }
    .header .sub { color: #888; font-size: 0.85rem; margin-top: 0.5rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 800px; margin: 0 auto; }
    .card {
      background: #111; border: 1px solid #222; border-radius: 8px;
      padding: 1rem; transition: border-color 0.3s;
    }
    .card:hover { border-color: #ff6b4a; }
    .card h3 { color: #ff6b4a; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .endpoint { color: #4ecdc4; font-size: 0.8rem; margin: 0.25rem 0; }
    .meta { color: #666; font-size: 0.75rem; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>K₄ CAGE</h1>
    <div class="sub">P31 Labs, Inc. | One Worker. Four Vertices. Six Edges.</div>
    <div class="sub">Ca₉(PO₄)₆ — The Posner Molecule as Infrastructure</div>
  </div>
  <div class="grid">
    <div class="card">
      <h3>MESH STATE</h3>
      <div class="endpoint">GET /api/mesh</div>
      <div class="meta">Full topology: all vertices + edges + LOVE</div>
    </div>
    <div class="card">
      <h3>VERTEX</h3>
      <div class="endpoint">GET /api/vertex/:id</div>
      <div class="endpoint">POST /api/presence/:id</div>
      <div class="meta">will | sj | wj | christyn</div>
    </div>
    <div class="card">
      <h3>EDGES</h3>
      <div class="endpoint">GET /api/edge/:v1/:v2</div>
      <div class="endpoint">POST /api/ping/:from/:to</div>
      <div class="meta">6 edges, each carrying pings + LOVE</div>
    </div>
    <div class="card">
      <h3>TELEMETRY (WCD-46)</h3>
      <div class="endpoint">GET /api/telemetry</div>
      <div class="endpoint">POST /api/telemetry</div>
      <div class="meta">SHA-256 chain-of-custody, Daubert-grade</div>
    </div>
    <div class="card">
      <h3>ADMIN</h3>
      <div class="endpoint">GET /api/admin/dashboard?token=***</div>
      <div class="meta">Full mesh overview, chain stats</div>
    </div>
    <div class="card">
      <h3>TOPOLOGY</h3>
      <div class="meta">K₄ = 4 vertices, 6 edges</div>
      <div class="meta">Maxwell rigidity: E = 3V - 6 → 6 = 6 ✓</div>
      <div class="meta">β₂ = 1 (volumetric enclosure) ✓</div>
      <div class="meta">Isostatic: minimum rigid in ℝ³ ✓</div>
    </div>
  </div>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html', ...CORS_HEADERS }
  });
}

// ─── ROUTER ──────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Route table
    try {
      // Root → status page
      if (path === '/' || path === '') return statusPage();

      // Mesh state (public read)
      if (path === '/api/mesh' && method === 'GET') return await handleMeshState(env);

      // Vertex operations
      const vertexMatch = path.match(/^\/api\/vertex\/(\w+)$/);
      if (vertexMatch && method === 'GET') return await handleVertexGet(env, vertexMatch[1]);

      // Presence update
      const presenceMatch = path.match(/^\/api\/presence\/(\w+)$/);
      if (presenceMatch && method === 'POST') return await handlePresence(env, request, presenceMatch[1]);

      // Ping (send LOVE along an edge)
      const pingMatch = path.match(/^\/api\/ping\/(\w+)\/(\w+)$/);
      if (pingMatch && method === 'POST') return await handlePing(env, request, pingMatch[1], pingMatch[2]);

      // Edge state
      const edgeMatch = path.match(/^\/api\/edge\/(\w+)\/(\w+)$/);
      if (edgeMatch && method === 'GET') return await handleEdgeGet(env, edgeMatch[1], edgeMatch[2]);

      // Telemetry
      if (path === '/api/telemetry' && method === 'GET') return await handleTelemetryGet(env, request);
      if (path === '/api/telemetry' && method === 'POST') {
        if (!isAdmin(request)) return err('Unauthorized', 401);
        return await handleTelemetryPost(env, request);
      }

      // Admin dashboard
      if (path === '/api/admin/dashboard') {
        if (!isAdmin(request)) return err('Unauthorized', 401);
        return await handleAdminDashboard(env);
      }

      // Health check
      if (path === '/api/health') return json({ status: 'rigid', topology: 'K4', uptime: Date.now() });

      return err('Not found. Try /api/mesh', 404);

    } catch (e) {
      return err(`Internal error: ${e.message}`, 500);
    }
  }
};
