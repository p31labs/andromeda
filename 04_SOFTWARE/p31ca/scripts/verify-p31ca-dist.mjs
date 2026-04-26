#!/usr/bin/env node
/**
 * Fails the build if Cloudflare Pages `dist/` is missing critical static assets from `public/`.
 * Run as npm `postbuild` (after `astro build`). Catches empty/partial output before deploy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p31ca = path.join(__dirname, "..");
const dist = path.join(p31ca, "dist");

const requiredFiles = [
  "_redirects",
  "mesh-start.html",
  "initial-build.html",
  "planetary-onboard.html",
  "p31-welcome-packages.json",
  "p31-canon-demo.html",
  "lib/p31-subject-id.js",
  "lib/p31-initial-build-bake.js",
];

let failed = 0;
function err(msg) {
  console.error("verify-p31ca-dist:", msg);
  failed = 1;
}

if (!fs.existsSync(dist)) {
  err("missing dist/ — run npm run build from p31ca");
  process.exit(1);
}

for (const rel of requiredFiles) {
  const fp = path.join(dist, rel);
  if (!fs.existsSync(fp)) {
    err(`missing dist/${rel}`);
  }
}

const redirects = path.join(dist, "_redirects");
if (fs.existsSync(redirects)) {
  const t = fs.readFileSync(redirects, "utf8");
  if (!t.includes("/build") || !t.includes("initial-build")) {
    err("_redirects must include /build → initial-build");
  }
}

const htmlN = fs.readdirSync(dist).filter((f) => f.endsWith(".html")).length;
if (htmlN < 20) {
  err(`expected many static *.html in dist/ (got ${htmlN}) — partial export?`);
}

if (failed) {
  process.exit(1);
}
console.log(`verify-p31ca-dist: OK (${htmlN} top-level html, +lib +_redirects)`);
process.exit(0);
