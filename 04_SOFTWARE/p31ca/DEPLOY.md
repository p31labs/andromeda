# Deploy `p31ca.org` (Astro technical hub)

## Correct project

| Cloudflare Pages project | Repo path | Domains |
|--------------------------|-----------|---------|
| **`p31ca`** | `04_SOFTWARE/p31ca/` | `p31ca.org`, `www.p31ca.org` |
| **`p31-hearing-ops`** | `04_SOFTWARE/p31-hearing-ops/` | `ops.p31ca.org` only |

Deploying **any other app’s `dist/`** to project **`p31ca`** replaces the hub for **every** domain on that project.

**Passport + CI** — `npm run deploy` runs `predeploy` → `passport:verify` (then build → Pages). Canonical transform: `scripts/passport-p31ca-transform.mjs` in this package. From full P31 home, sync first: `npm run sync:passport` at home root, or `npm run passport:sync` from here. **GitHub Actions** (`P31 Automation` → `deploy_p31ca`): `passport:verify` runs with `P31_WORKSPACE_ROOT` set; it **skips** if `cognitive-passport/` is missing (Andromeda-only clone). For a **strict** check, run workflow **manually** and enable **`p31ca_strict_passport`** (fails if no authoring file). **Wrangler** for Pages is pinned in `package.json` (dev dependency).

## Recover if the apex shows Hearing Ops (or any wrong app)

1. **Redeploy the hub** (from this directory):

   ```bash
   npm run deploy
   ```

2. **Cloudflare Dashboard** → Workers & Pages → **`p31ca`** → **Deployments** — confirm the top production build is from **`04_SOFTWARE/p31ca`** (Astro), not another pipeline.

3. **Custom domains** — on **`p31ca`**: `p31ca.org` / `www`. On **`p31-hearing-ops`**: only `ops.p31ca.org`. Remove `p31ca.org` from the Ops project if it was added by mistake.

4. **Service worker** — If you still see the old app after deploy, the browser may have cached a PWA from this origin. Hard refresh, or DevTools → Application → Service Workers → Unregister, or deploy includes a small unregister script in `BaseLayout.astro` to clear stale workers.

## Do not use project `p31ca` for

- `p31-hearing-ops` (use **`p31-hearing-ops`**)
- Spaceship Earth (use its own Pages project, e.g. **`spaceship-earth`**, not `p31ca`)
