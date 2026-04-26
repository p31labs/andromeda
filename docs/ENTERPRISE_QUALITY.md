# Enterprise production quality — P31 Andromeda

This document defines the **baseline** for treating the monorepo as production-grade. It does not replace package-level READMEs or OQE claims in `CLAUDE.md`.

**Multi-root P31 home:** operators with the BONDING Soup + Andromeda layout should also read **`docs/P31-ENGINEERING-STANDARD.md`** in the **home** repository (normative cross-tree checklist: `verify`, `release:check`, constants, passport sync).

## Canonical assets (do not duplicate)

| Asset | Source of truth |
|-------|-----------------|
| UI canon (tokens) | `04_SOFTWARE/design-tokens/p31-universal-canon.json` — consumed by p31ca `apply-p31-style`; do not maintain a second canon file. |
| Hub machine contract | `04_SOFTWARE/p31ca/ground-truth/p31.ground-truth.json` |
| Research DOIs (operator lock) | Home `p31-constants.json` → `research.papers` (after edits: `apply:constants` in home clone). |

## `docs/files/` policy

Large operator drops (**`*.pdf`**, **`*.docx`**, **`p31_fleet_deploy.tar.gz`**, **`mnt/`** tree) are **gitignored** in this repo. Track **scripts, JSON results, and small source** (e.g. `zenodo_upload.py`, `zenodo_results.json`); store papers and legal scans outside git or use **Git LFS** if policy changes.

## Definition of done (merge to `main`)

1. **`pnpm install`** at the repository root succeeds (`pnpm-lock.yaml` committed and in sync).
2. **`pnpm run quality`** — Cloudflare Pages deploy targets are not crossed (hub vs Hearing Ops). See `scripts/enterprise-deploy-guard.mjs`.
3. **`pnpm run build`** — Turbo build for all workspace packages that define `build` completes without error.
4. **`pnpm run test`** — Turbo test completes without error.
5. **CI** — `Monorepo verify` workflow (`.github/workflows/monorepo-verify.yml`) is green on the PR.
6. **p31ca hub** — for changes under `04_SOFTWARE/p31ca/`, **`p31ca-hub.yml`** (or equivalent documented replacement) is green: `prebuild` (ground-truth, synergetic, style, super-centaur pack, hub data, creator economy, geodesic campaign, etc.) + **`astro build`**.

## Workflows

| Workflow | Role |
|----------|------|
| **monorepo-verify.yml** | Canonical gate: install → deploy guard → build → test. |
| **p31ca-hub.yml** | **p31ca.org** Astro hub: install, `hub:ci` / verify chain, build. |
| **p31-automation.yml** | k4-mesh-core tests, Starlight docs build, stack link check. |
| **ci.yml** | Legacy checks (lint sample, filtered build/test). **Auto-deploy jobs to production/staging are disabled** (`if: false`) until pipelines are revalidated. |

## Tooling contract

| Item | Policy |
|------|--------|
| Node.js | **20.x** LTS (`.nvmrc`). |
| Package manager | **pnpm** only at repo root; `packageManager` pins pnpm 10.x. |
| Turbo | `04_SOFTWARE/turbo.json`; test tasks use empty `outputs` to avoid spurious cache warnings. |
| Vitest | Use `vitest run` in CI (not bare `vitest`, which can enter watch mode). Use `--passWithNoTests` where a package legitimately has no tests yet. |
| Jest | Use `jest --passWithNoTests` when no test files exist. |

## Technical debt (tracked)

- **`@p31/agent-engine`**: `tests/agent-engine.test.ts` is excluded in `vitest.config.ts` until rewritten against the current `AgentEngine` API.
- **Nested lockfile**: `04_SOFTWARE/pnpm-lock.yaml` may exist for historical layouts; **root** `pnpm-lock.yaml` is authoritative for `pnpm install` at repo root.
- **Turbo “no output files” for some `build` tasks**: Packages that only run `tsc --noEmit` may still log warnings; acceptable until those packages emit declarations to `dist/` or declare empty outputs per package.

## Security and secrets

- Never commit `.env.master`, `.dev.vars`, or tokens.
- `pnpm audit` — run periodically; not all advisories block merge (evaluate per package).

## Cloudflare / edge

- One Pages **project name** per product. See `docs/REPOSITORY_LAYOUT.md` (hub `p31ca` vs `p31-hearing-ops`).
- Regenerate `docs/WORKER_PAGES_MANIFEST.md` after adding Workers: `pnpm --dir 04_SOFTWARE run manifest:workers`.
