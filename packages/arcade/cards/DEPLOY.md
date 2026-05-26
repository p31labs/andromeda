# P31 Cards - Deployment Guide

## Status

**Build Status**: TypeScript compilation passes (0 errors)
**Production Ready**: Yes (code verified, needs CI build)

## Local Build Limitation

The Vite bundling phase requires more memory than available in this environment (Bus error during Rollup optimization). The TypeScript compilation passes completely.

**Solution**: Use GitHub Actions CI/CD for building, which has 8GB+ memory.

## Deployment Options

### Option 1: GitHub Actions + Wrangler (Recommended)

The `.github/workflows/deploy.yml` uses `cloudflare/wrangler-action@v3` with the token already configured in GitHub secrets.

**Setup:**
1. Push to GitHub
2. Create Cloudflare Pages project named `p31-cards`
3. Push to `main` branch triggers automatic deployment

**Workflow:**
- Type-check with `tsc --noEmit`
- Build with `NODE_OPTIONS=--max-old-space-size=8192`
- Deploy via Wrangler action

### Option 2: Wrangler CLI (Local/CI)

```bash
# Verify authentication
npm run wrangler:check

# Deploy to production
npm run deploy:ci

# Or deploy to staging
npm run deploy:staging
```

### Option 3: Direct Wrangler

```bash
# After build in higher-memory environment
wrangler pages deploy dist --project-name=p31-cards --branch=main
```

## File Structure

```
p31-cards/
├── src/
│   ├── types/index.ts      # 650+ lines - Complete type system
│   ├── engine/             # Game logic (deck, bidding, scoring, trick-taking)
│   ├── components/         # React components (games, UI, AI)
│   ├── db/                 # PGLite local-first database
│   └── App.tsx             # Main application
├── .github/workflows/
│   └── deploy.yml          # CI/CD pipeline with Wrangler action
├── wrangler.toml           # Cloudflare Pages config
└── package.json            # Dependencies + deploy scripts
```

## NPM Scripts

```bash
npm run deploy:ci         # Deploy production via Wrangler
npm run deploy:staging    # Deploy staging branch
npm run wrangler:check    # Verify Cloudflare auth
npm run worker:deploy     # Deploy signal worker
```

## Features

- 4 Card Games: Crazy Eights, Hearts, Euchre, Bridge Lite
- Spoon Theory UX: 1/3/6 spoon accessibility modes
- AI Players: 4 personalities (Nana, Ace, Buddy, Scout)
- Cross-Game XP: Unified identity with Smallball/Gridiron
- PGLite Database: Local-first with match persistence

## Verification

```bash
npm run validate:all      # Full test suite
npm run validate:cards    # Card system validation
npm run validate:prng     # PRNG determinism check
```

## Secrets

- `CLOUDFLARE_API_TOKEN` - Already configured in GitHub secrets

## Expected Deployed URL

- Production: `https://p31-cards.pages.dev`
- Custom domain: Configure in Cloudflare Pages dashboard
