# Worker & Pages manifest (generated)

> **Generated:** 2026-04-15T08:32:19.967Z (UTC) · **Source:** `04_SOFTWARE/scripts/generate-worker-manifest.mjs`
> **Generated:** 2026-04-16T00:58:08.494Z (UTC) · **Source:** `04_SOFTWARE/scripts/generate-worker-manifest.mjs`

This file lists every `wrangler.toml` found under `04_SOFTWARE/` and `phosphorus31.org/`.
It is the in-repo complement to the older snapshot `docs/WORKER_INVENTORY.md` (manual narrative + dashboard cross-check).

| Kind | Wrangler `name` | Path | `main` / output |
|------|-----------------|------|-----------------|
| Worker | `bonding-relay` | `04_SOFTWARE/bonding/wrangler.toml` | `worker/telemetry.ts` |
| Worker | `p31-bouncer` | `04_SOFTWARE/cloudflare-worker/bouncer/wrangler.toml` | `src/index.js` |
| Worker | `command-center` | `04_SOFTWARE/cloudflare-worker/command-center/wrangler.toml` | `src/index.js` |
| Worker | `p31-social-worker` | `04_SOFTWARE/cloudflare-worker/social-drop-automation/wrangler.toml` | `worker.js` |
| Worker | `p31-social-broadcast` | `04_SOFTWARE/cloudflare-worker/wrangler.toml` | `p31_social_broadcast_worker.js` |
| Worker | `donate-api` | `04_SOFTWARE/donate-api/wrangler.toml` | `src/worker.ts` |
| Worker | `genesis-gate` | `04_SOFTWARE/genesis-gate/wrangler.toml` | `src/index.ts` |
| Worker | `k4-cage` | `04_SOFTWARE/k4-cage/wrangler.toml` | `src/index.js` |
| Worker | `kenosis-mesh` | `04_SOFTWARE/kenosis-mesh/wrangler.toml` | `src/index.js` |
| Worker | `p31-cortex` | `04_SOFTWARE/p31-cortex/wrangler.toml` | `src/index.ts` |
| Worker | `p31-forge` | `04_SOFTWARE/p31-forge/wrangler.toml` | `worker/index.js` |
| Pages | `p31ca` | `04_SOFTWARE/p31-hearing-ops/wrangler.toml` | `dist` (Pages build dir) |
| Pages | `p31-hearing-ops` | `04_SOFTWARE/p31-hearing-ops/wrangler.toml` | `dist` (Pages build dir) |
| Worker | `p31-state` | `04_SOFTWARE/p31-state/wrangler.toml` | `src/index.ts` |
| Pages | `p31ca` | `04_SOFTWARE/p31ca/wrangler.toml` | `dist` (Pages build dir) |
| Pages | `p31-pwa` | `04_SOFTWARE/packages/node-zero/pwa/wrangler.toml` | `dist` (Pages build dir) |
| Worker | `p31-quantum-edge` | `04_SOFTWARE/packages/quantum-edge/wrangler.toml` | `worker.ts` |
| Pages | `p31-command-center` | `04_SOFTWARE/sovereign-command-center/wrangler.toml` | `.next` (Pages build dir) |
| Worker | `spaceship-relay` | `04_SOFTWARE/spaceship-earth/wrangler.toml` | `worker/index.ts` |
| Worker | `p31-telemetry` | `04_SOFTWARE/telemetry-worker/wrangler.toml` | `src/worker.ts` |
| Worker | `p31-workers` | `04_SOFTWARE/workers/wrangler.toml` | `love-ledger.ts` |

## Counts

- **Worker-style** configs (no `pages_build_output_dir`): **16**
- **Pages-style** configs: **3**
- **Total `wrangler.toml` files:** **19**
- **Worker-style** configs (no `pages_build_output_dir`): **18**
- **Pages-style** configs: **4**
- **Total `wrangler.toml` files:** **22**

## Pages deploy note (p31ca.org vs ops.p31ca.org)

**Use separate Pages project names:** hub `04_SOFTWARE/p31ca/` → project **`p31ca`** (domains: `p31ca.org`). Hearing Ops `04_SOFTWARE/p31-hearing-ops/` → project **`p31-hearing-ops`** (domain: `ops.p31ca.org`). Deploying two different apps to the **same** `--project-name` overwrites the single production bundle for **all** domains on that project.
