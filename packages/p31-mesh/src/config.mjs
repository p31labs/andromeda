/**
 * Resolve canonical mesh URLs from p31-constants.json and/or environment overrides.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Walk up from startDir for a directory containing p31-constants.json.
 * @param {string} startDir
 * @param {number} [maxDepth]
 * @returns {string | undefined}
 */
export function findRepoRootWithConstants(startDir, maxDepth = 12) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < maxDepth; i++) {
    const candidate = path.join(dir, "p31-constants.json");
    if (fs.existsSync(candidate)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/** @type {readonly string[]} */
export const K4_PERSONAL_URL_ENV_KEYS = [
  "P31_K4_PERSONAL_URL",
  "P31_MESH_K4_PERSONAL_URL",
];

/** @type {readonly string[]} */
export const K4_CAGE_URL_ENV_KEYS = ["P31_K4_CAGE_URL", "P31_MESH_K4_CAGE_URL"];

/** @type {readonly string[]} */
export const K4_HUBS_URL_ENV_KEYS = ["P31_K4_HUBS_URL", "P31_MESH_K4_HUBS_URL"];

/**
 * @param {string} rootDir - Repository root (directory containing p31-constants.json)
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string} [constantsFileName]
 * @returns {{ mesh: Record<string, unknown> | null, constantsPath: string }}
 */
export function readMeshBlockFromRoot(rootDir, env = process.env, constantsFileName = "p31-constants.json") {
  const constantsPath = path.join(rootDir, constantsFileName);
  if (!fs.existsSync(constantsPath)) {
    return { mesh: null, constantsPath };
  }
  const raw = fs.readFileSync(constantsPath, "utf8");
  let c;
  try {
    c = JSON.parse(raw);
  } catch {
    return { mesh: null, constantsPath };
  }
  const mesh = c?.mesh && typeof c.mesh === "object" ? /** @type {Record<string, unknown>} */ (c.mesh) : null;
  return { mesh, constantsPath };
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | undefined}
 */
export function k4PersonalUrlFromEnv(env = process.env) {
  for (const key of K4_PERSONAL_URL_ENV_KEYS) {
    const v = env[key];
    if (v && String(v).trim()) return String(v).trim().replace(/\/+$/, "");
  }
  return undefined;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | undefined}
 */
export function k4CageUrlFromEnv(env = process.env) {
  for (const key of K4_CAGE_URL_ENV_KEYS) {
    const v = env[key];
    if (v && String(v).trim()) return String(v).trim().replace(/\/+$/, "");
  }
  return undefined;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | undefined}
 */
export function k4HubsUrlFromEnv(env = process.env) {
  for (const key of K4_HUBS_URL_ENV_KEYS) {
    const v = env[key];
    if (v && String(v).trim()) return String(v).trim().replace(/\/+$/, "");
  }
  return undefined;
}

/**
 * Strip trailing slash from mesh URL fields in constants.
 * @param {string} rootDir
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   endpoints: { personal?: string, cage?: string, hubs?: string },
 *   skipReason?: string,
 *   constantsPath: string
 * }}
 */
export function resolveMeshFleetFromRoot(rootDir, env = process.env) {
  const { mesh, constantsPath } = readMeshBlockFromRoot(rootDir, env);
  const fileExists = fs.existsSync(constantsPath);

  const strip = (u) => (typeof u === "string" ? u.replace(/\/+$/, "") : undefined);

  const personal =
    k4PersonalUrlFromEnv(env) || strip(mesh?.k4PersonalWorkerUrl);
  const cage = k4CageUrlFromEnv(env) || strip(mesh?.k4CageWorkerUrl);
  const hubs = k4HubsUrlFromEnv(env) || strip(mesh?.k4HubsWorkerUrl);

  const endpoints = { personal, cage, hubs };

  if (!personal && !cage && !hubs) {
    if (!fileExists) {
      return { endpoints, skipReason: "no p31-constants.json", constantsPath };
    }
    return { endpoints, skipReason: "no mesh worker URLs in constants", constantsPath };
  }

  return { endpoints, constantsPath };
}

/**
 * @param {string} rootDir
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ baseUrl?: string, skipReason?: string, constantsPath?: string }}
 */
export function resolveK4PersonalBaseUrl(rootDir, env = process.env) {
  const fromEnv = k4PersonalUrlFromEnv(env);
  if (fromEnv) {
    return { baseUrl: fromEnv };
  }
  const { mesh, constantsPath } = readMeshBlockFromRoot(rootDir, env);
  if (!fs.existsSync(constantsPath)) {
    return { skipReason: "no p31-constants.json", constantsPath };
  }
  const base = mesh?.k4PersonalWorkerUrl;
  if (!base || typeof base !== "string") {
    return { skipReason: "no mesh.k4PersonalWorkerUrl", constantsPath };
  }
  return { baseUrl: base.replace(/\/+$/, ""), constantsPath };
}
