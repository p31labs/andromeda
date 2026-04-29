#!/usr/bin/env node
/**
 * Build src/data/hub-landing.json from hub/registry.mjs (single source of truth).
 * Run: node scripts/hub/build-landing-data.mjs
 * P31 home alignment: p31-alignment.json (registry derivation + verifyPipeline); docs/P31-ALIGNMENT-SYSTEM.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from './registry.mjs';
import { HUB_COCKPIT_ORDER, HUB_PROTOTYPE_ORDER } from './hub-app-ids.mjs';
import { resolvePrsPath, loadHubCardTierMap, prsGridStatus } from './prs-production-posture.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const P31CA = path.join(__dirname, '../..');
const OUT = path.join(P31CA, 'src', 'data', 'hub-landing.json');

const CONSTANTS_JSON = path.join(P31CA, '../../..', 'p31-constants.json');

/** Zenodo rows from P31 home `p31-constants.json` → `research.papers` (single source). */
function researchFromConstants() {
  try {
    const raw = fs.readFileSync(CONSTANTS_JSON, 'utf8');
    const c = JSON.parse(raw);
    const papers = c?.research?.papers;
    if (!Array.isArray(papers) || papers.length === 0) return null;
    return papers.map((p) => {
      const doi = typeof p.doi === 'string' ? p.doi.trim() : '';
      const title = typeof p.title === 'string' ? p.title.trim() : '';
      if (!doi || !title) return null;
      return { title, doi };
    }).filter(Boolean);
  } catch {
    return null;
  }
}

const RESEARCH = researchFromConstants() ?? [
  { title: 'The Tetrahedron Protocol: A Grand Unified Theory of Structural Resilience', doi: '10.5281/zenodo.19004485' },
  { title: 'Strategic Convergence of Geometric Security and Cognitive Resilience: P31 Labs Genesis Whitepaper', doi: '10.5281/zenodo.19411363' },
  {
    title:
      'Consciousness, Memory, and the Architecture of Self-Preservation: Neuroscientific Foundations for Cognitive Prosthetic Design',
    doi: '10.5281/zenodo.19416491',
  },
  {
    title:
      'The Universal Bridge at the Phase Transition: Kuramoto Criticality, Maxwell Rigidity, and the Topology of Neurodivergent Cognition',
    doi: '10.5281/zenodo.19503542',
  },
];

const byId = new Map(registry.map((r) => [r.id, r]));

const prsPath = resolvePrsPath(P31CA);
const prsTierMap = prsPath ? loadHubCardTierMap(prsPath) : null;
if (prsPath) {
  console.log('hub-landing: PRS posture from', path.relative(P31CA, prsPath));
} else {
  console.log('hub-landing: PRS file not found — registry statusLabel only');
}

function cardStatus(r) {
  const sl = (r.statusLabel || 'LIVE').toUpperCase();
  if (r.status === 'research' || sl === 'RESEARCH') return 'RESEARCH';
  if (sl === 'BUILDING' || r.status === 'building') return 'BUILDING';
  if (sl === 'TOOL' || r.status === 'tool') return 'TOOL';
  if (sl === 'HARDWARE') return 'HARDWARE';
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
  const prs = prsGridStatus(r, prsTierMap);
  const status = prs ? prs.landingStatus : cardStatus(r);
  return {
    id,
    title: r.title,
    status,
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

const coreProducts = HUB_COCKPIT_ORDER.map(productRow);
const prototypes = HUB_PROTOTYPE_ORDER.map(protoRow);

const payload = {
  generated: new Date().toISOString(),
    meta: {
    schema: "p31.hub-landing/1.0.0",
    registry: "scripts/hub/registry.mjs",
    hubCardIds: "scripts/hub/hub-app-ids.mjs",
    alignment:
      "P31 home: p31-alignment.json (p31.alignment/1.0.0); human: docs/P31-ALIGNMENT-SYSTEM.md; verify: npm run verify:alignment (root)",
    prsPosture: prsPath ? path.relative(P31CA, prsPath).replace(/\\/g, '/') : null,
  },
  coreProducts,
  prototypes,
  research: RESEARCH,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(
  'hub-landing →',
  path.relative(P31CA, OUT),
  `(${coreProducts.length} products, ${prototypes.length} prototypes, ${RESEARCH.length} Zenodo rows)`
);
