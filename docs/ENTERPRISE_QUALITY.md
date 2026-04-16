# Enterprise production quality — P31 Andromeda

This document defines the **baseline** for treating the monorepo as production-grade. It does not replace package-level READMEs or OQE claims in `CLAUDE.md`.

## Definition of done (merge to `main`)

1. **`pnpm install`** at the repository root succeeds (`pnpm-lock.yaml` committed and in sync).
2. **`pnpm run quality`** — Cloudflare Pages deploy targets are not crossed (hub vs Hearing Ops). See `scripts/enterprise-deploy-guard.mjs`.
3. **`pnpm run build`** — Turbo build for all workspace packages that define `build` completes without error.
4. **`pnpm run test`** — Turbo test completes without error.
5. **CI** — `Monorepo verify` workflow (`.github/workflows/monorepo-verify.yml`) is green on the PR.

## Workflows

| Workflow | Role |
|----------|------|
| **monorepo-verify.yml** | Canonical gate: install → deploy guard → build → test. |
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
