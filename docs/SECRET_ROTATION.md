# Secret Rotation & Key Management

**Effective Date:** May 22, 2026  
**Version:** 1.0

---

## Rotation Schedule

| Secret | Rotation Frequency | Last Rotated | Next Rotation | Owner |
|--------|-------------------|--------------|---------------|-------|
| `CLOUDFLARE_API_TOKEN` | Quarterly (Jan/Apr/Jul/Oct) | TBD (initial) | Aug 22, 2026 | Will Johnson |
| `CLOUDFLARE_ACCOUNT_ID` | Yearly (if reorg) | N/A (static) | N/A | Will Johnson |
| `COMMAND_CENTER_STATUS_TOKEN` | Quarterly | TBD (initial) | Aug 22, 2026 | Will Johnson |
| `STRIPE_API_KEY` (live) | Quarterly | TBD (initial) | Aug 22, 2026 | Will Johnson |
| `STRIPE_SECRET_KEY` (live) | Quarterly | TBD (initial) | Aug 22, 2026 | Will Johnson |
| `DISCORD_WEBHOOK_URL` | Annually or on compromise | TBD (initial) | May 22, 2027 | Will Johnson |
| `GITHUB_ACTIONS_SECRETS` | Quarterly | TBD (initial) | Aug 22, 2026 | Will Johnson |
| Worker-bound secrets (P31_FHIR_SECRET, etc.) | Quarterly | TBD (initial) | Aug 22, 2026 | Will Johnson |

---

## Quarterly Rotation Procedure (Jan/Apr/Jul/Oct 22)

### 1. Cloudflare API Token

**Location:** `.env.master` + GitHub Actions secret + worker env vars

**Steps:**
```bash
# 1. Log into Cloudflare dashboard
# 2. Account Home → Settings → API Tokens
# 3. Click existing token (e.g., "P31 GitHub Actions Deploy")
# 4. Click "Roll" → confirm
# 5. Copy new token
# 6. Update .env.master (DO NOT COMMIT)
# 7. Update GitHub Actions secret
cd c:\Users\sandra\Documents\P31_Andromeda
nano .env.master  # Edit CLOUDFLARE_API_TOKEN=***
# 8. Update GitHub Actions secret (via https://github.com/p31labs/p31-andromeda/settings/secrets/actions)
#    Edit CLOUDFLARE_API_TOKEN → paste new token
# 9. Test: Run a manual GitHub Actions deploy
#    https://github.com/p31labs/p31-andromeda/actions/workflows/deploy-p31-workers.yml
#    Click "Run workflow" → verify it succeeds
# 10. Revoke old token (Cloudflare dashboard → API Tokens → click old token → Delete)
# 11. Update SECRET_ROTATION.md table above (Last Rotated date)
# 12. Commit to git (don't commit .env.master, but commit this file with updated date)
git add docs/SECRET_ROTATION.md
git commit -m "chore(secrets): rotated CLOUDFLARE_API_TOKEN — Apr 22, 2026"
git push
```

**Verification:**
- [ ] Old token no longer works in Cloudflare dashboard
- [ ] GitHub Actions deploy succeeds with new token
- [ ] All workers deployed successfully

### 2. Stripe Keys (Live)

**Location:** Worker secrets (donate-api, p31-stripe-webhook)

**Steps:**
```bash
# 1. Go to https://dashboard.stripe.com/apikeys
# 2. Scroll to "Reveal live key"
# 3. Click "Roll key" (for both standard secret key and restricted keys)
# 4. Wait 2 min for rollover
# 5. Update worker secrets:
cd 04_SOFTWARE/cloudflare-worker/donate-api
wrangler secret put STRIPE_API_KEY  # Paste new live secret key
# (Same for any other workers using Stripe)
# 6. Redeploy:
wrangler deploy
# 7. Test: Process a test donation (use Stripe test card 4242 4242 4242 4242)
# 8. Verify webhook delivery in Stripe dashboard → Logs
# 9. Revoke old key in Stripe (Account Settings → API Keys → click old → Archive)
```

**Verification:**
- [ ] Test donation processes successfully
- [ ] Webhook deliveries logged in Stripe Logs
- [ ] Old key archived in Stripe dashboard

### 3. GitHub Actions Secrets

**Location:** Repository settings (https://github.com/p31labs/p31-andromeda/settings/secrets/actions)

**Secrets to Rotate:**
- `CLOUDFLARE_API_TOKEN` (see above)
- `CLOUDFLARE_ACCOUNT_ID` (static, only if account changes)
- `TURBO_TOKEN` (Turborepo cache) — optional, no expiration

**Steps:**
```bash
# 1. Go to https://github.com/p31labs/p31-andromeda/settings/secrets/actions
# 2. Edit CLOUDFLARE_API_TOKEN (already done above)
# 3. For TURBO_TOKEN:
#    - Go to https://vercel.com/account/tokens
#    - Click "Create" → select team "p31labs" → copy
#    - Paste into GitHub secret TURBO_TOKEN
# 4. Save and commit test
git status  # Should be clean (secrets not in repo)
```

### 4. Worker-Bound Secrets

**Location:** Wrangler secret store (Cloudflare)

**Secrets to Rotate:**
- `P31_FHIR_SECRET` (command-center)
- `DISCORD_WEBHOOK_URL` (command-center, new — added for alerts)
- Any others listed in wrangler.toml

**Steps:**
```bash
# 1. For each secret, run:
cd 04_SOFTWARE/cloudflare-worker/command-center
wrangler secret put P31_FHIR_SECRET  # Prompts for input; paste new value
wrangler secret put DISCORD_WEBHOOK_URL  # Same for new Discord secret

# 2. Redeploy to apply:
wrangler deploy

# 3. Test each secret is used correctly:
#    - FHIR: Verify calcium check runs at :15 of each hour
#    - Discord: Verify alerts fire on endpoint failure
```

**Verification:**
- [ ] `wrangler secret list` shows updated timestamp
- [ ] Worker uses new secrets in prod (check logs)

---

## Incident: Secret Compromise

**If a secret is leaked to git, Slack, email, or third party:**

1. **Immediate (within 5 min):**
   - Invalidate the compromised secret (revoke token in Cloudflare/Stripe/GitHub)
   - Create new secret
   - Deploy new secret to all consumers

2. **Urgent (within 30 min):**
   - Check git history: `git log -S "CLOUDFLARE_API_TOKEN" --oneline`
   - If found, contact GitHub support to purge from history (or rewrite history + force-push)
   - Audit Slack/Discord logs for leaked tokens (use Slack search)
   - Check third-party services (Stripe, Cloudflare) for unauthorized access

3. **Follow-up (within 24 hours):**
   - Post-mortem: how was secret leaked?
   - Add `.env.master` to .gitignore (verify it's there)
   - Add pre-commit hook to catch secrets before commit
   - Document incident in `INCIDENT_LOG/[date]-secret-leak.md`

**Pre-Commit Hook** (add to `.git/hooks/pre-commit`):
```bash
#!/bin/bash
# Prevent commit of .env.* files
if git diff --cached --name-only | grep -E '\.(env|key|secret)'; then
  echo "ERROR: Attempting to commit secrets file!"
  exit 1
fi
```

---

## Secret Storage & Access

**Rule: Secrets NEVER go in:**
- Git history (even if deleted, still in `git log`)
- Discord / Slack (use thread, then delete)
- Unencrypted email
- Confluence / shared docs
- Commit messages

**Rule: Secrets ALWAYS go in:**
- `.env.master` (local machine only, in .gitignore)
- Cloudflare Workers secrets (`wrangler secret put`)
- GitHub Actions secrets (Settings → Secrets)
- Stripe/Cloudflare dashboards (via secure form)

**Access Control:**
- `.env.master`: Will Johnson only (on personal machine)
- GitHub Actions secrets: Require MFA + only available during action execution
- Cloudflare Workers secrets: Restricted to account owner + any Cloudflare Access policies
- Backup rotation: Document who has access to R2 backup bucket (currently: cloud.dev IAM role)

---

## Audit Trail

**Track all secret operations:**

| Date | Secret | Action | Duration | Approved By | Notes |
|------|--------|--------|----------|-------------|-------|
| 2026-04-13 | Initial secrets created | Create | 1 day | Will Johnson | EIN registration, first deployment |
| 2026-05-22 | CLOUDFLARE_API_TOKEN | Rotate (quarterly schedule) | 30 min | Will Johnson | Tier 1 launch prep |
| 2026-05-22 | DISCORD_WEBHOOK_URL | Create (new alerts) | 15 min | Will Johnson | Incident response integration |

**Update this table every rotation.** Commit changes to `docs/SECRET_ROTATION.md`.

---

## Monitoring & Alerts

**Secret Exposure Detection:**
- GitHub Advanced Security scans all commits for exposed keys
- Cloudflare detects API token misuse (unusual usage patterns)
- Stripe invalidates leaked keys automatically (email alert sent)

**If GitHub Secret Scanning Detects a Leak:**
1. GitHub sends email + repo alert
2. You have 90 days to rotate before key is revoked
3. **Do immediately:** Rotate + invalidate old key
4. Delete any leaked keys from Stripe/Cloudflare dashboards

---

## Recovery & Contingency

**If all secrets are lost (laptop stolen, account hacked):**

1. Revoke all existing secrets across all platforms
2. Create new secrets in each service
3. Update `.env.master` locally
4. Re-deploy all workers: `wrangler deploy` (all)
5. Update GitHub Actions secrets
6. Notify stakeholders of 2–4 hour deployment window

**Estimated recovery time:** 2 hours

---

**Document Owner:** Will Johnson  
**Last Updated:** 2026-05-22  
**Next Rotation:** Aug 22, 2026
