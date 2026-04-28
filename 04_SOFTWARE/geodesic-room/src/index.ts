import { DurableObject } from 'cloudflare:workers';

/**
 * geodesic-room v2: authoritative K₄ vertices + N-shape build state via Durable Object
 *
 * Routes:
 *   GET /api/geodesic/:roomId/state  → JSON snapshot (vertices + shapes + rigidity)
 *   GET /api/geodesic/:roomId/ws     → WebSocket upgrade
 *
 * WS client → server:
 *   { type: 'SET_VERTEX', id: 'v0'|'v1'|'v2'|'v3', x, y, z }
 *   { type: 'ADD_SHAPE', shapeId: string, shapeType: ShapeType, x, y, z, rotY?: number }
 *   { type: 'MOVE_SHAPE', shapeId: string, x, y, z, rotY?: number }
 *   { type: 'REMOVE_SHAPE', shapeId: string }
 *   { type: 'RESET_SHAPES' }
 *   { type: 'RESET' }       ← resets vertices only
 *   { type: 'ping' }
 *
 * WS server → client:
 *   { type: 'hello',  state: Vertices, shapes: ShapeMap, version, clientId, rigidity }
 *   { type: 'op',     op: Op }
 *   { type: 'reset',  state: Vertices, version, ts }  ← vertex-only reset
 *   { type: 'joined', clientId, ts }
 *   { type: 'left',   clientId, ts }
 *   { type: 'pong',   ts }
 *   { type: 'error',  code: 'SHAPE_CAP', max: number }
 */

export interface Env {
  GEODESIC_ROOM: DurableObjectNamespace;
  /** From wrangler.toml `[vars]` WORKER_VERSION (npm package semver) */
  WORKER_VERSION?: string;
}

export type VertexId = 'v0' | 'v1' | 'v2' | 'v3';
export type ShapeType = 'tet' | 'oct' | 'ico' | 'cube';

export interface VertexPos {
  x: number; y: number; z: number; label: string;
}

export interface ShapeRecord {
  id: string;
  type: ShapeType;
  x: number; y: number; z: number;
  /** Radians — rotation about +Y (tabletop spin), Three.js convention. Optional in persisted JSON (default 0). */
  rotY?: number;
  clientId: string;
  ts: number;
}

export interface RigidityResult {
  V: number; E: number; F: number; rigid: boolean;
}

export type Vertices = Record<VertexId, VertexPos>;
export type ShapeMap = Record<string, ShapeRecord>;

export interface Op {
  type: 'SET_VERTEX' | 'ADD_SHAPE' | 'MOVE_SHAPE' | 'REMOVE_SHAPE' | 'RESET_SHAPES';
  // SET_VERTEX
  id?: VertexId;
  // ADD_SHAPE / MOVE_SHAPE / REMOVE_SHAPE
  shapeId?: string;
  shapeType?: ShapeType;
  // position (all ops that move something)
  x?: number; y?: number; z?: number;
  /** Y rotation (radians), ADD_SHAPE / MOVE_SHAPE */
  rotY?: number;
  // shared metadata
  version: number;
  ts: number;
  clientId: string;
  rigidity?: RigidityResult;
}

// Unit tetrahedron: all edges length 2√2, inscribed in unit sphere
const DEFAULT_VERTICES: Vertices = {
  v0: { x:  1, y:  1, z:  1, label: 'will' },
  v1: { x: -1, y:  1, z: -1, label: 'sj' },
  v2: { x: -1, y: -1, z:  1, label: 'wj' },
  v3: { x:  1, y: -1, z: -1, label: 'christyn' },
};

const VERTEX_IDS: VertexId[] = ['v0', 'v1', 'v2', 'v3'];
const VALID_TYPES = new Set<ShapeType>(['tet', 'oct', 'ico', 'cube']);
const SHAPE_CAP = 50;

const SHAPE_VERTS: Record<ShapeType, number> = { tet: 4, oct: 6, ico: 12, cube: 8 };
const SHAPE_EDGES: Record<ShapeType, number> = { tet: 6, oct: 12, ico: 30, cube: 12 };
const SHAPE_FACES: Record<ShapeType, number> = { tet: 4, oct: 8, ico: 20, cube: 6 };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Tabletop yaw — generous bound so floats don’t spike from client bugs */
function sanitizeRotY(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  const maxTurns = Math.PI * 96;
  return clamp(n, -maxTurns, maxTurns);
}

function sanitizeId(raw: unknown, maxLen = 64): string {
  return String(raw ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
}

function computeRigidity(shapes: ShapeMap): RigidityResult {
  let V = 0, E = 0, F = 0;
  for (const s of Object.values(shapes)) {
    V += SHAPE_VERTS[s.type] ?? 0;
    E += SHAPE_EDGES[s.type] ?? 0;
    F += SHAPE_FACES[s.type] ?? 0;
  }
  return { V, E, F, rigid: V === 0 ? false : E >= 3 * V - 6 };
}

export class GeodesicRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private broadcastJson(msg: unknown, excludeClientId?: string): void {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const [clientId] = this.ctx.getTags(ws);
      if (excludeClientId && clientId === excludeClientId) continue;
      try { ws.send(data); } catch { /* ws disconnected */ }
    }
  }

  private async getVertices(): Promise<Vertices> {
    const raw = await this.ctx.storage.get<string>('vertices');
    if (!raw) return { ...DEFAULT_VERTICES };
    try { return JSON.parse(raw) as Vertices; } catch { return { ...DEFAULT_VERTICES }; }
  }

  private async getShapes(): Promise<ShapeMap> {
    const raw = await this.ctx.storage.get<string>('shapes');
    if (!raw) return {};
    try { return JSON.parse(raw) as ShapeMap; } catch { return {}; }
  }

  private async getVersion(): Promise<number> {
    return (await this.ctx.storage.get<number>('version')) ?? 0;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.endsWith('/state')) {
      const [vertices, shapes, version] = await Promise.all([
        this.getVertices(), this.getShapes(), this.getVersion(),
      ]);
      return Response.json({
        vertices, shapes, version,
        connections: this.ctx.getWebSockets().length,
        rigidity: computeRigidity(shapes),
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return Response.json({ error: 'WebSocket upgrade required' }, { status: 426 });
    }

    if (this.ctx.getWebSockets().length >= 32) {
      return new Response('Room full', { status: 503 });
    }

    const clientId = sanitizeId(url.searchParams.get('client'), 64) ||
      `anon-${crypto.randomUUID().slice(0, 8)}`;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server, [clientId]);

    const [vertices, shapes, version] = await Promise.all([
      this.getVertices(), this.getShapes(), this.getVersion(),
    ]);
    server.send(JSON.stringify({
      type: 'hello',
      state: vertices,
      shapes,
      version,
      clientId,
      rigidity: computeRigidity(shapes),
    }));

    this.broadcastJson({ type: 'joined', clientId, ts: Date.now() }, clientId);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(message) as Record<string, unknown>; } catch { return; }

    const [clientId] = this.ctx.getTags(ws);
    const version = (await this.getVersion()) + 1;

    switch (msg['type']) {

      case 'SET_VERTEX': {
        const id = msg['id'] as string;
        if (!VERTEX_IDS.includes(id as VertexId)) return;
        const x = clamp(Number(msg['x']), -12, 12);
        const y = clamp(Number(msg['y']), -12, 12);
        const z = clamp(Number(msg['z']), -12, 12);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return;
        const vertices = await this.getVertices();
        vertices[id as VertexId] = { ...vertices[id as VertexId], x, y, z };
        await this.ctx.storage.put('vertices', JSON.stringify(vertices));
        await this.ctx.storage.put('version', version);
        const op: Op = { type: 'SET_VERTEX', id: id as VertexId, x, y, z, version, ts: Date.now(), clientId };
        this.broadcastJson({ type: 'op', op });
        break;
      }

      case 'ADD_SHAPE': {
        const shapes = await this.getShapes();
        if (Object.keys(shapes).length >= SHAPE_CAP) {
          ws.send(JSON.stringify({ type: 'error', code: 'SHAPE_CAP', max: SHAPE_CAP }));
          return;
        }
        const shapeId = sanitizeId(msg['shapeId']);
        if (!shapeId || shapes[shapeId]) return; // reject empty or duplicate id
        const shapeType = msg['shapeType'] as ShapeType;
        if (!VALID_TYPES.has(shapeType)) return;
        const x = clamp(Number(msg['x']), -20, 20);
        const y = clamp(Number(msg['y']), -20, 20);
        const z = clamp(Number(msg['z']), -20, 20);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return;
        const rotYRequested = msg['rotY'];
        const rotY = rotYRequested !== undefined && rotYRequested !== null
          ? sanitizeRotY(rotYRequested)
          : 0;
        const shape: ShapeRecord = { id: shapeId, type: shapeType, x, y, z, rotY, clientId, ts: Date.now() };
        shapes[shapeId] = shape;
        await this.ctx.storage.put('shapes', JSON.stringify(shapes));
        await this.ctx.storage.put('version', version);
        const rigidity = computeRigidity(shapes);
        const op: Op = { type: 'ADD_SHAPE', shapeId, shapeType, x, y, z, rotY, version, ts: Date.now(), clientId, rigidity };
        this.broadcastJson({ type: 'op', op });
        break;
      }

      case 'MOVE_SHAPE': {
        const shapeId = sanitizeId(msg['shapeId']);
        if (!shapeId) return;
        const shapes = await this.getShapes();
        if (!shapes[shapeId]) return;
        const x = clamp(Number(msg['x']), -20, 20);
        const y = clamp(Number(msg['y']), -20, 20);
        const z = clamp(Number(msg['z']), -20, 20);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return;
        const prev = shapes[shapeId];
        const rotYRaw = msg['rotY'];
        const rotY = rotYRaw !== undefined && rotYRaw !== null
          ? sanitizeRotY(rotYRaw)
          : (prev.rotY ?? 0);
        shapes[shapeId] = { ...prev, x, y, z, rotY, ts: Date.now() };
        await this.ctx.storage.put('shapes', JSON.stringify(shapes));
        await this.ctx.storage.put('version', version);
        const op: Op = { type: 'MOVE_SHAPE', shapeId, x, y, z, rotY, version, ts: Date.now(), clientId };
        this.broadcastJson({ type: 'op', op });
        break;
      }

      case 'REMOVE_SHAPE': {
        const shapeId = sanitizeId(msg['shapeId']);
        if (!shapeId) return;
        const shapes = await this.getShapes();
        if (!shapes[shapeId]) return;
        delete shapes[shapeId];
        await this.ctx.storage.put('shapes', JSON.stringify(shapes));
        await this.ctx.storage.put('version', version);
        const rigidity = computeRigidity(shapes);
        const op: Op = { type: 'REMOVE_SHAPE', shapeId, version, ts: Date.now(), clientId, rigidity };
        this.broadcastJson({ type: 'op', op });
        break;
      }

      case 'RESET_SHAPES': {
        await this.ctx.storage.put('shapes', JSON.stringify({}));
        await this.ctx.storage.put('version', version);
        const op: Op = { type: 'RESET_SHAPES', version, ts: Date.now(), clientId, rigidity: { V: 0, E: 0, F: 0, rigid: false } };
        this.broadcastJson({ type: 'op', op });
        break;
      }

      case 'RESET': {
        const vertices = { ...DEFAULT_VERTICES };
        await this.ctx.storage.put('vertices', JSON.stringify(vertices));
        await this.ctx.storage.put('version', version);
        this.broadcastJson({ type: 'reset', state: vertices, version, ts: Date.now() });
        break;
      }

      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const [clientId] = this.ctx.getTags(ws);
    this.broadcastJson({ type: 'left', clientId, ts: Date.now() }, clientId);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try { ws.close(); } catch { /* already closed */ }
  }
}

/** Matches `@p31/shared/geodesic-room-wire` — CI enforces alignment (`p31ca`: `verify:geodesic-room-wire`). */
const GEODESIC_ROOM_WIRE_SCHEMA = 'p31.geodesicRoomWire/0.2.1';

const ROOM_PATTERN = /^\/api\/geodesic\/([a-zA-Z0-9_-]{1,64})\/(ws|state)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const m = ROOM_PATTERN.exec(url.pathname);
    if (!m) {
      const pkg =
        typeof env.WORKER_VERSION === 'string' && env.WORKER_VERSION.trim()
          ? env.WORKER_VERSION.trim()
          : undefined;
      return Response.json(
        {
          service: 'geodesic-room',
          /** Historic numeric probe — not semver */
          version: 2,
          ok: true,
          wireSchema: GEODESIC_ROOM_WIRE_SCHEMA,
          ...(pkg ? { packageVersion: pkg } : {}),
        },
        { status: 200 },
      );
    }
    const [, roomId] = m;
    const id = env.GEODESIC_ROOM.idFromName(roomId);
    const stub = env.GEODESIC_ROOM.get(id);
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
