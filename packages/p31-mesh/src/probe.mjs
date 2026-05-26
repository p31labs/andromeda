/**
 * Live probes for k4-personal: GET /api/health + GET /api/mesh
 */
import { meshGet } from "./client.mjs";
import { validateK4PersonalHealth } from "./schemas.mjs";

/**
 * @typedef {object} ProbeStepResult
 * @property {boolean} ok
 * @property {number} status
 * @property {string} [textPreview]
 * @property {string} [error]
 */

/**
 * @typedef {object} K4PersonalMeshProbeResult
 * @property {boolean} ok
 * @property {string} baseUrl
 * @property {ProbeStepResult} health
 * @property {ProbeStepResult} mesh
 * @property {string[]} errors - Human-readable failures
 * @property {number} durationMs - Wall time for the full probe (parallel health + mesh)
 */

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {typeof fetch} [opts.fetch]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<K4PersonalMeshProbeResult>}
 */
export async function runK4PersonalMeshProbe(opts) {
  const started = Date.now();
  const { baseUrl, fetch: fetchImpl, timeoutMs } = opts;
  const base = baseUrl.replace(/\/+$/, "");
  const getOpts = { fetch: fetchImpl, timeoutMs };

  /**
   * Health and mesh are independent; run in parallel to halve wall-clock vs sequential GETs.
   * @returns {Promise<{ step: ProbeStepResult, more: string[] }>}
   */
  async function doHealth() {
    const more = [];
    try {
      const h = await meshGet(base, "/api/health", getOpts);
      /** @type {ProbeStepResult} */
      const step = {
        ok: h.status === 200,
        status: h.status,
        textPreview: h.text ? h.text.slice(0, 200) : "",
      };
      if (h.status !== 200) {
        more.push(
          `GET /api/health → HTTP ${h.status} (deploy: pnpm --filter k4-personal deploy from andromeda/04_SOFTWARE)`
        );
      } else {
        const v = validateK4PersonalHealth(h.json);
        if (!v.ok) {
          step.ok = false;
          more.push(`GET /api/health body unexpected: ${step.textPreview}`);
        }
      }
      return { step, more };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      more.push(`GET /api/health failed: ${msg}`);
      return { step: { ok: false, status: 0, error: msg }, more };
    }
  }

  /**
   * @returns {Promise<{ step: ProbeStepResult, more: string[] }>}
   */
  async function doMesh() {
    const more = [];
    try {
      const m = await meshGet(base, "/api/mesh", getOpts);
      /** @type {ProbeStepResult} */
      const step = {
        ok: m.status === 200,
        status: m.status,
        textPreview: m.text ? m.text.slice(0, 200) : "",
      };
      if (m.status !== 200) {
        more.push(`GET /api/mesh → HTTP ${m.status}`);
      }
      return { step, more };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      more.push(`GET /api/mesh failed: ${msg}`);
      return { step: { ok: false, status: 0, error: msg }, more };
    }
  }

  const [H, M] = await Promise.all([doHealth(), doMesh()]);
  const errors = [...H.more, ...M.more];
  const health = H.step;
  const mesh = M.step;
  const ok = health.ok && mesh.ok;
  const durationMs = Date.now() - started;
  return { ok, baseUrl: base, health, mesh, errors, durationMs };
}

/**
 * Map probe result to process exit code for CI-style runners.
 * @param {K4PersonalMeshProbeResult} result
 * @param {boolean} strict
 * @returns {0 | 1}
 */
export function probeExitCode(result, strict) {
  if (result.ok) return 0;
  return strict ? 1 : 0;
}
