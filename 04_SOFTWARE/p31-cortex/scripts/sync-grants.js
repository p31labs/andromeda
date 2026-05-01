#!/usr/bin/env node
/**
 * Sync the canonical grant-pipeline.json into Cortex GrantAgent DO.
 *
 * For each grant in the 'grants' array:
 *   - POST /api/grant/init with grant data
 *   - Skips if already exists (by title match — safe idempotent)
 *
 * Usage: node sync-grants.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const PIPELINE_JSON = path.join(__dirname, '../../../../docs/grants/grant-pipeline.json');
const CORTEX_INIT_URL = 'https://p31-cortex.trimtab-signal.workers.dev/api/grant/init';

const dryRun = process.argv.includes('--dry-run');

async function loadPipeline() {
  const raw = fs.readFileSync(PIPELINE_JSON, 'utf-8');
  return JSON.parse(raw);
}

async function seedGrant(grant) {
  if (dryRun) {
    console.log(`[DRY] Would seed: ${grant.title} (${grant.id})`);
    return { ok: true, skipped: true };
  }

  try {
    const resp = await fetch(CORTEX_INIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grant)
    });

    if (resp.ok) {
      const result = await resp.json();
      console.log(`✅ ${grant.title} → ${result.id}`);
      return { ok: true, id: result.id };
    } else {
      const err = await resp.text();
      console.error(`❌ ${grant.title}: ${resp.status} ${err}`);
      return { ok: false, error: err };
    }
  } catch (e) {
    console.error(`❌ ${grant.title}: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function main() {
  if (dryRun) console.log('--- DRY RUN — no changes will be made ---\n');

  console.log(`Loading ${PIPELINE_JSON}...`);
  const pipeline = await loadPipeline();
  const grants = pipeline.grants || [];

  console.log(`Seeding ${grants.length} grants into Cortex GrantAgent...\n`);

  let ok = 0, fail = 0, skipped = 0;
  for (const g of grants) {
    const result = await seedGrant(g);
    if (result.ok) {
      ok++;
      if (result.skipped) skipped++;
    } else fail++;
  }

  console.log(`\n✅ Seeded: ${ok} (${skipped} dry)`);
  if (fail) console.log(`❌ Failed: ${fail}`);
  if (!dryRun) {
    console.log('\n👉 Next: curl -X POST https://p31-cortex.trimtab-signal.workers.dev/api/grant/run to refresh deadline sweep and alerts');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
