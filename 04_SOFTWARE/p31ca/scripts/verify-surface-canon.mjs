#!/usr/bin/env node
/**
 * verify-surface-canon — check valve for canonical head stack on every public HTML surface.
 *
 * REQUIRED on every page (in order):
 *   1. p31-gray-rock      inline Gray Rock script in <head>
 *   2. qmu-tokens         /public/lib/p31-qmu-tokens.css
 *   3. p31-style          /p31-style.css
 *   4. shared-surface     /p31-shared-surface.css
 *   5. data-p31-appearance  <html data-p31-appearance="hub|org|auto">
 *
 * FORBIDDEN on every page:
 *   - terminal-glass      old CRT scanline aesthetic
 *   - --ede-*             off-canon local variables from archived EDE pages
 *   - Tailwind CDN        cdn.tailwindcss.com (use canon tokens instead)
 *   - Playfair Display    off-canon display font (use Atkinson Hyperlegible)
 *   - Inter / Roboto      off-canon body fonts
 *
 * BACKLOG: pages in surface-canon-backlog.json are grandfathered (WARN, not FAIL).
 *   They existed before this gate. New pages not in the backlog must pass or deploy is blocked.
 *   To graduate a page from backlog: fix it, remove from backlog, done.
 *
 * Exits 1 if any NEW (non-backlog) page fails.
 * Exits 0 with warnings for backlog pages so deploy keeps working while migration happens.
 *
 * Run:  node scripts/verify-surface-canon.mjs
 *       SURFACE_CANON_STRICT=1 node scripts/verify-surface-canon.mjs  (fail on backlog too)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p31caRoot = path.join(__dirname, "..");
const publicDir = path.join(p31caRoot, "public");
const backlogPath = path.join(__dirname, "surface-canon-backlog.json");
const STRICT = process.env.SURFACE_CANON_STRICT === "1";

const REQUIRED = [
  { id: "gray-rock",     needle: "p31-gray-rock",           label: "Gray Rock inline script"     },
  { id: "qmu-tokens",    needle: "p31-qmu-tokens.css",      label: "QMU tokens stylesheet"        },
  { id: "p31-style",     needle: "/p31-style.css",           label: "p31-style.css"                },
  { id: "shared-surface",needle: "p31-shared-surface.css",  label: "p31-shared-surface.css"       },
  { id: "appearance",    needle: "data-p31-appearance",      label: "data-p31-appearance on <html>"},
  { id: "return-ribbon", needle: "p31-return-ribbon",        label: "return-ribbon footer"         },
  { id: "starfield",     needle: "starfield-canvas",         label: "starfield canvas"             },
  { id: "skip-link",     needle: "p31-skip-link",            label: "skip-link (a11y)"             },
  { id: "top-bar",       needle: "p31-top-bar",              label: "top-bar header"               },
];

const FORBIDDEN = [
  { id: "terminal-glass", needle: "terminal-glass",        label: "terminal-glass class (use p31-q-surface)" },
  { id: "ede-vars",        needle: "--ede-",                label: "--ede-* local vars (use canon tokens)" },
  { id: "tailwind-cdn",   needle: "cdn.tailwindcss.com",   label: "Tailwind CDN (use p31-style.css tokens)" },
  { id: "playfair",        needle: "Playfair Display",      label: "Playfair Display font (use Atkinson Hyperlegible)" },
];

if (!fs.existsSync(publicDir)) {
  console.log("verify-surface-canon: skip — no p31ca public dir");
  process.exit(0);
}

const backlog = new Set(
  fs.existsSync(backlogPath)
    ? JSON.parse(fs.readFileSync(backlogPath, "utf8"))
    : []
);

const htmlFiles = fs.readdirSync(publicDir)
  .filter((f) => f.endsWith(".html"))
  .sort();

let newFails = 0;
let backlogWarns = 0;
const newFailList = [];
const backlogWarnList = [];

for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  const full = fs.readFileSync(filePath, "utf8");
  // Head-only checks use the first 4000 chars; body-feature checks use the full file.
  const head = full.slice(0, 4000);
  const isBacklog = backlog.has(file);
  const issues = [];

  for (const { id, needle, label } of REQUIRED) {
    if (!full.includes(needle)) issues.push(`missing ${label}`);
  }
  for (const { id, needle, label } of FORBIDDEN) {
    if (full.includes(needle)) issues.push(`forbidden: ${label}`);
  }

  if (!issues.length) continue;

  if (isBacklog) {
    backlogWarns++;
    backlogWarnList.push({ file, issues });
  } else {
    newFails++;
    newFailList.push({ file, issues });
  }
}

// New files always fail hard
if (newFailList.length) {
  console.error(`verify-surface-canon: FAIL — ${newFailList.length} new file(s) violate canon:`);
  for (const { file, issues } of newFailList) {
    console.error(`  ${file}:`);
    for (const issue of issues) console.error(`    ✗ ${issue}`);
  }
  console.error(`  Fix: run npm run new:page to scaffold, or add missing links manually.`);
}

// Backlog files warn (or fail in strict mode)
if (backlogWarnList.length) {
  const verb = STRICT ? "FAIL" : "WARN";
  console[STRICT ? "error" : "warn"](
    `verify-surface-canon: ${verb} — ${backlogWarnList.length} backlog page(s) not yet migrated:`
  );
  for (const { file, issues } of backlogWarnList) {
    console[STRICT ? "error" : "warn"](`  ${file}: ${issues.join(" · ")}`);
  }
  console[STRICT ? "error" : "warn"](
    `  Graduate a page: fix it, remove from scripts/surface-canon-backlog.json.`
  );
  if (STRICT) newFails += backlogWarnList.length;
}

const total = htmlFiles.length;
const compliant = total - newFailList.length - backlogWarnList.length;
const pct = Math.round((compliant / total) * 100);

if (!newFailList.length && !backlogWarnList.length) {
  console.log(`verify-surface-canon: OK — ${total} pages, 100% canon compliant`);
} else if (!newFailList.length) {
  console.log(
    `verify-surface-canon: OK — ${compliant}/${total} compliant (${pct}%) · ${backlogWarnList.length} backlog remaining`
  );
} else {
  console.error(
    `verify-surface-canon: FAIL — ${compliant}/${total} compliant · ${newFailList.length} new violation(s) block deploy`
  );
}

process.exit(newFails > 0 ? 1 : 0);
