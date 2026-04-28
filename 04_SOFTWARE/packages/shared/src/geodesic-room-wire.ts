/**
 * GeodesicRoom WebSocket + JSON wire — mirrors `geodesic-room/src/index.ts` (v0.2.1).
 * Use from Unity/Godot TS glue, Deno, or any TS client; keep in sync with the Worker.
 */

export const GEODESIC_ROOM_WIRE_SCHEMA = 'p31.geodesicRoomWire/0.2.1' as const;

export const GEODESIC_ROOM_LIMITS = {
  /** Matches geodesic-room SHAPE_CAP */
  shapeCap: 50,
  /** Matches max WebSocket clients per room */
  maxWebSocketClients: 32,
} as const;

export type VertexId = 'v0' | 'v1' | 'v2' | 'v3';

export type ShapeType = 'tet' | 'oct' | 'ico' | 'cube';

export interface VertexPos {
  x: number;
  y: number;
  z: number;
  label: string;
}

export type Vertices = Record<VertexId, VertexPos>;

export interface ShapeRecord {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  z: number;
  /** Radians, +Y tabletop spin (Three.js). Omitted in persisted JSON from older rooms — treat as 0. */
  rotY?: number;
  clientId: string;
  ts: number;
}

export type ShapeMap = Record<string, ShapeRecord>;

export interface RigidityResult {
  V: number;
  E: number;
  F: number;
  rigid: boolean;
}

/** Broadcast op — server `op` payload + shared fields */
export interface GeodesicRoomOp {
  type: 'SET_VERTEX' | 'ADD_SHAPE' | 'MOVE_SHAPE' | 'REMOVE_SHAPE' | 'RESET_SHAPES';
  id?: VertexId;
  shapeId?: string;
  shapeType?: ShapeType;
  x?: number;
  y?: number;
  z?: number;
  rotY?: number;
  version: number;
  ts: number;
  clientId: string;
  rigidity?: RigidityResult;
}

/** Client → GeodesicRoom (WebSocket JSON body) */
export type GeodesicClientMessage =
  | { type: 'SET_VERTEX'; id: VertexId; x: number; y: number; z: number }
  | { type: 'ADD_SHAPE'; shapeId: string; shapeType: ShapeType; x: number; y: number; z: number; rotY?: number }
  | { type: 'MOVE_SHAPE'; shapeId: string; x: number; y: number; z: number; rotY?: number }
  | { type: 'REMOVE_SHAPE'; shapeId: string }
  | { type: 'RESET_SHAPES' }
  | { type: 'RESET' }
  | { type: 'ping' };

/** GeodesicRoom → client (WebSocket JSON) */
export type GeodesicServerMessage =
  | {
      type: 'hello';
      state: Vertices;
      shapes: ShapeMap;
      version: number;
      clientId: string;
      rigidity: RigidityResult;
    }
  | { type: 'op'; op: GeodesicRoomOp }
  | { type: 'reset'; state: Vertices; version: number; ts: number }
  | { type: 'joined'; clientId: string; ts: number }
  | { type: 'left'; clientId: string; ts: number }
  | { type: 'pong'; ts: number }
  | { type: 'error'; code: 'SHAPE_CAP'; max: number };

/** GET /api/geodesic/:roomId/state response */
export interface GeodesicRoomStateSnapshot {
  vertices: Vertices;
  shapes: ShapeMap;
  version: number;
  connections: number;
  rigidity: RigidityResult;
}
