#!/usr/bin/env node
/**
 * Verifies p31.creatorEconomy/1.0.0 contract invariants.
 * Fails (exit 1) if any version-1 constraint is violated or the file is missing.
 * Run: npm run verify:economy
 * Also called from prebuild via verify:ground-truth chain.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, "..");
const PATH  = resolve(ROOT, "ground-truth/creator-economy.json");

let failed = false;
function fail(msg) {
  console.error("[FAIL] verify-creator-economy:", msg);
  failed = true;
}
function ok(msg) {
  console.log("[ OK ] verify-creator-economy:", msg);
}

if (!existsSync(PATH)) {
  fail("ground-truth/creator-economy.json missing");
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(readFileSync(PATH, "utf8"));
} catch (e) {
  fail("JSON parse error: " + e.message);
  process.exit(1);
}

// Schema guard
if (doc.schema !== "p31.creatorEconomy/1.0.0") {
  fail(`unexpected schema "${doc.schema}" — expected "p31.creatorEconomy/1.0.0"`);
}

// Version 1.0.0 constraints
const checks = [
  ["platformFee.rate",          doc.platformFee?.rate,             0.0],
  ["revenueShare.creator",      doc.revenueShare?.creator,         1.0],
  ["revenueShare.platform",     doc.revenueShare?.platform,        0.0],
  ["geodesicRoom.accessFee",    doc.geodesicRoom?.accessFee,       0.0],
];

for (const [label, actual, expected] of checks) {
  if (typeof actual !== "number") {
    fail(`${label} is missing or not a number (got ${JSON.stringify(actual)})`);
  } else if (actual !== expected) {
    fail(`${label} must be ${expected} in schema v1.0.0 (got ${actual})`);
  } else {
    ok(`${label} = ${actual} ✓`);
  }
}

// Transparency fields
if (!doc.transparency?.ciVerified) {
  fail("transparency.ciVerified must be true");
} else {
  ok("transparency.ciVerified = true ✓");
}

if (!doc.transparency?.publicDisclosure) {
  fail("transparency.publicDisclosure must be true");
} else {
  ok("transparency.publicDisclosure = true ✓");
}

// Public endpoint claim matches published path
const claimed = doc.transparency?.publicEndpoint;
if (claimed !== "/creator-economy.json") {
  fail(`transparency.publicEndpoint should be "/creator-economy.json", got "${claimed}"`);
} else {
  ok(`transparency.publicEndpoint = "${claimed}" ✓`);
}

if (failed) {
  process.exit(1);
} else {
  console.log("[ OK ] verify-creator-economy: all v1.0.0 constraints satisfied");
}
