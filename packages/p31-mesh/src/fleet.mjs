/**
 * Multi-edge mesh probes: k4-personal (+ cage + hubs) from constants / env.
 */
import { meshGet } from "./client.mjs";
import { validateK4CageHealth, validateK4HubsHealth } from "./schemas.mjs";
import { runK4PersonalMeshProbe } from "./probe.mjs";

/**
 * @typedef {object} EdgeProbeOk
 * @property {true} ok
 * @property {number} status
 */

/**
 * @typedef {object} EdgeProbeFail
 * @property {false} ok
 * @property {number} status
 * @property {string[]} errors
 * @property {string} [textPreview]
 */

/**
 * @param {string} baseUrl
 * @param {string} path
 * @param {(json: unknown) => { ok: boolean, message?: string }} validator
 * @param {{ fetch?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<EdgeProbeOk | EdgeProbeFail>}
 */
export async function runSingleHealthProbe(baseUrl, path, validator, opts = {}) {
  const { fetch: fetchImpl, timeoutMs } = opts;
  try {
    const res = await meshGet(baseUrl, path, { fetch: fetchImpl, timeoutMs });
    if (res.status !== 200) {
      return {
        ok: false,
        status: res.status,
        errors: [`HTTP ${res.status}`],
        textPreview: res.text?.slice(0, 200),
      };
    }
    const v = validator(res.json);
    if (!v.ok) {
      return {
        ok: false,
        status: res.status,
        errors: [v.message || "validation failed"],
        textPreview: res.text?.slice(0, 200),
      };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, errors: [msg] };
  }
}

/**
 * @typedef {object} MeshFleetEndpoints
 * @property {string} [personal]
 * @property {string} [cage]
 * @property {string} [hubs]
 */

/**
 * @typedef {object} MeshFleetProbeResult
 * @property {boolean} ok
 * @property {string[]} errors
 * @property {number} durationMs - Wall time for the full fleet probe (edges in parallel)
 * @property {import('./probe.mjs').K4PersonalMeshProbeResult} [personal]
 * @property {(EdgeProbeOk | EdgeProbeFail)} [cage]
 * @property {(EdgeProbeOk | EdgeProbeFail)} [hubs]
 */

/**
 * @param {object} opts
 * @param {MeshFleetEndpoints} opts.endpoints
 * @param {typeof fetch} [opts.fetch]
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<MeshFleetProbeResult>}
 */
export async function runMeshFleetProbe(opts) {
  const started = Date.now();
  const { endpoints, fetch: fetchImpl, timeoutMs } = opts;
  const pass = { fetch: fetchImpl, timeoutMs };

  /** @type {MeshFleetProbeResult} */
  const out = { ok: true, errors: [], durationMs: 0 };
  /** @type {Promise<void>[]} */
  const pending = [];

  if (endpoints.personal) {
    pending.push(
      runK4PersonalMeshProbe({
        baseUrl: /** @type {string} */ (endpoints.personal),
        ...pass,
      }).then((r) => {
        out.personal = r;
        if (!r.ok) {
          out.ok = false;
          for (const e of r.errors) {
            const line = `personal: ${e}`;
            out.errors.push(line);
          }
        }
      })
    );
  }

  if (endpoints.cage) {
    pending.push(
      runSingleHealthProbe(endpoints.cage, "/api/health", validateK4CageHealth, pass).then((r) => {
        out.cage = r;
        if (!r.ok) {
          out.ok = false;
          for (const e of r.errors) {
            const line = `cage: ${e}`;
            out.errors.push(line);
          }
        }
      })
    );
  }

  if (endpoints.hubs) {
    pending.push(
      runSingleHealthProbe(endpoints.hubs, "/health", validateK4HubsHealth, pass).then((r) => {
        out.hubs = r;
        if (!r.ok) {
          out.ok = false;
          for (const e of r.errors) {
            const line = `hubs: ${e}`;
            out.errors.push(line);
          }
        }
      })
    );
  }

  await Promise.all(pending);
  out.durationMs = Date.now() - started;
  return out;
}
