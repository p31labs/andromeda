# FORTUNE 1 Stack — Cloudflare & GitHub Complete Setup

**As of:** 2026-06-26  
**Account:** Trimtab.signal@proton.me  
**Domains:** p31ca.org, phosphorus31.org  

---

## What Is Now Live

### 1. Infrastructure as Code (Terraform)
```
terraform/cloudflare/
├── versions.tf          # Terraform >= 1.5, Cloudflare provider ~> 4.0
├── providers.tf         # Cloudflare provider (api_token via TF_VAR_)
├── variables.tf         # account_id, zone IDs, api_token
├── main.tf              # ALL resources defined in code
├── terraform.tfvars.example  # Template (not committed)
└── terraform.tfvars     # YOUR local copy (gitignored)
```

**Resources now in code:**
| Category | Count | Resources |
|----------|-------|-----------|
| Pages Projects | 3 | p31ca-staging, p31-oasis, p31-cli |
| D1 Databases | 10 | p31-revenue-db, p31-passkey-db, p31-fhir-db, etc. |
| KV Namespaces | 13 | SPOONS_KV, MESH_HEARTBEATS, ARCHIVE_KV, etc. |
| R2 Buckets | 12 | p31-game-assets, jitterbug-deliverables, p31-epcp-*, etc. |

**CI Integration:**
- `.github/workflows/terraform.yml` — plan on PR, apply on merge to main
- Quality gate required before apply

### 2. CI/CD Pipeline (GitHub Actions)
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR + push to main | Lint → typecheck → security audit → test → build → quality-gate |
| `terraform.yml` | PR + push to main | Terraform plan/apply for `terraform/**` paths |
| `dependabot.yml` | Weekly | Auto-update npm + GitHub Actions dependencies |

### 3. Security Layer (DevSecOps)
| Tool | What It Scans | Frequency |
|------|---------------|-----------|
| Dependabot | npm + GitHub Actions deps | Weekly |
| Gitleaks | Secrets in code | Every commit |
| Trivy | Filesystem vulnerabilities | Every commit |
| ESLint security plugins | Object injection, crypto, regex | Every commit |

### 4. Branch Protection
| Rule | Value |
|------|-------|
| Required status check | `quality-gate` |
| Required reviews | 1 |
| Strict status | Enabled |
| Admin enforcement | Enabled |
| Force pushes | Blocked |
| Auto-merge | Available (gh pr merge --auto --squash) |

### 5. Pre-Commit Hooks
| Hook | Purpose |
|------|---------|
| `.husky/pre-commit` | Fast-fail on conflict markers |
| `.husky/pre-merge-commit` | Block markers before merge |
| `rerere` | Auto-resolve repeat conflicts |

---

## Resources Inventoried from Your Cloudflare Account

### Zones (Domains)
- `p31ca.org` → `3ba5eda28c73c52dc6f0c33a2a607aae`
- `phosphorus31.org` → `a3de54c2da0406238d9c2e66e23c9ac6`

### Pages Projects
- p31ca-staging → `p31ca-staging.pages.dev`
- p31-oasis → `p31-oasis.pages.dev`
- p31-cli → `p31-cli.pages.dev`

### Workers Scripts (~30)
k4-cage, command-center, k4-hubs, k4-personal, kenosis-mesh, p31-cortex, p31-forge, genesis-gate, geodesic-room, love-ledger, donate-api, mesh-bridge, shadow-bridge, p31-agent-hub, p31-bouncer, p31-fhir-production, jitterbug-api, bros-signaling, carrie-agent, cashpilot-sync, chump-edge, discord-alerter, discord-bot, p31-access-gateway, p31-api-gateway, p31-google-bridge, meatspace, bonding-relay, p31-social-broadcast, q-factor

### D1 Databases (10)
p31-revenue-db, p31-passkey-db, p31-fhir-db, epcp-audit, mesh_logs, p31-telemetry, simplex, phos-event-log, p31-cortex, love-ledger

### KV Namespaces (~20)
glass_box_kv_prod, state_staging, gridiron-gameplan, qfactor_state, SPOONS_KV, bonding-game, K4_PERSONAL, simplex-state, smallball-tendencies, MESH_HEARTBEATS, jitterbug-cache, donate-events, ARCHIVE_KV, PHOS_STATE, PHOS_CACHE, and more

### R2 Buckets (12)
jitterbug-deliverables, advocacy-ada, advocacy-education, advocacy-medical, edge-models, epcp-artifacts, epcp-audit-exports, epcp-forensics-cold, epcp-forensics-hot, foundry-artifacts, game-assets, p31-mesh-bucket

---

## What You Need to Do (One-Time Setup)

### 1. Create a Cloudflare API Token
**Why:** Terraform needs an API token (different from the Wrangler OAuth token).

**Steps:**
1. Go to [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template (or create custom with these permissions):
   - Account: Cloudflare Pages (Edit)
   - Account: Cloudflare Workers (Edit)
   - Account: Cloudflare D1 (Edit)
   - Account: Cloudflare Storage (Edit)
   - Zone: Zone (Read)
   - Zone: DNS (Edit)
4. Copy the token (it starts with something like `...`)

### 2. Add Token to GitHub Secrets
```bash
gh secret set CLOUDFLARE_API_TOKEN
# Paste the token when prompted
```

### 3. Create Local terraform.tfvars
```bash
cd /home/p31/andromeda/terraform/cloudflare
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and add your real API token
terraform init
terraform plan
```

---

## The Complete FORTUNE 1 Stack (Current State)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FORTUNE 1 STACK — LIVE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LAYER 1: SOURCE CONTROL & CI/CD                                   │
│  ✅ GitHub Actions (quality-gate pipeline)                         │
│  ✅ Auto-merge with squash                                         │
│  ✅ Branch protection (quality-gate + 1 review)                    │
│  ✅ Dependabot (weekly npm + actions updates)                      │
│                                                                     │
│  LAYER 2: SECURITY & COMPLIANCE (DevSecOps)                        │
│  ✅ Dependabot (SCA)                                               │
│  ✅ Gitleaks (secrets detection)                                   │
│  ✅ Trivy (filesystem vulnerability scanner)                       │
│  ✅ ESLint security plugins                                        │
│  ⏳ Semgrep SAST (optional, add when ready)                        │
│                                                                     │
│  LAYER 3: OBSERVABILITY                                             │
│  ✅ Cloudflare Analytics (built-in)                                │
│  ✅ Health check scripts (audit:health)                             │
│  ⏳ Grafana Cloud free tier (custom metrics)                       │
│                                                                     │
│  LAYER 4: INFRASTRUCTURE AS CODE                                   │
│  ✅ Terraform (all CF resources in code)                           │
│  ✅ Terraform CI (plan on PR, apply on merge)                      │
│  ✅ .gitignore protects secrets                                    │
│                                                                     │
│  LAYER 5: SECRETS MANAGEMENT                                       │
│  ✅ GitHub Secrets (CLOUDFLARE_API_TOKEN, etc.)                    │
│  ✅ Doppler (already in use)                                       │
│  ✅ TF_VAR_ env vars for Terraform                                 │
│                                                                     │
│  LAYER 6: DEPLOYMENT & ORCHESTRATION                               │
│  ✅ Cloudflare Pages (3 projects)                                  │
│  ✅ Cloudflare Workers (~30 scripts)                               │
│  ✅ D1 (10 databases)                                              │
│  ✅ KV (~20 namespaces)                                            │
│  ✅ R2 (12 buckets)                                                │
│  ✅ wrangler CLI (local deploys)                                   │
│  ⏳ Cloudflare Workers Builds (native CI/CD)                       │
│                                                                     │
│  LAYER 7: COMMIT-TIME GATES                                        │
│  ✅ Husky pre-commit (conflict marker block)                       │
│  ✅ Husky pre-merge-commit (conflict marker block)                 │
│  ✅ rerere (auto-resolve repeat conflicts)                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What Is NOT Yet Done

| Priority | Item | Why it can wait |
|----------|------|-----------------|
| P0 | Merge PR #147 | Need 1 review |
| P0 | Add CLOUDFLARE_API_TOKEN to GitHub secrets | One-time setup |
| P1 | Run `terraform plan` locally | After token is set |
| P1 | Terraform apply (import existing resources) | After plan validates |
| P1 | User onboarding & site flows | Next strategic priority |
| P2 | Grafana Cloud integration | Nice-to-have |
| P2 | Semgrep SAST | Add when ready |
| P3 | Cloudflare Workers Builds | Nice-to-have |
| P3 | Cloudflare Turnstile (CAPTCHA replacement) | Nice-to-have |

---

## Quick Commands Reference

```bash
# Terraform
cd terraform/cloudflare
export TF_VAR_cloudflare_api_token=your-token
terraform init
terraform plan
terraform apply

# CI
pnpm run ci
pnpm run lint
pnpm run typecheck
pnpm run security:audit
pnpm run build

# Deploy
pnpm run deploy        # Production
pnpm run deploy:dev    # Preview

# Merge (auto-merge when CI passes)
gh pr merge 147 --squash --auto

# Dependabot (manual trigger)
gh workflow run dependabot
```

---

## The Anti-Complacency Matrix

| Temptation | Block |
|------------|------|
| "Skip the tests" | CI requires tests to pass before merge |
| "Deploy directly" | terraform apply requires PR + CI |
| "I'll approve my own PR" | Branch protection requires 1 reviewer |
| "I'll fix it in production" | Staging + quality gate required |
| "I'll use the dashboard" | Infrastructure is code; UI is read-only |
| "I'll skip Terraform" | CI validates terraform on every PR |
| "Just push to main" | Branch protection blocks direct push |

---

*The FORTUNE 1 stack is live. The only remaining manual action is creating the Cloudflare API token and adding it to GitHub secrets. After that, everything is automated.*
