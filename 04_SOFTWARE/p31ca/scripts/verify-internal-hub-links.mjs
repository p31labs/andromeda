#!/usr/bin/env node
/**
 * Static check: every same-origin href in dist HTML files
 * resolves to a file under dist/, or matches a _redirects rule.
 * Run after `npm run build`. Ignores mailto:, tel:, javascript:, #anchors, external https.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p31ca = path.join(__dirname, "..");
const dist = path.join(p31ca, "dist");

function fail(msg) {
  console.error("verify-internal-hub-links:", msg);
  process.exit(1);
}

if (!fs.existsSync(dist)) {
  fail("missing dist/ — run npm run build");
}

/** rel path from dist root → true if file or directory index exists */
const allFiles = new Set();
function walk(dir, base = "") {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const rel = path.join(base, name).replace(/\\/g, "/");
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      allFiles.add("/" + rel + "/");
      walk(fp, rel);
    } else {
      allFiles.add("/" + rel);
    }
  }
}
walk(dist);

const redirectTargets = new Set();
const redirectFrom = new Map();
const redirPath = path.join(dist, "_redirects");
if (fs.existsSync(redirPath)) {
  for (const line of fs.readFileSync(redirPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const to = parts[parts.length - 2];
      const from = parts.slice(0, -2).join(" ");
      if (from.startsWith("/")) {
        redirectFrom.set(from, to);
        if (to.startsWith("/")) redirectTargets.add(to.split("?")[0]);
      }
    }
  }
}

function resolveHref(href, fromFileRel) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
    return null;
  }
  if (href.startsWith("data:")) return null;
  if (href.includes("${")) return null;
  if (/^STRIPE_LINK_/i.test(href) || href === "STRIPE_LINK_CUSTOM") return null;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return null;
  }
  if (href.startsWith("//")) return null;
  if (href === "#" || href.startsWith("#")) return null;

  let p = href.split("#")[0].split("?")[0];
  if (!p) return null;
  if (p.startsWith("./") || (!p.startsWith("/") && !p.startsWith("."))) {
    const dir = path.posix.dirname("/" + fromFileRel.replace(/\\/g, "/"));
    p = path.posix.normalize(dir + "/" + p);
  } else if (p.startsWith("/")) {
    p = path.posix.normalize(p);
  } else {
    return null;
  }
  return p;
}

function existsInDist(urlPath) {
  if (!urlPath || urlPath === "/") {
    return allFiles.has("/index.html");
  }
  if (allFiles.has(urlPath)) return true;
  if (allFiles.has(urlPath + "/index.html")) return true;
  if (urlPath.endsWith("/") && allFiles.has(urlPath + "index.html")) return true;
  if (!urlPath.endsWith("/") && allFiles.has(urlPath + "/index.html")) return true;
  if (!path.posix.extname(urlPath) && allFiles.has(urlPath + ".html")) return true;
  if (redirectFrom.has(urlPath)) return true;
  if (redirectFrom.has(urlPath + "/")) return true;
  if (redirectFrom.has(urlPath.replace(/\/$/, ""))) return true;
  return false;
}

const htmlFiles = [];
function collectHtml(dir, base = "") {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const rel = path.join(base, name).replace(/\\/g, "/");
    const st = fs.statSync(fp);
    if (st.isDirectory()) collectHtml(fp, rel);
    else if (name.endsWith(".html")) htmlFiles.push(rel);
  }
}
collectHtml(dist);

const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
const errors = [];

for (const rel of htmlFiles) {
  const body = fs.readFileSync(path.join(dist, rel), "utf8");
  let m;
  hrefRe.lastIndex = 0;
  while ((m = hrefRe.exec(body)) !== null) {
    const href = m[1].trim();
    const resolved = resolveHref(href, rel);
    if (resolved == null) continue;
    if (!existsInDist(resolved)) {
      errors.push({ file: rel, href, resolved });
    }
  }
}

if (errors.length) {
  for (const e of errors) {
    console.error(`  ${e.file}: broken href "${e.href}" → ${e.resolved}`);
  }
  fail(`${errors.length} broken internal link(s)`);
}

console.log(`verify-internal-hub-links: OK (${htmlFiles.length} html files scanned)`);
process.exit(0);
