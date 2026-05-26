/**
 * P31 Worker Utilities
 *
 * Shared utilities for P31 Cloudflare Workers.
 * One source, many derived surfaces — ephemeralization in action.
 *
 * @package @p31/worker-utils
 */

// CORS utilities
export {
  P31_CORS_HEADERS,
  P31_CORS_RESTRICTED,
  corsHeaders,
  handleCorsPreflight,
  isCorsPreflight,
} from "./cors.js";

// Response utilities
export {
  json,
  error,
  notFound,
  health,
  success,
  apiIndex,
  type JsonResponseOptions,
  type HealthStatus,
} from "./response.js";

// Crypto utilities
export {
  uuid,
  generateId,
  b64url,
  fromB64url,
  b64urlFromString,
  generateToken,
  sha256,
  timingSafeEqual,
  hmac,
} from "./crypto.js";

// Mesh utilities
export {
  K4_VERTICES,
  K4_EDGES,
  WORKER_URLS,
  isValidVertex,
  edgeId,
  calculateLoveTotal,
  meshHealth,
  probeUrl,
  type K4Vertex,
  type MeshHealth,
} from "./mesh.js";

/**
 * Package version
 */
export const VERSION = "1.0.0";

/**
 * Package name
 */
export const PACKAGE_NAME = "@p31/worker-utils";
