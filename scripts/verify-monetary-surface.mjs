#!/usr/bin/env node
/**
 * CWP-P31-MAP-2026-01 (D-MAP-11) — static checks for the monetary pipeline:
 * - donate-api wrangler name
 * - donate page: publishable key only, API URL, no Stripe secret material in public trees
 * @see 04_SOFTWARE/docs/CONTROLLED-WORK-PACKAGE-MONETARY-PIPELINE.md
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const errors = [];

function err(msg) {
  errors.push(msg);
}

function read(p) {
  return readFileSync(join(ROOT, p), "utf8");
}

// --- 1) donate-api worker name ---
const wToml = "04_SOFTWARE/donate-api/wrangler.toml";
if (!existsSync(join(ROOT, wToml))) {
  err(`missing ${wToml}`);
} else {
  const t = read(wToml);
  if (!/^name\s*=\s*"donate-api"/m.test(t)) {
    err(`${wToml}: must declare name = "donate-api"`);
  }
  if (!/main\s*=\s*"src\/worker\.ts"/.test(t)) {
    err(`${wToml}: must point main to src/worker.ts`);
  }
}

// --- 2) Phosphorus donate page contract ---
const donateAstro = "phosphorus31.org/planetary-planet/src/pages/donate.astro";
if (existsSync(join(ROOT, donateAstro))) {
  const a = read(donateAstro);
  if (!a.includes("donate-api.phosphorus31.org")) {
    err(`${donateAstro}: must use API URL https://donate-api.phosphorus31.org (create-checkout)`);
  }
  if (/\b(sk_live_|sk_test_)[A-Za-z0-9]+/.test(a)) {
    err(`${donateAstro}: must not contain Stripe secret keys (sk_*) in source`);
  }
  if (!/pk_live_|pk_test_/.test(a)) {
    err(`${donateAstro}: expected publishable Stripe key (pk_*) for Checkout`);
  }
}

// --- 3) No Stripe secret keys in public marketing / static trees (best-effort) ---
const scanDirs = [
  "phosphorus31.org/planetary-planet/src",
  "phosphorus31.org/planetary-planet/public",
  "04_SOFTWARE/p31ca/public",
  "04_SOFTWARE/p31ca/src",
];

const secretRe = /\b(sk_live_|sk_test_|rk_live_|rk_test_)[A-Za-z0-9_]+/g;

function walkScan(dir, relBase) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".turbo") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walkScan(p, relBase);
    } else if (/\.(astro|html|js|ts|jsx|tsx|mjs|css|md|json)$/i.test(name)) {
      const text = readFileSync(p, "utf8");
      if (secretRe.test(text)) {
        const rel = relative(ROOT, p);
        err(`${rel}: possible Stripe/secret key material (sk_*/rk_*) — use publishable keys or env only`);
        secretRe.lastIndex = 0;
      }
    }
  }
}

for (const d of scanDirs) {
  walkScan(join(ROOT, d), d);
}

// --- 4) Optional: P31 home p31-constants.json (nested clone: .../p31/andromeda + .../p31/p31-constants.json) ---
const homeConstantsPath = join(ROOT, "..", "p31-constants.json");
if (existsSync(homeConstantsPath)) {
  try {
    const raw = readFileSync(homeConstantsPath, "utf8");
    const c = JSON.parse(raw);
    const pay = c.payment;
    if (pay && typeof pay === "object") {
      const wantDonate = "https://donate-api.phosphorus31.org/health";
      if (pay.donateApiHealthUrl && String(pay.donateApiHealthUrl) !== wantDonate) {
        err(
          `parent p31-constants.json: payment.donateApiHealthUrl must be ${wantDonate} for MAP (got ${String(pay.donateApiHealthUrl)})`
        );
      }
      const host = pay.stripeWorkerHost;
      const stripeH = pay.stripeApiHealthUrl;
      if (host && stripeH) {
        const expect = "https://" + String(host).replace(/\/$/, "") + "/health";
        const got = String(stripeH).replace(/\/$/, "");
        if (expect !== got) {
          err(
            `parent p31-constants.json: payment.stripeApiHealthUrl must be ${expect} (got ${got}) — align with payment.stripeWorkerHost`
          );
        }
      }
    }
  } catch (e) {
    err("parent p31-constants.json: " + (e && e.message ? e.message : e));
  }
}

if (errors.length) {
  console.error("verify-monetary-surface: FAILED\n");
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}

console.log("verify-monetary-surface: OK (MAP pipeline static checks)");
