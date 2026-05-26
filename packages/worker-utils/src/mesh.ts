/**
 * P31 Worker Mesh Utilities
 *
 * Standard K4 mesh helpers for P31 Cloudflare Workers.
 * One source for mesh patterns across the worker fleet.
 *
 * @module @p31/worker-utils/mesh
 */

/**
 * K4 family cage vertices (initials, not full names)
 */
export const K4_VERTICES = ["will", "S.J.", "W.J.", "christyn"] as const;

export type K4Vertex = (typeof K4_VERTICES)[number];

/**
 * K4 edges (6 edges connecting 4 vertices)
 */
export const K4_EDGES: Array<[K4Vertex, K4Vertex]> = [
  ["will", "S.J."],
  ["will", "W.J."],
  ["will", "christyn"],
  ["S.J.", "W.J."],
  ["S.J.", "christyn"],
  ["W.J.", "christyn"],
];

/**
 * Validate if a string is a K4 vertex
 */
export function isValidVertex(vertex: string): vertex is K4Vertex {
  return K4_VERTICES.includes(vertex as K4Vertex);
}

/**
 * Get the edge ID for a pair of vertices (order-independent)
 */
export function edgeId(a: K4Vertex, b: K4Vertex): string {
  return [a, b].sort().join(":");
}

/**
 * Calculate a deterministic love total for an edge
 * (Simulated - in production this would query KV/D1)
 */
export function calculateLoveTotal(a: K4Vertex, b: K4Vertex): number {
  // Use the edge ID as a seed for deterministic calculation
  const seed = edgeId(a, b);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Return a positive number between 500 and 1500
  return 500 + (Math.abs(hash) % 1000);
}

/**
 * Standard mesh health response
 */
export interface MeshHealth {
  mesh: string;
  status: "online" | "degraded" | "offline";
  vertices: K4Vertex[];
  edges: number;
  [key: string]: unknown;
}

export function meshHealth(
  mesh: string = "k4-cage",
  status: "online" | "degraded" | "offline" = "online"
): MeshHealth {
  return {
    mesh,
    status,
    vertices: [...K4_VERTICES],
    edges: K4_EDGES.length,
  };
}

/**
 * P31 canonical worker URLs (from p31-constants.json)
 * These are the source of truth URLs for inter-worker communication
 */
export const WORKER_URLS = {
  k4Personal: "https://k4-personal.trimtab-signal.workers.dev",
  k4Cage: "https://k4-cage.trimtab-signal.workers.dev",
  k4Hubs: "https://k4-hubs.trimtab-signal.workers.dev",
  agentHub: "https://p31-agent-hub.trimtab-signal.workers.dev",
  orchestrator: "https://p31-orchestrator.trimtab-signal.workers.dev",
  geodesicRoom: "https://geodesic-room.trimtab-signal.workers.dev",
  ecosystemBridge: "https://ecosystem-bridge.trimtab-signal.workers.dev",
  bufferApi: "https://p31-buffer-api.trimtab-signal.workers.dev",
  telemetry: "https://p31-telemetry.trimtab-signal.workers.dev",
  fhir: "https://p31-fhir.trimtab-signal.workers.dev",
  sync: "https://p31-sync.trimtab-signal.workers.dev",
  spaceshipRelay: "https://spaceship-relay.trimtab-signal.workers.dev",
  bondingRelay: "https://bonding-relay.trimtab-signal.workers.dev",
  tetraHub: "https://tetra-hub.trimtab-signal.workers.dev",
  donateApi: "https://donate-api.phosphorus31.org",
} as const;

/**
 * Create a mesh probe URL
 */
export function probeUrl(workerUrl: string, path: string = "/health"): string {
  return `${workerUrl}${path}`;
}
