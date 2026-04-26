#!/usr/bin/env node
/**
 * Contract check for the Lattice Oracle (magic-crystal / /oracle).
 * Fails on drift: missing file, CSPRNG path, redirect, lattice node, ground-truth route.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p31ca = path.join(__dirname, "..");
const htmlPath = path.join(p31ca, "public", "magic-crystal.html");
const redirectsPath = path.join(p31ca, "public", "_redirects");
const latticePath = path.join(p31ca, "public", "lattice.html");
const gtPath = path.join(p31ca, "ground-truth", "p31.ground-truth.json");

const MUST = [
  "crypto.getRandomValues",
  "Lattice Oracle",
  "Toy / art surface",
  "Not medical, legal, financial",
  "pickIndex",
  "SHA-256"
];

function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error("verify-lattice-oracle: missing", path.relative(p31ca, htmlPath));
    process.exit(1);
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const s of MUST) {
    if (!html.includes(s)) {
      console.error("verify-lattice-oracle: magic-crystal.html missing:", JSON.stringify(s));
      process.exit(1);
    }
  }

  const red = fs.readFileSync(redirectsPath, "utf8");
  if (!/\/oracle\s+\/magic-crystal\.html/i.test(red)) {
    console.error("verify-lattice-oracle: public/_redirects must map /oracle -> /magic-crystal.html");
    process.exit(1);
  }

  const lat = fs.readFileSync(latticePath, "utf8");
  if (!lat.includes("magic-crystal.html") || !lat.includes("lattice-oracle") || !lat.includes("ORACLE")) {
    console.error("verify-lattice-oracle: public/lattice.html must link the ORACLE node to magic-crystal.html");
    process.exit(1);
  }

  const gt = JSON.parse(fs.readFileSync(gtPath, "utf8"));
  const r = gt.routes && gt.routes.latticeOracle;
  if (!r || r.path !== "/magic-crystal.html" || r.implementation !== "public/magic-crystal.html") {
    console.error("verify-lattice-oracle: ground-truth routes.latticeOracle path drift");
    process.exit(1);
  }
  const er = (gt.edgeRedirects || []).some(
    (e) => e.from === "/oracle" && e.to === "/magic-crystal.html" && e.status === 301
  );
  if (!er) {
    console.error("verify-lattice-oracle: ground-truth edgeRedirects missing /oracle -> /magic-crystal.html 301");
    process.exit(1);
  }

  console.log("verify-lattice-oracle: OK");
}

main();
