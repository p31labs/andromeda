#!/usr/bin/env node
/**
 * diff-index-sources.mjs
 *
 * Compares hub "index" sources to reduce drift (CWP WBS 0.1 / 5.1).
 * Run **after** verify-ground-truth in CI (`prebuild` runs GT → hub:build → hub:verify → this).
 *
 * 1) Ensures src/data/hub-landing.json coreProducts id order === COCKPIT_PRODUCT_IDS in build-landing-data.mjs
 * 2) If public/legacy-mvp-hub.html has mvpData, extracts ids; optional strict-mvp for registry match
 * 3) Warns if index.astro still has inline const coreProducts
 *
 * Usage: node scripts/hub/diff-index-sources.mjs
 *   --with-verify  run verify-ground-truth.mjs first (for standalone: npm run hub:diff)
 *   --strict       exit 1 on any warning
 *   --strict-mvp   exit 1 if any mvpData id missing from registry
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const P31CA = path.join(__dirname, "..", "..");
const strict = process.argv.includes("--strict");
const strictMvp = process.argv.includes("--strict-mvp");
const withVerify = process.argv.includes("--with-verify");

function err(msg) {
  console.error("diff-index-sources:", msg);
}

function runVerifyGroundTruth() {
  const script = path.join(P31CA, "scripts", "verify-ground-truth.mjs");
  const r = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    cwd: P31CA,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    err("verify-ground-truth failed — fix ground truth / _redirects / registry / pins first");
    process.exit(1);
  }
}

/**
 * @returns {string[]}
 */
function parseCockpitIdsFromBuildScript() {
  const fp = path.join(P31CA, "scripts", "hub", "build-landing-data.mjs");
  const text = fs.readFileSync(fp, "utf8");
  const m = text.match(/const\s+COCKPIT_PRODUCT_IDS\s*=\s*\[([\s\S]*?)\];/);
  if (!m) {
    throw new Error("COCKPIT_PRODUCT_IDS not found in build-landing-data.mjs");
  }
  const body = m[1];
  const ids = [];
  for (const q of body.matchAll(/['"]([a-z0-9-]+)['"]/g)) {
    ids.push(q[1]);
  }
  return ids;
}

/**
 * @returns {string[]}
 */
function parseHubLandingIds() {
  const fp = path.join(P31CA, "src", "data", "hub-landing.json");
  if (!fs.existsSync(fp)) {
    return [];
  }
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  const list = j.coreProducts;
  if (!Array.isArray(list)) return [];
  return list.map((p) => p.id).filter(Boolean);
}

/**
 * @returns {string[]}
 */
function parseMvpDataIds() {
  const legacy = path.join(P31CA, "public", "legacy-mvp-hub.html");
  const fp = fs.existsSync(legacy)
    ? legacy
    : path.join(P31CA, "public", "index.html");
  if (!fs.existsSync(fp)) {
    return [];
  }
  const m = fs.readFileSync(fp, "utf8");
  const start = m.indexOf("const mvpData =");
  if (start < 0) {
    return [];
  }
  const end = m.indexOf("];", start);
  if (end < 0) {
    return [];
  }
  const block = m.slice(start, end + 2);
  const ids = [];
  for (const r of block.matchAll(/id:\s*['"]([a-z0-9-]+)['"]/gi)) {
    ids.push(r[1]);
  }
  return ids;
}

async function loadRegistry() {
  const regPath = path.join(P31CA, "scripts", "hub", "registry.mjs");
  const { registry } = await import(pathToFileURL(regPath).href);
  return registry;
}

function indexAstroHasInlineCoreProducts() {
  const fp = path.join(P31CA, "src", "pages", "index.astro");
  if (!fs.existsSync(fp)) return false;
  return fs.readFileSync(fp, "utf8").includes("const coreProducts = [");
}

async function main() {
  console.log("diff-index-sources: hub-landing + optional mvpData index\n");

  if (withVerify) {
    runVerifyGroundTruth();
  }

  const cockpitIds = parseCockpitIdsFromBuildScript();
  const hubIds = parseHubLandingIds();
  const mvpIds = parseMvpDataIds();
  const registry = await loadRegistry();
  const byId = new Set(registry.map((r) => r.id));

  let failed = 0;
  let warned = 0;

  if (hubIds.length === 0) {
    err("src/data/hub-landing.json missing or empty — run npm run hub:build");
    failed = 1;
  } else {
    if (hubIds.length !== cockpitIds.length) {
      err(
        `hub-landing coreProducts count (${hubIds.length}) != COCKPIT_PRODUCT_IDS (${cockpitIds.length})`
      );
      failed = 1;
    }
    for (let i = 0; i < Math.min(hubIds.length, cockpitIds.length); i++) {
      if (hubIds[i] !== cockpitIds[i]) {
        err(
          `order/id mismatch at [${i}]: hub-landing ${hubIds[i]} vs COCKPIT ${cockpitIds[i]}`
        );
        failed = 1;
        break;
      }
    }
  }

  for (const id of mvpIds) {
    if (!byId.has(id)) {
      const msg = `mvpData id "${id}" not in registry.mjs — fix mvpData or add registry row`;
      if (strictMvp) {
        err(msg);
        failed = 1;
      } else {
        console.warn("WARNING:", msg);
        warned = 1;
      }
    }
  }

  if (mvpIds.length > 0) {
    const mvpSet = new Set(mvpIds);
    const cockpitSet = new Set(cockpitIds);
    const onlyMvp = [...mvpSet].filter((id) => !cockpitSet.has(id));
    const onlyCockpit = [...cockpitSet].filter((id) => !mvpSet.has(id));
    if (onlyMvp.length || onlyCockpit.length) {
      console.warn(
        "\n[info] mvpData id set != COCKPIT index list (expected until ECO CWP merge):"
      );
      if (onlyMvp.length) console.warn("  only in mvpData:", onlyMvp.join(", "));
      if (onlyCockpit.length) console.warn("  only in COCKPIT (hub home):", onlyCockpit.join(", "));
      warned = 1;
    }
  }

  if (indexAstroHasInlineCoreProducts()) {
    console.warn(
      "\n[warn] src/pages/index.astro still has inline const coreProducts — migrate to hub-landing.json import (CWP D2)"
    );
    warned = 1;
  }

  if (failed) {
    process.exit(1);
  }
  if (strict && warned) {
    err("--strict: warnings treated as failure");
    process.exit(1);
  }
  if (warned) {
    console.log(
      "\ndiff-index-sources: OK (hard checks passed); see warnings above — use --strict-mvp after cleaning legacy-mvp-hub mvpData"
    );
  } else {
    console.log("diff-index-sources: OK (ground truth + hub-landing alignment)");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
