# P31 Labs Secret Rotation Runbook
**Purpose:** Document procedures for rotating critical secrets and credentials across the P31 Labs ecosystem
**Version:** 1.0
**Last Updated:** May 25, 2026
**Applies To:** All Cloudflare Workers, Pages, and services handling sensitive data

## Table of Contents
1. [Overview](#overview)
2. [Secrets Inventory](#secrets-inventory)
3. [Rotation Procedures](#rotation-procedures)
4. [Automated Rotation Scripts](#automated-rotation-scripts)
5. [Verification Steps](#verification-steps)
6. [Emergency Procedures](#emergency-procedures)
7. [Schedule](#schedule)

## Overview
This runbook documents procedures for rotating secrets to maintain security hygiene and limit exposure windows. Regular rotation minimizes risk from potential credential leaks and ensures compliance with security best practices.

## Secrets Inventory

### Critical Secrets Requiring Rotation
| Secret | Location | Rotation Frequency | Owner | Notes |
|--------|----------|-------------------|-------|-------|
| `COMMAND_CENTER_STATUS_TOKEN` | 04_SOFTWARE/cloudflare-worker/command-center/ | Quarterly | Architect | Used for status.json updates |
| `COMMAND_CENTER_KV_ID` | 04_SOFTWARE/cloudflare-worker/command-center/ | Annually | Architect | KV namespace ID |
| Stripe API Keys (Publishable/Secret) | donate-api/, phosphorus31.org/ | Monthly | Mechanic | Payment processing |
| Cloudflare API Token (CF_API_TOKEN) | wrangler.toml files | Monthly | All lanes | Wrangler deployment |
| GitHub Personal Access Token | .github/workflows/ | Quarterly | DevOps | CI/CD pipelines |
| Google Workspace Service Account | Automation scripts | Quarterly | Gemini | Admin API access |
| Mercury Bank API Credentials | Financial automation | Monthly | Architect | Banking integrations |
| Zenodo Access Token | zenodo_batch/ | Annual | Research | Publication uploads |

### Non-Rotatable Identifiers
- EIN: 42-1888158 (Permanent organizational identifier)
- ORCID: 0009-0002-2492-9079 (Persistent researcher identifier)
- Durable Object IDs: Generated at creation, immutable
- KV Namespace IDs: Permanent once created (but can create new namespaces)

## Rotation Procedures

### 1. Cloudflare Worker Secrets
For each worker using secrets:

```bash
# 1. Generate new secret (example for STATUS_TOKEN)
NEW_TOKEN=$(openssl rand -base64 32)

# 2. Update in Wrangler config (development)
wrangler secret put COMMAND_CENTER_STATUS_TOKEN

# 3. Deploy to staging first
wrangler deploy --env staging

# 4. Verify functionality
./update-status.ps1  # or ./update-status.sh

# 5. Deploy to production
wrangler deploy --env production

# 6. Monitor for 24 hours
watch -n 30 "curl -s https://command-center.trimtab-signal.workers.dev/status"
```

### 2. Stripe API Keys
```bash
# 1. Create new keys in Stripe Dashboard
# 2. Update environment variables:
#    - STRIPE_PUBLISHABLE_KEY
#    - STRIPE_SECRET_KEY
# 3. Deploy to staging
# 4. Test with Stripe test mode
# 5. Deploy to production
# 6. Monitor webhooks and payments for 1 hour
# 7. Delete old keys after 24-hour overlap period
```

### 3. Cloudflare API Token
```bash
# 1. Generate new token with least privilege:
#    - Account.Worker Scripts: Edit
#    - Account.KV Storage: Edit
#    - Account.D1 Databases: Edit
# 2. Update all wrangler.toml files
# 3. Deploy all workers in sequence:
#    - Start with low-risk workers
#    - Progress to critical infrastructure
# 4. Verify all deployments succeed
# 5. Revoke old token after 24-hour verification
```

### 4. Google Workspace Service Account
```bash
# 1. Create new service account key in Google Cloud
# 2. Update automation scripts with new key path
# 3. Test API access:
#    - Directory read/write
#    - Calendar access
#    - Drive access (if applicable)
# 4. Update cron jobs and automation
# 5. Monitor logs for 12 hours
# 6. Delete old key after verification
```

## Automated Rotation Scripts
Location: `03_OPERATIONS/security/rotation/`

### rotate-status-token.sh
```bash
#!/bin/bash
# Rotates COMMAND_CENTER_STATUS_TOKEN

set -euo pipefail

# Generate new token
NEW_TOKEN=$(openssl rand -base64 32)
echo "New token generated: $NEW_TOKEN"

# Update wrangler secrets (staging first)
echo "Updating staging..."
wrangler secret put COMMAND_CENTER_STATUS_TOKEN <<< "$NEW_TOKEN" --env staging

# Deploy staging
echo "Deploying to staging..."
wrangler deploy --env staging

# Verify staging
echo "Verifying staging..."
./04_SOFTWARE/cloudflare-worker/command-center/update-status.ps1

# Promote to production
read -p "Staging verified? Promote to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Updating production..."
    wrangler secret put COMMAND_CENTER_STATUS_TOKEN <<< "$NEW_TOKEN" --env production
    
    echo "Deploying to production..."
    wrangler deploy --env production
    
    echo "Verifying production..."
    ./04_SOFTWARE/cloudflare-worker/command-center/update-status.ps1
    
    echo "SUCCESS: Token rotated"
else
    echo "ABORTED: Please verify staging first"
    exit 1
fi
```

### rotate-all-worker-secrets.sh
```bash
#!/bin/bash
# Rotates all worker secrets in sequence

set -euo pipefail

WORKERS=(
    "command-center"
    "chump-edge" 
    "p31-bouncer"
    "p31-sync-edge"
    "p31-q-factor"
    "p31-social-worker"
    "p31-social-broadcast"
    "k4-cage"
    "p31-forge"
)

for worker in "${WORKERS[@]}"; do
    echo "Rotating secrets for $worker..."
    # Add worker-specific rotation logic here
    # Example: wrangler secret put WORKER_SPECIFIC_SECRET
done

echo "All worker secrets rotated successfully"
```

## Verification Steps
After any secret rotation:

1. **Immediate Verification (within 5 minutes)**
   - All affected workers deploy successfully
   - Health check endpoints return 200 OK
   - Core functionality tests pass

2. **Short-term Verification (within 1 hour)**
   - Monitor logs for authentication errors
   - Verify KV/D1 operations succeed
   - Check webhook endpoints receive data

3. **Medium-term Verification (within 24 hours)**
   - Confirm no failed deployments
   - Verify all scheduled jobs run successfully
   - Check metrics for anomalous behavior

4. **Long-term Verification (ongoing)**
   - Include in regular health monitoring
   - Audit logs monthly for access patterns
   - Review for least privilege compliance

## Emergency Procedures
### Compromised Credential Response
1. **Immediate Action (within 5 minutes)**
   - Revoke/compromised credential immediately
   - Deploy workers with emergency fallback credentials
   - Notify team leads via designated channel

2. **Investigation (within 1 hour)**
   - Determine scope of exposure
   - Identify affected systems and data
   - Check logs for unauthorized access

3. **Remediation (within 4 hours)**
   - Rotate all potentially affected credentials
   - Implement additional monitoring
   - Document incident for post-mortem

4. **Follow-up (within 24 hours)**
   - Complete incident report
   - Update security procedures if needed
   - Conduct team debrief

### Failed Rotation Rollback
1. **Detect Failure**
   - Health checks failing
   - Authentication errors in logs
   - Deployment failures

2. **Immediate Response**
   - Revert to previous known-good configuration
   - Redeploy workers with old credentials
   - Verify service restoration

3. **Post-Mortem**
   - Determine root cause
   - Update rotation procedure
   - Schedule retest

## Schedule
### Regular Rotation Cadence
- **Monthly:** Stripe keys, Cloudflare API token
- **Quarterly:** STATUS_TOKEN, GitHub PAT, Google Workspace
- **Semi-Annually:** Review all secrets for necessity
- **Annually:** KV namespace IDs (create new if needed), Zenodo token
- **As Needed:** Any suspected compromise

### Calendar Integration
Add to team calendar:
- First Monday monthly: Stripe + Cloudflare token rotation
- First Monday quarterly: STATUS_TOKEN + GitHub + Google Workspace
- January/July annually: Full secrets review

### Automation Considerations
- Evaluate GitHub Actions for scheduled rotations
- Consider HashiCorp Vault for dynamic secrets
- Implement webhook notifications for rotation events
- Create Grafana dashboard for rotation status

---
*This runbook should be treated as a living document. Update procedures as systems evolve and new secrets are introduced.*
*All rotations should be documented in the audit log: `03_OPERATIONS/security/audit/rotation-log.md`*