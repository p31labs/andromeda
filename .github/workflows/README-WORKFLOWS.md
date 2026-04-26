# GitHub Actions — reusable layers

## Scale model

1. **Toolchain (single bump point)** — `.github/actions/toolchain-constants` writes `NODE_VERSION`, `WRANGLER_VERSION`, and `PNPM_VERSION` to `GITHUB_ENV`. Run it first in any job that installs JS or calls Wrangler. Keep `package.json` `packageManager` in sync with `PNPM_VERSION`.

2. **Composites** (`.github/actions/`)

| Action | Use when |
|--------|-----------|
| `toolchain-constants` | Always first (unless job is shell-only). |
| `pnpm-andromeda-full` | Root + `04_SOFTWARE` frozen install (same as `pnpm run lockfile:check`). |
| `pnpm-04-software` | Only the nested Turbo workspace under `04_SOFTWARE`. |
| `npm-ci-project` | One package with `package-lock.json` + npm cache. |
| `wrangler-run` | `cloudflare/wrangler-action@v3` + shared Wrangler version. |
| `cloudflare-pages-v1` | `cloudflare/pages-action@v1` + shared Wrangler version. |

3. **Callable workflows** (`workflow_call`) — compose full jobs without copy-paste:

| Workflow | Called by |
|----------|-----------|
| `reusable-monorepo-verify.yml` | `monorepo-verify.yml` |
| `reusable-ci-focused.yml` | `ci.yml` (`secrets: inherit` for Turbo) |
| `reusable-coverage.yml` | `coverage.yml` |

Add new repo-wide gates by extending a reusable file, or add a new `reusable-*.yml` and a one-line caller workflow.

## Pages ownership (no double deploy)

- **Routine** deploys: path workflows (`p31ca-hub`, `p31-technical-library`, `phosphorus31-site`, `bonding`, …).
- **P31 Automation** Pages jobs: **manual** (`workflow_dispatch`) only; push auto-deploy is for **bouncer** + **command-center** only.

## Local parity

`pnpm run verify:ci-local:static` at repo root; optional `pnpm run verify:stack-links` after edge deploy.
