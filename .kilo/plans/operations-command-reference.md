# P31 OPERATIONS — COMMAND REFERENCE
## Quick reference for all crew members

---

## PRE-FLIGHT CHECKS (before every session)

```bash
# 1. Verify Node version
node --version    # Should be >= 20.0.0

# 2. Verify pnpm version  
pnpm --version    # Should be 10.32.1

# 3. Verify CF auth
npx wrangler whoami   # Should show Trimtab.signal@proton.me

# 4. Check workspace is clean
git status

# 5. NEVER run pnpm install from root unless absolutely necessary
# It may upgrade Vite beyond v5 and break PHOS builds
```

---

## BUILD COMMANDS

```bash
# WILLOW (from workspace root)
cd apps/willow && npm run build

# ARCADE
cd shells/arcade && npx vite build

# MESH  
cd shells/mesh && npx vite build

# ECOSYSTEM
cd shells/ecosystem && npx vite build

# PHOS (MUST run from phos/ directory, NOT root)
cd phos && npx astro build

# p31ca (MUST run from 04_SOFTWARE/p31ca/ directory)
cd 04_SOFTWARE/p31ca && npm run build
# Note: p31ca has a prebuild step that runs ~20 verification scripts

# BONDING (standalone, from 04_SOFTWARE/bonding/)
cd 04_SOFTWARE/bonding && npm run build

# Run tests
cd 04_SOFTWARE/bonding && npx vitest run    # 488 tests
cd 04_SOFTWARE/genesis-gate && npx vitest run   # 4 tests
```

---

## DEPLOY COMMANDS (ALWAYS from workspace root!)

```bash
# Pages deploys — run from C:\Users\sandra\Documents\P31_Andromeda
npx wrangler pages deploy apps/willow/dist --project-name willow --commit-dirty=true
npx wrangler pages deploy shells/arcade/dist --project-name arcade --commit-dirty=true
npx wrangler pages deploy shells/mesh/dist --project-name mesh --commit-dirty=true
npx wrangler pages deploy shells/ecosystem/dist --project-name ecosystem --commit-dirty=true
npx wrangler pages deploy phos/dist --project-name phos --commit-dirty=true
npx wrangler pages deploy 04_SOFTWARE/p31ca/dist --project-name p31ca --commit-dirty=true

# Worker deploys — run from worker directory
cd workers/love-ledger && npx wrangler deploy
cd workers/discord-alerter && npx wrangler deploy
cd workers/p31-signaling && npx wrangler deploy
cd workers/tetra-hub && npx wrangler deploy
cd workers/p31-mcp-server && npx wrangler deploy
cd workers/mesh-living-core && npx wrangler deploy
cd workers/node-one-bridge && npx wrangler deploy
cd workers/p31-ecosystem-bridge && npx wrangler deploy
cd workers/arcade-signal && npx wrangler deploy
```

---

## VERIFY DEPLOYMENTS

```bash
# Quick health check (PowerShell)
$urls = @(
    "https://p31ca.org",
    "https://phos.p31ca.org",
    "https://willow.p31ca.org",
    "https://arcade.p31ca.org",
    "https://mesh.p31ca.org",
    "https://ecosystem.p31ca.org",
    "https://bonding.p31ca.org",
    "https://phosphorus31.org"
)
foreach ($url in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-Output "✅ $url → $($r.StatusCode)"
    } catch {
        $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "ERR" }
        Write-Output "❌ $url → $code"
    }
}

# Check CF Pages domain status
$accountId = "ee05f70c889cb6f876b9925257e3a2fa"
$token = $env:CLOUDFLARE_API_TOKEN
$headers = @{"Authorization" = "Bearer $token"}
foreach ($project in @("willow","arcade","mesh","ecosystem","phos","p31ca")) {
    $d = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$project/domains" -Headers $headers
    foreach ($domain in $d.result) {
        Write-Output "$project → $($domain.name) status=$($domain.status)"
    }
}
```

---

## ⚠️ CRITICAL WARNINGS

1. **NEVER run `pnpm install` from workspace root** without pinning vite to ^5.4.0. It will upgrade Vite to v8 and break PHOS/Astro builds.

2. **NEVER run wrangler from subdirectories.** Wrangler 3.x auth fails. Always run from `C:\Users\sandra\Documents\P31_Andromeda`.

3. **NEVER run `astro build` from workspace root.** Root has a conflicting `astro.config.mjs`. Always build from project directories.

4. **Always `--commit-dirty=true`** when deploying with uncommitted changes.

5. **Always build before deploy.** Verify `npm run build` succeeds before running wrangler deploy.

6. **p31ca has a prebuild verification step** that scans for broken links. Warnings are normal (archived concept products), but errors need fixing.

---

## ENVIRONMENT VARIABLES

```bash
# Required
CLOUDFLARE_API_TOKEN    # Set in environment (API token with Pages + Workers permissions)

# Account
CF_ACCOUNT_ID=ee05f70c889cb6f876b9925257e3a2fa
CF_ACCOUNT_EMAIL=Trimtab.signal@proton.me
```

---

## TROUBLESHOOTING

### PHOS build fails with "defaultClient-images" error
→ Caused by Vite version mismatch. Ensure vite ^5.4.0 in root devDependencies. Run `pnpm install` after pinning.

### Wrangler auth fails
→ Run from workspace root, not subdirectories.
→ Verify CLOUDFLARE_API_TOKEN is set.
→ Run `npx wrangler whoami` to verify auth.

### Custom domain returns 403 or 523
→ SSL cert still provisioning. Wait 5-15 minutes.
→ Check status via CF API (see VERIFY DEPLOYMENTS above).
→ If stuck at "pending" for >1 hour, add CNAME record manually:
  `{subdomain}.p31ca.org CNAME {project}.pages.dev`

### p31ca prebuild fails
→ Check `04_SOFTWARE/p31ca/verify-internal-hub-links` output.
→ Many broken links are archived concept products (normal).
→ New broken links from your changes need fixing.

### Build succeeds but deploy shows old content
→ CF Pages caches aggressively. Check the deployment URL (not custom domain) first.
→ DNS propagation for custom domains can take up to 24 hours (usually < 1 hour).
