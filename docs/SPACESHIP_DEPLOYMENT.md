# Spaceship Earth Deployment Plan

## Current State
- **Location:** `04_SOFTWARE/spaceship-earth/`
- **Status:** Built, not deployed
- **wrangler.toml:** Misconfigured (named `spaceship-relay`, not targeting Pages/Workers route)

## Decision: Deploy as Pages Project Subdomain

**Option A (Recommended): Pages Sub-Project**
- Deploy to `https://spaceship.p31ca.org` (subdomain of p31ca)
- Merge spaceship-earth/ into p31ca/ directory structure
- Add to p31ca GitHub Actions workflow
- Pros: Unified domain; easier to manage; shares p31ca analytics
- Cons: Requires file reorganization

**Option B: Standalone Pages Project**
- Deploy to `https://spaceship-earth.pages.dev`
- Keep separate GitHub Pages project
- Separate GitHub Actions workflow
- Pros: Independent versioning; clean separation
- Cons: Extra domain management; harder to unify later

**Option C: Worker with Route**
- Deploy as Worker to `https://p31ca.org/spaceship` route
- Keep spaceship-earth/ independent
- Add to deploy-p31-workers.yml
- Pros: Single domain; integrated monitoring
- Cons: Worker compute overhead (less efficient than Pages static)

## Recommended Implementation: Option A

### Steps:
1. Move `04_SOFTWARE/spaceship-earth/src/*` → `04_SOFTWARE/p31ca/src/pages/spaceship/`
2. Update `04_SOFTWARE/p31ca/wrangler.toml` (no changes; Pages auto-detects new route)
3. Update `04_SOFTWARE/p31ca/astro.config.mjs` to define `/spaceship` route (if needed)
4. Test locally: `npm run dev` in p31ca/
5. Push to main → GitHub Actions redeploys p31ca Pages with new route
6. Verify: `https://spaceship.p31ca.org` loads

### Git Commands:
```bash
cd 04_SOFTWARE
# Move files
mv spaceship-earth/src/* p31ca/src/pages/spaceship/
mv spaceship-earth/public/* p31ca/public/spaceship/ 2>/dev/null || true

# Update imports in p31ca to import spaceship components
# Commit
git add p31ca/
git rm -r spaceship-earth/
git commit -m "feat(spaceship): merge into p31ca Pages project"
git push
```

### Timeline:
- Execute merge: 15 min
- Test locally: 10 min
- Push & redeploy: 5 min (CI/CD automatic)
- Verify live: 2 min
- **Total: 30 minutes**

## Discord Webhook Setup (for Tier 1)

After deploying spaceship-earth, wire the Discord alerts:

```bash
# 1. Get Discord webhook URL from P31 team
# 2. Set as secret on command-center:
cd 04_SOFTWARE/cloudflare-worker/command-center
wrangler secret put DISCORD_WEBHOOK_URL  # Paste Discord webhook URL

# 3. Redeploy:
wrangler deploy

# 4. Test alert:
# Kill one endpoint temporarily (or just wait for next natural failure)
# Verify Discord alert fires in #p31-incidents
```

## Next: Tier 2 Completion Checklist

- [ ] Spaceship Earth merged & deployed
- [ ] Discord webhook URL set + worker redeployed
- [ ] Public status dashboard deployed to `https://status.p31ca.org`
- [ ] Load test run (k6 against bonding-relay)
- [ ] Git history checked for leaked secrets (git log -S "secret")
- [ ] SECRET_ROTATION.md added to repo
- [ ] GitHub Actions workflows updated for status-dashboard

## Status Dashboard Deployment

Deploy as standalone Pages project:

1. **GitHub Pages Integration:**
   - Visit https://dash.cloudflare.com/pages
   - Connect GitHub account if needed
   - Create new project: `p31-status-dashboard`
   - Repository: `p31labs/p31-andromeda`
   - Build setting: None (static)
   - Output directory: `/04_SOFTWARE/status-dashboard`

2. **Custom Domain:**
   - Cloudflare → Pages → p31-status-dashboard → Settings → Custom domains
   - Add `status.p31ca.org`
   - Verify DNS (CNAME or A record)

3. **GitHub Actions (optional automation):**
   - Pages auto-deploys on push to main if /04_SOFTWARE/status-dashboard/ changed
   - No additional workflow needed unless you want pre-deploy tests

4. **Verification:**
   ```bash
   curl https://status.p31ca.org/
   # Should return HTML with "P31 Ecosystem Status"
   ```

---

**Owner:** Will Johnson  
**Status:** Ready for execution  
**Timeline:** 1 hour total (spaceship merge + dashboard deploy)
