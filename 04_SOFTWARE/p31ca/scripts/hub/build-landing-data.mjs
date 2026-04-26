#!/usr/bin/env node
/**
 * Build src/data/hub-landing.json from hub/registry.mjs (single source of truth).
 * Run: node scripts/hub/build-landing-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from './registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const P31CA = path.join(__dirname, '../..');
const OUT = path.join(P31CA, 'src', 'data', 'hub-landing.json');

/** Cards on / — order preserved; only entries with a generated *-about.html. */
const COCKPIT_PRODUCT_IDS = [
  'bonding',
  'spaceship-earth',
  'ede',
  'buffer',
  'alchemy',
  'attractor',
  'axiom',
  'collider',
  'content-forge',
  'geodesic',
  'genesis-gate',
  'k4market',
  'kenosis',
  'liminal',
  'vault',
  'phenix-os',
  'quantum-core',
  'resonance',
  'signal',
  'donate',
  'tactile',
  'discord-bot',
  'cortex',
  'quantum-family',
  'observatory',
];

const PROTOTYPE_IDS = ['node-zero', 'node-one', 'mission-control'];

const RESEARCH = [
  { title: 'Tetrahedral Mesh as Cybernetic Trauma Response', doi: '10.5281/zenodo.18627420' },
  { title: 'Algorithmic Authenticity and the Fawn Guard', doi: '10.5281/zenodo.18627421' },
  { title: 'Fisher-Escolà Coherence in Distributed Edge Systems', doi: '10.5281/zenodo.18627422' },
  { title: 'The Thermodynamics of the Spoon Economy', doi: '10.5281/zenodo.18627423' },
];

const byId = new Map(registry.map((r) => [r.id, r]));

function cardStatus(r) {
  const sl = (r.statusLabel || 'LIVE').toUpperCase();
  if (r.status === 'research' || sl === 'RESEARCH') return 'RESEARCH';
  if (sl === 'BUILDING' || r.status === 'building') return 'BUILDING';
  if (sl === 'TOOL' || r.status === 'tool') return 'TOOL';
  return 'LIVE';
}

function toTags(tech) {
  const t = (tech || []).slice(0, 4);
  if (t.length < 2) t.push('P31', 'Web');
  return t;
}

function productRow(id) {
  const r = byId.get(id);
  if (!r) {
    throw new Error(`[hub:build] unknown registry id: ${id}`);
  }
  return {
    id,
    title: r.title,
    status: cardStatus(r),
    desc: r.tagline,
    tags: toTags(r.tech),
    url: `/${id}-about.html`,
  };
}

function protoRow(id) {
  const r = byId.get(id);
  if (!r) throw new Error(`[hub:build] unknown prototype id: ${id}`);
  return {
    id,
    title: r.title,
    desc: r.tagline,
    url: `/${id}-about.html`,
  };
}

const coreProducts = COCKPIT_PRODUCT_IDS.map(productRow);
const prototypes = PROTOTYPE_IDS.map(protoRow);

const payload = {
  generated: new Date().toISOString(),
  coreProducts,
  prototypes,
  research: RESEARCH,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log('hub-landing →', path.relative(P31CA, OUT), `(${coreProducts.length} products, ${prototypes.length} prototypes)`);
