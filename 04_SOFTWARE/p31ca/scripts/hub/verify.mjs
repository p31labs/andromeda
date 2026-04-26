#!/usr/bin/env node
/**
 * Hub integrity: registry related[] ids, cockpit URLs, no duplicate ids.
 * Run: node scripts/hub/verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from './registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const P31CA = path.join(__dirname, '../..');
const PUBLIC = path.join(P31CA, 'public');
const LANDING = path.join(P31CA, 'src', 'data', 'hub-landing.json');

const byId = new Map(registry.map((r) => [r.id, r]));
let errors = 0;

function fail(msg) {
  console.error('hub:verify:', msg);
  errors++;
}

for (const item of registry) {
  for (const rid of item.related || []) {
    if (!byId.has(rid)) {
      fail(`registry[${item.id}].related: unknown id "${rid}"`);
    }
  }
}

for (const item of registry) {
  const about = path.join(PUBLIC, `${item.id}-about.html`);
  if (!fs.existsSync(about)) {
    fail(`missing about page for registry id "${item.id}" (${path.basename(about)})`);
  }
}

if (fs.existsSync(LANDING)) {
  const data = JSON.parse(fs.readFileSync(LANDING, 'utf8'));
  const seen = new Set();
  for (const p of data.coreProducts || []) {
    if (seen.has(p.id)) fail(`duplicate cockpit id: ${p.id}`);
    seen.add(p.id);
    const about = path.join(PUBLIC, `${p.id}-about.html`);
    if (!fs.existsSync(about)) {
      fail(`cockpit card "${p.id}" has no ${p.id}-about.html`);
    }
  }
  for (const p of data.prototypes || []) {
    const about = path.join(PUBLIC, `${p.id}-about.html`);
    if (!fs.existsSync(about)) {
      fail(`prototype "${p.id}" has no ${p.id}-about.html`);
    }
  }
} else {
  fail('missing src/data/hub-landing.json — run: npm run hub:build');
}

if (errors > 0) {
  console.error(`hub:verify: ${errors} error(s)`);
  process.exit(1);
}
console.log('hub:verify: OK');
