/**
 * k4-personal PersonalAgent HTTP client (/agent/:userId/*)
 */
import { meshGet, meshPost } from "./client.mjs";

/**
 * @param {unknown} n
 * @param {number} fallback
 * @param {number} max
 */
function clampInt(n, fallback, max) {
  const x = typeof n === "number" ? n : parseInt(String(n), 10);
  if (Number.isNaN(x)) return fallback;
  return Math.max(1, Math.min(max, x));
}
import { validatePersonalAgentManifest } from "./schemas.mjs";

/**
 * @param {object} opts
 * @param {string} opts.baseUrl - k4-personal origin
 * @param {string} opts.userId - durable object name segment
 * @param {typeof fetch} [opts.fetch]
 * @param {number} [opts.timeoutMs]
 */
export function createK4PersonalAgentClient(opts) {
  const { baseUrl, userId, fetch: fetchImpl, timeoutMs } = opts;
  const base = baseUrl.replace(/\/+$/, "");
  const enc = encodeURIComponent(userId);
  const prefix = `/agent/${enc}`;

  return {
    /** @returns {string} */
    manifestPath() {
      return `${prefix}/manifest`;
    },
    /** @returns {string} */
    chatPath() {
      return `${prefix}/chat`;
    },

    /**
     * GET /agent/:userId/manifest
     * @returns {Promise<{ ok: boolean, status: number, json: unknown, text: string, manifestError?: string }>}
     */
    async getManifest() {
      const res = await meshGet(base, `${prefix}/manifest`, { fetch: fetchImpl, timeoutMs });
      if (res.status !== 200) {
        return { ok: false, status: res.status, json: res.json, text: res.text };
      }
      const v = validatePersonalAgentManifest(res.json);
      if (!v.ok) {
        return {
          ok: false,
          status: res.status,
          json: res.json,
          text: res.text,
          manifestError: v.message,
        };
      }
      return { ok: true, status: res.status, json: res.json, text: res.text };
    },

    /**
     * POST /agent/:userId/chat
     * @param {{ message: string, soulsafe?: boolean, scope?: string, tools?: unknown[] }} payload
     */
    async chat(payload) {
      const { message, soulsafe, scope, tools } = payload;
      const body = /** @type {Record<string, unknown>} */ ({ message });
      if (soulsafe !== undefined) body.soulsafe = soulsafe;
      if (scope !== undefined) body.scope = scope;
      if (tools !== undefined) body.tools = tools;
      return meshPost(base, `${prefix}/chat`, body, { fetch: fetchImpl, timeoutMs });
    },

    /** GET /agent/:userId/state */
    getState() {
      return meshGet(base, `${prefix}/state`, { fetch: fetchImpl, timeoutMs });
    },

    /** GET /agent/:userId/tetra */
    getTetra() {
      return meshGet(base, `${prefix}/tetra`, { fetch: fetchImpl, timeoutMs });
    },

    /** GET /agent/:userId/energy */
    getEnergy() {
      return meshGet(base, `${prefix}/energy`, { fetch: fetchImpl, timeoutMs });
    },

    /**
     * GET /agent/:userId/history
     * @param {number} [limit] — clamped 1..100 (Worker caps at 100)
     */
    getHistory(limit = 50) {
      const lim = clampInt(limit, 50, 100);
      return meshGet(base, `${prefix}/history?limit=${lim}`, { fetch: fetchImpl, timeoutMs });
    },
  };
}
