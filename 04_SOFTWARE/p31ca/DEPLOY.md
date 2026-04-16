# Deploy `p31ca.org` (Astro technical hub)

## Correct project

| Cloudflare Pages project | Repo path | Domains |
|--------------------------|-----------|---------|
| **`p31ca`** | `04_SOFTWARE/p31ca/` | `p31ca.org`, `www.p31ca.org` |
| **`p31-hearing-ops`** | `04_SOFTWARE/p31-hearing-ops/` | `ops.p31ca.org` only |

Deploying **any other app’s `dist/`** to project **`p31ca`** replaces the hub for **every** domain on that project.

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
