# GitHub Actions layout

- **Composite actions** (`.github/actions/`): shared setup — use these instead of copying pnpm/Node steps.
- **Pages / Astro deploys** are owned by path-scoped workflows (`p31ca-hub`, `p31-technical-library`, `phosphorus31-site`, `bonding`, etc.). **P31 Automation** only auto-deploys **bouncer** and **command-center** on push; other deploy toggles are **manual** (`workflow_dispatch`) to avoid double deploys.

| Workflow | Role |
|----------|------|
| `monorepo-verify.yml` | Canonical: full lockfile + deploy guard + MAP + turbo build/test |
| `ci.yml` | Focused turbo lint/typecheck/build/test + compliance spot checks |
| `p31ca-hub.yml` | p31ca hub:ci + Pages deploy |
| `p31-automation.yml` | K4 worker deploys on push; optional Pages via manual dispatch only |

**Wrangler:** workflows that deploy set `env.WRANGLER_VERSION: "4.85.0"` and pass `wranglerVersion: ${{ env.WRANGLER_VERSION }}` to `cloudflare/wrangler-action` (or `pages-action`). Bump in one place per workflow file when upgrading.

Run locally: `pnpm run verify:ci-local:static` (root); add `pnpm run verify:stack-links` for live URL probes after deploy.
