# P31 Hearing Ops

Vite + React PWA for contempt hearing prep (offline-first, local fonts, no Google CDN).

## Develop

```powershell
npm install
npm run dev
```

## Production deploy (`ops.p31ca.org`)

Git-connected Pages projects serve **custom domains from the production branch only**. If you deploy from a feature branch without `--branch`, Wrangler creates a **preview** (your app works on `*.pages.dev` URLs but **not** on `ops.p31ca.org`).

```powershell
npm run deploy
```

Same as `npm run build` followed by:

`npx wrangler pages deploy dist --project-name p31ca --branch=main --commit-dirty=true`

If your default branch is not `main`, replace `--branch=main` with that branch name (must match **Settings → Builds & deployments → Production branch** in the Cloudflare dashboard).

## Verify

- `https://ops.p31ca.org` — title **P31 Hearing Ops**, seven tabs.
- iPhone: Add to Home Screen → airplane mode → content still loads.
