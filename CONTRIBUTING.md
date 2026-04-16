# Contributing to P31 Andromeda

## Where the software lives

Most applications, Workers, Pages projects, and shared packages live under **`04_SOFTWARE/`**, registered in the **root** `pnpm-workspace.yaml`. Use **one** install at the repository root:

```bash
pnpm install
pnpm run quality   # deploy-target guard (Pages project names)
pnpm run build
pnpm run test
```

Turbo scripts are defined in `04_SOFTWARE/package.json` (`build`, `test`, `dev`, etc.); the root `package.json` delegates to `pnpm --dir 04_SOFTWARE` for convenience.

**Production quality bar:** [`docs/ENTERPRISE_QUALITY.md`](docs/ENTERPRISE_QUALITY.md). PRs should keep **Monorepo verify** (GitHub Actions) green.

## Fleet map and edge deployables

- **Integration index (Starlight):** `04_SOFTWARE/docs/src/content/docs/getting-started/connect-the-stack.md` (published on the docs site).
- **Machine-readable Wrangler inventory:** `docs/WORKER_PAGES_MANIFEST.md` — regenerate after adding or renaming Workers/Pages:

  ```bash
  cd 04_SOFTWARE
  pnpm run manifest:workers
  ```

- **Older manual worker narrative:** `docs/WORKER_INVENTORY.md` (snapshot; may lag the manifest).

## CI expectations

On **`main`**, **P31 Automation** (`.github/workflows/p31-automation.yml`) runs:

1. `04_SOFTWARE/packages/k4-mesh-core` unit tests  
2. Starlight docs build under `04_SOFTWARE/docs`  
3. `04_SOFTWARE/scripts/verify-stack-links.mjs` (URLs from connect-the-stack)

Other required checks may run from **P31 Labs CI/CD Pipeline** and related workflows. Open a PR to satisfy branch protection.

## Pages deploy safety

The Pages project name **`p31ca`** may attach **multiple custom domains** to one production artifact. Deploying a new `dist/` replaces that artifact for the chosen branch—confirm project, branch, and domain impact before `wrangler pages deploy`. See the footer of `docs/WORKER_PAGES_MANIFEST.md`.

## Secrets and environment

Never commit `.env.master`, `.dev.vars`, or API tokens. Use `wrangler secret put` and GitHub Actions secrets as documented in the bouncer secrets index and package READMEs.
