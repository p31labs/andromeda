# P31 Smallball Deployment

## Current URLs

- **Pages Dev**: https://p31-smallball.pages.dev (working)
- **Custom Domain**: https://smallball.p31ca.org (needs configuration)

## 522 Error Fix

The 522 error on `smallball.p31ca.org` means the custom domain is not configured in Cloudflare Pages.

### Fix Steps

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** > **p31-smallball**
3. Click **Custom Domains**
4. Click **Set up a custom domain**
5. Enter: `smallball.p31ca.org`
6. Click **Continue**

Cloudflare will automatically:
- Add the domain to the Pages project
- Update DNS if the zone is managed by Cloudflare

### Verification

```bash
# Check DNS
dig smallball.p31ca.org

# Should return Cloudflare IPs:
# 104.21.65.84
# 172.67.189.107

# Test deployment
curl -sI https://smallball.p31ca.org/
# Should return HTTP 200
```

## Deployment

```bash
# Build (if needed)
npm run build

# Deploy with wrangler
npx wrangler pages deploy dist --project-name=p31-smallball --branch=main
```

## DNS Status

Current DNS points to Cloudflare:
```
smallball.p31ca.org -> 104.21.65.84, 172.67.189.107 ✓
```

The DNS is correct. The 522 error is because the Pages project doesn't recognize the custom domain yet.
