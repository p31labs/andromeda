# smallball.p31ca.org — Deployment Instructions

## Custom Domain Setup

| Item | Value |
|------|-------|
| Cloudflare Pages project | **p31-smallball** |
| Current URL | `https://p31-smallball.pages.dev` |
| Target domain | `smallball.p31ca.org` |

**DNS step:** Cloudflare Dashboard → p31ca.org → DNS → Add CNAME record:
- Name: `smallball`
- Target: `p31-smallball.pages.dev`
- Proxy: Proxied (orange cloud)

**Pages step:** Cloudflare Dashboard → Workers & Pages → p31-smallball → Custom domains → Add custom domain → `smallball.p31ca.org`

---

## Wrangler Deploy (alternative)

```powershell
npx wrangler pages deploy dist --project-name p31-smallball
```

Existing `wrangler.toml`:

```toml
name = "p31-smallball"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"
```

---

## Build Command

```powershell
cd packages/family-apps/p31-smallball
npx vite build
```

---

## Infrastructure Context

- Cloudflare Pages project uses `vite build` output (skipping `tsc` due to ~187 pre-existing type errors in orphaned AAA graphics)
- PGLite WASM embedded in build (~8MB postgres.wasm included)
- All 3 energy views (Low/Medium/High) fully wired
- 5 training minigames built (IronMike, TrackSleds, Bullpen, PopFly, FilmRoom)
