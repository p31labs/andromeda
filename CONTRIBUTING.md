# Contributing to P31 Andromeda

## Where the software lives

Most applications, Workers, Pages projects, and shared packages live under **`04_SOFTWARE/`**. That directory uses **pnpm** and **Turbo** (`04_SOFTWARE/package.json`). Install and run tests there unless a package README says otherwise.

```bash
cd 04_SOFTWARE
pnpm install
pnpm run build
pnpm run test
```

The repository root has its own `package.json` (additional workspaces); it is not the primary dev entry for BONDING or Spaceship Earth.

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
