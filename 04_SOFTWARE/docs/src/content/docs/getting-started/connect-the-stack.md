---
title: Connect the stack
description: Every public surface and repo path in one map — institutional, technical hub, docs, edge, source.
---

This page is the **integration index** for the monorepo: the same links appear across [phosphorus31.org](https://phosphorus31.org), [p31ca.org](https://p31ca.org) (Quantum Weave), and this library.

## Public surfaces

| Role | URL | Repo path (when applicable) |
|------|-----|------------------------------|
| Institutional nonprofit | [phosphorus31.org](https://phosphorus31.org) | `phosphorus31.org/planetary-planet/` |
| Technical MVP hub + lattice | [p31ca.org](https://p31ca.org) | `04_SOFTWARE/p31ca/public/` |
| **This document library** | [docs.phosphorus31.org](https://docs.phosphorus31.org) | `04_SOFTWARE/docs/` |
| Source of truth | [github.com/p31labs/andromeda](https://github.com/p31labs/andromeda) | repo root |

## Operator / fleet

| Surface | URL |
|---------|-----|
| Command Center (status, KV-backed) | [command-center…](https://command-center.trimtab-signal.workers.dev) — same host **[Cloud Hub](https://command-center.trimtab-signal.workers.dev/cloud)** (Workers / Pages / KV via API) |
| K₄ Cage (mesh / viz / **Phase 4 nested scopes**) | [k4-cage…](https://k4-cage.trimtab-signal.workers.dev) — `GET /api/v4/mesh?scope=personal` · [nested scopes doc](/products/k4-sierpinski/) |
| **K₄ Personal** (dedicated Worker + KV, pillars a–d) | [k4-personal…](https://k4-personal.trimtab-signal.workers.dev) — `GET /api/mesh` (same JSON shape as personal scope on cage) · `04_SOFTWARE/k4-personal/` |
| **K₄ Hubs** (life-context tetrahedra; docks bind personal meshes) | [k4-hubs…](https://k4-hubs.trimtab-signal.workers.dev) — [`/viz`](https://k4-hubs.trimtab-signal.workers.dev/viz) · `GET /api/hubs` · `GET /api/dockback?ref=` · [architecture](/architecture/k4-hubs/) · `04_SOFTWARE/k4-hubs/` |
| Carrie (internal / family) | [carrie-agent…](https://carrie-agent.trimtab-signal.workers.dev) |
| Carrie (public, universal) | [carrie-wellness…](https://carrie-wellness.trimtab-signal.workers.dev) — `wrangler deploy --env public` from `cloudflare-worker/carrie-agent` |
| API gateway | Entry **`api-phosphorus31-org`** on **[Cloud Hub](https://command-center.trimtab-signal.workers.dev/cloud)** (JSON fleet list + ping). The bare `workers.dev` root may return 404 — use Cloud Hub or repo `docs/WORKER_INVENTORY.md` for the live route map. |
| **P31 Bouncer** (secrets index + gate check) | [p31-bouncer…](https://p31-bouncer.trimtab-signal.workers.dev) — `GET /v1/secrets-index` · [Security manifest](/operations/security-manifest/) · `04_SOFTWARE/cloudflare-worker/bouncer/` |
| **P31 Agent Hub** (Workers AI + service bindings → K₄ trio) | Deploy `p31-agent-hub` from `04_SOFTWARE/p31-agent-hub/` — `GET /api/health` · `POST /api/chat` (optional `AGENT_HUB_SECRET`; session store uses a **SQLite-backed** Durable Object). Carrie calls **`POST /api/agent-chat`** on `carrie-agent` / `carrie-wellness`, which proxies to the hub and can attach `AGENT_HUB_SECRET` server-side — set `AGENT_HUB_URL` (+ optional secret) in `carrie-agent/wrangler.toml`. |

Worker sources: `04_SOFTWARE/cloudflare-worker/` — **generated Wrangler map:** `docs/WORKER_PAGES_MANIFEST.md` (all `wrangler.toml` under `04_SOFTWARE/` + `phosphorus31.org/`, plus repo-root `wrangler-kofi.toml` and `k4-worker/wrangler.toml`; regenerate: `pnpm run manifest:workers` from `04_SOFTWARE/`). Older narrative inventory: `docs/WORKER_INVENTORY.md` when present.

### K₄ layout in this repo (canonical)

- **`04_SOFTWARE/k4-cage/`** — production **family** cage (Wrangler name `k4-cage`, KV `K4_MESH`). Imports **root** `verticesForScope('')` / `edgesForScope('')` from **`packages/k4-mesh-core/scopes.js`** so topology matches personal/hubs; deploy source of truth for `k4-cage.trimtab-signal.workers.dev`.
- **`04_SOFTWARE/k4-personal/`** and **`04_SOFTWARE/k4-hubs/`** — additional Workers built on **`04_SOFTWARE/packages/k4-mesh-core/`** (handlers + viz).
- **Repo root `k4-worker/`** — legacy minimal prototype; Wrangler name **`k4-legacy-prototype`** (sandbox). See `k4-worker/README.md`.

In-repo 3D tetrahedron mesh UI (BONDING / Spaceship stack): `04_SOFTWARE/spaceship-earth/src/components/mesh/DeltaMesh.tsx`.

## Pages (static edge)

| Site | URL | Typical path in repo |
|------|-----|----------------------|
| Phenix Weave | [p31-phenix.pages.dev](https://p31-phenix.pages.dev) | `04_SOFTWARE/cloudflare-pages/` (project-specific) |
| Mesh | [p31-mesh.pages.dev](https://p31-mesh.pages.dev) | `04_SOFTWARE/cloudflare-pages/` |
| Vault (component gallery) | Deploy target **`p31-vault.pages.dev`** from repo path `04_SOFTWARE/cloudflare-pages/p31-vault/` (`wrangler pages deploy`). Live gallery overlap until then: [Phenix Weave](https://p31-phenix.pages.dev). |
| Technical library (this site) | [docs.phosphorus31.org](https://docs.phosphorus31.org) | `04_SOFTWARE/docs/` → `dist/` (Pages project `p31-technical-library`) |

Custom domain **docs.phosphorus31.org** maps to the same Starlight build as the Pages project above.

## Flagship products (entry points)

| Product | URL | Notes |
|---------|-----|--------|
| BONDING | [bonding.p31ca.org](https://bonding.p31ca.org) | `04_SOFTWARE/bonding/` — 413 tests / 30 suites (verified) |
| Spaceship Earth | [spaceship-earth](https://spaceship-earth.pages.dev) (see fleet) | `04_SOFTWARE/spaceship-earth/` |
| Lattice (Fibonacci sphere) | [p31ca.org/lattice.html](https://p31ca.org/lattice.html) | 39 MVP nodes in `04_SOFTWARE/p31ca/public/lattice.html` |
| Observatory / dome lattice | [p31ca.org/observatory.html](https://p31ca.org/observatory.html) → [dome (Astro)](https://p31ca.org/dome/) | Geodesic dome viz: search, axis/state filters, node detail (`src/pages/dome.astro`; legacy `/dome.html` redirects to `/dome/`; bare `/dome` redirects to `/dome/`) |

## Long-form repo docs

Narrative ops, grants, and audits live under the repo **`docs/`** folder (not this Starlight app). Engineering **runbooks and verified facts** stay **here** ([OQE](/reference/oqe/), [verified facts](/reference/verified-facts/)).

---

*Same stack, one weave.*
