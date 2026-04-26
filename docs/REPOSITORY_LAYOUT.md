# P31 Andromeda — Repository layout

This document is the **map of record** for how the monorepo is organized. Update it when you add a new top-level product or move a major tree.

**Standards:** [`ENGINEERING.md`](ENGINEERING.md) — Node/pnpm, EditorConfig, quality bar.

## Top-level directories

| Path | Role |
|------|------|
| `01_ADMIN/` | Operations, strategy manifests, corporate notes (non-runtime). |
| `02_RESEARCH/` | Paper shells, conversion scripts, Zenodo pipeline inputs. |
| `03_OPERATIONS/` | CWPs, WCDs, runbooks. |
| `04_SOFTWARE/` | **Primary software monorepo**: apps, Workers, shared packages, extensions. See `04_SOFTWARE/README.md`. |
| `05_FIRMWARE/` | GOD doc, ESP32 prompts, MCD. |
| `docs/` | Cross-cutting documentation (this file, deployment notes). **Corporate + open print suite:** `docs/corporate/README.md` (P31 open doc suite, letterhead, tokens). **P31 Workspaces (planned productivity surface):** [`P31-WORKSPACES-SITE-PLAN.md`](P31-WORKSPACES-SITE-PLAN.md) + imaginative layer [`P31-WORKSPACES-DEEP-DIVE.md`](P31-WORKSPACES-DEEP-DIVE.md). **Integrations:** [`integrations/GOOGLE-WORKSPACE.md`](integrations/GOOGLE-WORKSPACE.md) (Workspace OAuth, APIs, delegation). |
| `WCDs/` | Court templates and WCD sources. |
| `Legal_Instruments/` | POA and standalone legal drafts (review before filing). |
| `zenodo_batch/` | Zenodo metadata and batch uploader. |
| `phosphorus31.org/` | Institutional Astro site (separate from `04_SOFTWARE/p31ca`). |
| `p31labs/` | Workspace package(s) per root `pnpm-workspace.yaml`. |
| `ecosystem/` | Discord/IPFS/analytics helpers (not all wired into root workspaces). |
| `Discovery_Production_2025CV936/` | **Local** discovery production tree (see folder README). Entire `Discovery_Production_*/` is **gitignored** — do not expect these paths in remote clones. |
| `CWP-2026-002_*` / `cli/` / `plans/` / `prompts/` | Historical or auxiliary; not all are build dependencies. |

## JavaScript / package workspaces

- **Root** `package.json` + `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `extensions/*`, `04_SOFTWARE/packages/*`, `p31labs/*`.
- **`04_SOFTWARE/package.json`**: Nested tooling (Turbo, bonding, spaceship-earth, etc.). Prefer **installing and building from `04_SOFTWARE`** for app work unless you know a project is root-linked.

## Deployed surfaces (representative)

| Surface | Typical path in repo |
|---------|----------------------|
| BONDING game | `04_SOFTWARE/bonding/` |
| p31ca.org | `04_SOFTWARE/p31ca/` |
| Hearing Ops PWA | `04_SOFTWARE/p31-hearing-ops/` |
| Cloudflare Workers | `04_SOFTWARE/cloudflare-worker/*`, `04_SOFTWARE/p31-forge/`, `04_SOFTWARE/k4-cage/`, etc. |
| phosphorus31.org | `phosphorus31.org/planetary-planet/` |

### Cloudflare Pages: one project per app

Each Cloudflare Pages **project** has one production deployment per branch; **every custom domain** on that project serves that same build. Do not point two different apps at the same `--project-name`.

| Domain | CF Pages project | Repo | Deploy |
|--------|------------------|------|--------|
| `p31ca.org` | `p31ca` | `04_SOFTWARE/p31ca/` | `npm run deploy` in that folder |
| `ops.p31ca.org` | `p31-hearing-ops` | `04_SOFTWARE/p31-hearing-ops/` | `npm run deploy` in that folder |

Hub cards link to static `*-about.html` pages (onboarding), not `/app/*`. Legacy `/app/*` paths redirect via `public/_redirects` (do not point another SPA at `p31ca`).

## Canonical vs duplicate trees

- **K₄ Worker:** `04_SOFTWARE/k4-cage/` is canonical. Older or misplaced copies may appear under ad-hoc folders; treat them as snapshots, not source of truth.
- **BONDING / spaceship-earth:** If both root-level namesakes and `04_SOFTWARE/*` exist, prefer **`04_SOFTWARE`** for active development.

## Maintenance

- After adding a new **routable** app or Worker, add one line to `04_SOFTWARE/README.md` and (if public-facing) this file.
- Legal production folders: keep **PII and sealed filings** out of git; use the Discovery README for local structure only.
- **Re-run Discovery folder layout** (if files land at the root again): `powershell -ExecutionPolicy Bypass -File scripts/organize-discovery-production.ps1`
