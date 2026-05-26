#!/usr/bin/env node
/**
 * p31-mesh — probe and inspect K₄ mesh endpoints
 */
import { createK4PersonalAgentClient } from "./agent.mjs";
import {
  findRepoRootWithConstants,
  readMeshBlockFromRoot,
  resolveK4PersonalBaseUrl,
  resolveMeshFleetFromRoot,
} from "./config.mjs";
import { runMeshFleetProbe } from "./fleet.mjs";
import { runK4PersonalMeshProbe } from "./probe.mjs";
import path from "node:path";

function usage() {
  console.log(`p31-mesh — P31 mesh CLI

Usage:
  p31-mesh probe [--root <dir>] [--json]     k4-personal /api/health + /api/mesh (default)
  p31-mesh fleet [--root <dir>] [--json]     personal + cage + hubs liveness from constants
  p31-mesh urls [--root <dir>]               Print mesh URLs from p31-constants.json
  p31-mesh manifest [--root <dir>] <userId>  GET /agent/:userId/manifest
  p31-mesh chat [--root <dir>] [--soulsafe] <userId> <message…>
  p31-mesh state [--root <dir>] <userId>     GET /agent/:userId/state (read-only)
  p31-mesh tetra [--root <dir>] <userId>     GET /agent/:userId/tetra
  p31-mesh energy [--root <dir>] <userId>    GET /agent/:userId/energy
  p31-mesh history [--root <dir>] [--limit N] <userId>  GET /agent/:userId/history
  p31-mesh help

Env:
  MESH_LIVE_STRICT=1   Exit 1 on probe failure
  P31_K4_PERSONAL_URL  Override k4-personal base URL
`);
}

const KNOWN = new Set([
  "probe",
  "fleet",
  "urls",
  "help",
  "manifest",
  "chat",
  "state",
  "tetra",
  "energy",
  "history",
]);

/**
 * @param {string[]} argv
 */
function parseCli(argv) {
  const args = argv.slice(2);
  let cmd = "probe";
  if (args[0] && KNOWN.has(args[0])) {
    cmd = /** @type {string} */ (args.shift());
  }
  /** @type {string | undefined} */
  let rootOpt;
  let soulsafe = false;
  let jsonOut = false;
  let historyLimit = 50;
  /** @type {string[]} */
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--root" && args[i + 1]) {
      rootOpt = args[++i];
      continue;
    }
    if (a === "--soulsafe") {
      soulsafe = true;
      continue;
    }
    if (a === "--json") {
      jsonOut = true;
      continue;
    }
    if (a === "--limit" && args[i + 1]) {
      historyLimit = parseInt(args[++i], 10) || 50;
      continue;
    }
    if (a.startsWith("-")) continue;
    positionals.push(a);
  }
  return { cmd, rootOpt, soulsafe, positionals, jsonOut, historyLimit };
}

function resolveRoot(rootOpt) {
  if (rootOpt) return path.resolve(rootOpt);
  const found = findRepoRootWithConstants(process.cwd());
  if (found) return found;
  return process.cwd();
}

async function cmdProbe(cwd, jsonOut) {
  const strict = process.env.MESH_LIVE_STRICT === "1";
  const resolved = resolveK4PersonalBaseUrl(cwd);
  if (resolved.skipReason) {
    if (jsonOut) {
      console.log(
        JSON.stringify(
          { ok: true, skipped: true, reason: resolved.skipReason, baseUrl: resolved.baseUrl ?? null },
          null,
          2
        )
      );
    } else {
      console.log("p31-mesh probe:", resolved.skipReason, "(exit 0)");
    }
    process.exit(0);
  }
  const base = /** @type {string} */ (resolved.baseUrl);
  const result = await runK4PersonalMeshProbe({ baseUrl: base });
  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          baseUrl: result.baseUrl,
          durationMs: result.durationMs,
          errors: result.errors,
          health: result.health,
          mesh: result.mesh,
        },
        null,
        2
      )
    );
    process.exit(strict && !result.ok ? 1 : 0);
  }
  if (result.ok) {
    const ms = typeof result.durationMs === "number" ? ` (${result.durationMs}ms)` : "";
    console.log("p31-mesh probe: OK", result.baseUrl + ms);
    process.exit(0);
  }
  for (const line of result.errors) {
    console.error("p31-mesh probe:", line);
  }
  if (strict) {
    process.exit(1);
  }
  console.error("p31-mesh probe: non-strict → exit 0");
  process.exit(0);
}

async function cmdFleet(cwd, jsonOut) {
  const strict = process.env.MESH_LIVE_STRICT === "1";
  const { endpoints, skipReason } = resolveMeshFleetFromRoot(cwd);
  const anyUrl = Boolean(endpoints.personal || endpoints.cage || endpoints.hubs);
  if (!anyUrl) {
    const reason = skipReason || "no mesh URLs";
    if (jsonOut) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason, endpoints }, null, 2));
    } else {
      console.log("p31-mesh fleet:", reason, "(exit 0)");
    }
    process.exit(0);
  }
  const result = await runMeshFleetProbe({ endpoints });
  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          durationMs: result.durationMs,
          endpoints,
          errors: result.errors,
          personal: result.personal,
          cage: result.cage,
          hubs: result.hubs,
        },
        null,
        2
      )
    );
    process.exit(strict && !result.ok ? 1 : 0);
  }
  if (result.ok) {
    const ms = typeof result.durationMs === "number" ? ` (${result.durationMs}ms) ` : " ";
    console.log("p31-mesh fleet: OK" + ms + JSON.stringify(endpoints));
    process.exit(0);
  }
  for (const line of result.errors) {
    console.error("p31-mesh fleet:", line);
  }
  if (strict) process.exit(1);
  console.error("p31-mesh fleet: non-strict → exit 0");
  process.exit(0);
}

function cmdUrls(cwd) {
  const { mesh, constantsPath } = readMeshBlockFromRoot(cwd);
  if (!mesh) {
    console.error("p31-mesh urls: no mesh block (missing or invalid p31-constants.json)");
    process.exit(1);
  }
  console.log(JSON.stringify({ constantsPath, mesh }, null, 2));
  process.exit(0);
}

function requireBase(cwd, label) {
  const resolved = resolveK4PersonalBaseUrl(cwd);
  if (resolved.skipReason || !resolved.baseUrl) {
    console.error(`p31-mesh ${label}:`, resolved.skipReason || "no base URL");
    process.exit(1);
  }
  return /** @type {{ baseUrl: string }} */ (resolved);
}

async function cmdManifest(cwd, userId) {
  const { baseUrl } = requireBase(cwd, "manifest");
  const client = createK4PersonalAgentClient({ baseUrl, userId });
  const out = await client.getManifest();
  if (!out.ok) {
    console.error(
      "p31-mesh manifest:",
      out.manifestError || `HTTP ${out.status}`,
      out.text ? out.text.slice(0, 300) : ""
    );
    process.exit(1);
  }
  console.log(JSON.stringify(out.json, null, 2));
  process.exit(0);
}

async function cmdChat(cwd, userId, message, soulsafe) {
  const { baseUrl } = requireBase(cwd, "chat");
  const client = createK4PersonalAgentClient({ baseUrl, userId });
  const res = await client.chat({ message, soulsafe: soulsafe || undefined });
  if (res.status !== 200) {
    console.error("p31-mesh chat: HTTP", res.status, res.text?.slice(0, 500) || "");
    process.exit(1);
  }
  console.log(JSON.stringify(res.json, null, 2));
  process.exit(0);
}

/** @param {() => Promise<{ status: number, json: unknown, text: string }>} getter */
async function cmdAgentJson(label, getter) {
  const res = await getter();
  if (res.status !== 200) {
    console.error(`p31-mesh ${label}: HTTP`, res.status, res.text?.slice(0, 500) || "");
    process.exit(1);
  }
  console.log(JSON.stringify(res.json, null, 2));
  process.exit(0);
}

async function main() {
  const { cmd, rootOpt, soulsafe, positionals, jsonOut, historyLimit } = parseCli(process.argv);
  const cwd = resolveRoot(rootOpt);

  if (cmd === "help" || process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    process.exit(0);
  }
  if (cmd === "fleet") {
    await cmdFleet(cwd, jsonOut);
    return;
  }
  if (cmd === "urls") {
    cmdUrls(cwd);
    return;
  }
  if (cmd === "manifest") {
    const userId = positionals[0];
    if (!userId) {
      console.error("p31-mesh manifest: missing <userId>");
      process.exit(1);
    }
    await cmdManifest(cwd, userId);
    return;
  }
  if (cmd === "chat") {
    const userId = positionals[0];
    const message = positionals.slice(1).join(" ").trim();
    if (!userId || !message) {
      console.error("p31-mesh chat: need <userId> and <message…>");
      process.exit(1);
    }
    await cmdChat(cwd, userId, message, soulsafe);
    return;
  }
  if (cmd === "state" || cmd === "tetra" || cmd === "energy" || cmd === "history") {
    const userId = positionals[0];
    if (!userId) {
      console.error(`p31-mesh ${cmd}: missing <userId>`);
      process.exit(1);
    }
    const { baseUrl } = requireBase(cwd, cmd);
    const client = createK4PersonalAgentClient({ baseUrl, userId });
    if (cmd === "state") await cmdAgentJson("state", () => client.getState());
    if (cmd === "tetra") await cmdAgentJson("tetra", () => client.getTetra());
    if (cmd === "energy") await cmdAgentJson("energy", () => client.getEnergy());
    if (cmd === "history") await cmdAgentJson("history", () => client.getHistory(historyLimit));
    return;
  }
  if (cmd === "probe") {
    await cmdProbe(cwd, jsonOut);
    return;
  }
  usage();
  process.exit(1);
}

main().catch((e) => {
  console.error("p31-mesh:", e);
  process.exit(process.env.MESH_LIVE_STRICT === "1" ? 1 : 0);
});
