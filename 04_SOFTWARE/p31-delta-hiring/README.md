# p31-delta-hiring

Shippable **hiring + help surface** for P31: **role packets** (outcomes, constraints, evaluation weights), **WCDs** (bounded work samples, rubrics, good/anti patterns), a **help center** + **glossary** + **search** (Fuse.js), and a browser-side **portable proof** (`p31.proofRecord/1.0.0`) with import/export and optional **commit SHAs** on artifacts.

## Run

From `andromeda/04_SOFTWARE` (with pnpm installed):

```bash
pnpm install
pnpm --filter p31-delta-hiring dev
```

Default Vite port **3150** (see `vite.config.ts`).

## Features (UI)

| Area | Route |
|------|--------|
| Home, equity tiers | `#/` |
| Open roles (guild/priority filters) | `#/roles` |
| Role packet + print | `#/roles/:id` |
| WCD library & detail | `#/wcd`, `#/wcd/:id` |
| Help center & topics | `#/help`, `#/help/:id` |
| Glossary | `#/glossary` |
| Full-text search | `#/search?q=` |
| My proofs, JSON import/export | `#/portfolio` |
| Proof editor | `#/proof/new/:roleId`, `#/proof/:id` |
| Reviewers, changelog, governance | `#/reviewers`, `#/changelog`, `#/governance` |

## One-shot quality gate (local / CI)

```bash
pnpm --filter p31-delta-hiring run check
```

From `04_SOFTWARE` (uses **Turbo** for the same pipeline + cache when enabled):

```bash
pnpm run check:p31-delta-hiring
```

Runs: `verify` → `test` → `lint` → `build`. GitHub Actions: workflow **`p31-delta-hiring`** runs `check:p31-delta-hiring` on path-filtered push/PR.

## Individual commands

| Script | Purpose |
|--------|--------|
| `pnpm run verify` | Data integrity: roles → WCD map, rubric weights, good/anti lists |
| `pnpm run test` | Vitest (`tests/`) |
| `pnpm run lint` | ESLint on `src/` |
| `pnpm run build` | `tsc` + Vite → `dist/` |

## Build output

`dist/` is static files — any static host, or copy into a hub `public/delta-hiring/` (or similar) for same-origin deploy.

### Production (Cloudflare Pages)

On **push to `main`**, the workflow [`.github/workflows/p31-delta-hiring.yml`](../../.github/workflows/p31-delta-hiring.yml) runs `check` then **`wrangler pages deploy dist --project-name=p31-delta-hiring`**. You need a Cloudflare **Pages** project named `p31-delta-hiring` and repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (same pattern as the p31ca deploy).

## Data & schema

| File | Role |
|------|------|
| `src/data/role-packets.json` | `p31.rolePackets/1.0.0` |
| `src/data/work-samples.json` | `p31.workSamples/1.0.0` |
| `src/data/help-topics.json` | `p31.helpTopics/1.0.0` |
| `src/data/glossary.json` | `p31.glossary/1.0.0` |
| `src/data/changelog.json` | Release notes (hand-maintained) |
| `schemas/proof-record.schema.json` | Portable export |

## Related docs

- `andromeda/docs/social/DELTA_JOB_BOARD.md` — list-oriented board
- `andromeda/docs/social/DELTA_HIRING_SYSTEM_ARCHITECTURE.md` — narrative

This package is the **working UI + contracts** for Delta hiring.
