# Engineering standards — P31 Andromeda

This repository is a **monorepo**. Treat it like one: one lockfile discipline, one workspace definition, predictable scripts.

## Toolchain

| Tool | Version / policy |
|------|------------------|
| **Node.js** | **20.x** LTS (see root `.nvmrc`). Minimum 18 if a package requires it — upgrade the package or document exception. |
| **Package manager** | **pnpm** only (`packageManager` in `04_SOFTWARE/package.json` pins pnpm 10.x). Do not add second lockfiles (`package-lock.json`, `yarn.lock`) at root. |
| **Formatting** | Root `.editorconfig` — use EditorConfig in your IDE. Prettier is optional per package; do not introduce conflicting formatters without a config. |

## Where to work

| Area | Path |
|------|------|
| Primary JS/TS apps, Workers (npm packages), extensions | `04_SOFTWARE/` |
| Workspace members | Defined in root `pnpm-workspace.yaml` |
| Docs index | `docs/REPOSITORY_LAYOUT.md` |
| Software inventory | `04_SOFTWARE/README.md` |
| Contributing / CI | `CONTRIBUTING.md` |

Install all workspace packages from **repository root**:

```bash
pnpm install
```

Turbo tasks (build/test) are defined under `04_SOFTWARE/turbo.json` — run via:

```bash
pnpm --dir 04_SOFTWARE exec turbo run build
pnpm --dir 04_SOFTWARE exec turbo run test
```

Or `cd 04_SOFTWARE` then `pnpm run build` / `pnpm run test` (uses local `package.json` scripts).

## Quality bar

1. **No secrets** — `.env.master`, API keys, Wrangler tokens: never commit. Use `wrangler secret` and CI secrets.
2. **Tests** — New features in shared packages should ship with tests or a documented reason in the PR.
3. **OQE** — Product claims in user-facing copy should match verified metrics in `CLAUDE.md` (e.g. BONDING test counts).
4. **Legal** — `Discovery_Production_*` is ignored by git by policy; do not move sealed filings into tracked paths without redaction review.

## Anti-patterns

- Duplicate scaffold folders at repo root for apps that already live under `04_SOFTWARE/` (removed stubs: former `BONDING/`, `SPACESHIP-EARTH/`).
- Empty `apps/` / `packages/` at root — not used; workspace is `pnpm-workspace.yaml` + `04_SOFTWARE`.
- **Wrong Cloudflare Pages target:** deploying app A with `--project-name` belonging to app B overwrites B’s production site on **every** domain attached to that project. Map is in `docs/REPOSITORY_LAYOUT.md` (hub `p31ca` vs Hearing Ops `p31-hearing-ops`).

## Cloudflare Pages routing

Use **one Pages project per distinct product**. See the table in [`REPOSITORY_LAYOUT.md`](REPOSITORY_LAYOUT.md) under “Cloudflare Pages: one project per app”.

## Enterprise baseline

Merge criteria, CI workflow map, and known technical debt: [`ENTERPRISE_QUALITY.md`](ENTERPRISE_QUALITY.md).
