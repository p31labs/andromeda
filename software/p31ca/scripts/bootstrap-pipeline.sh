#!/bin/bash
set -euo pipefail

REPO="p31labs/andromeda"
OWNER="p31labs"

echo "=== 1. GitHub Secrets ==="
gh secret set CLOUDFLARE_API_TOKEN --body "${CLOUDFLARE_API_TOKEN:-}"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "${CLOUDFLARE_ACCOUNT_ID:-}"

echo "=== 2. Branch Protection ==="
npx github-sane-defaults apply "${REPO}" --yes

echo "=== 3. GitHub Environments ==="
# Staging — no reviewers, auto-approve
gh api repos/"${OWNER}"/"${REPO}"/environments/staging \
  --method PUT \
  --input - <<'JSON'
{
  "wait_timer": 0,
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON

# Production — requires manual approval
gh api repos/"${OWNER}"/"${REPO}"/environments/production \
  --method PUT \
  --input - <<'JSON'
{
  "wait_timer": 0,
  "reviewers": [
    { "type": "User", "id": "$(gh api user --jq .id)" }
  ],
  "prevent_self_review": false,
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON

echo "=== 4. Cloudflare Pages Staging Project ==="
(npx wrangler pages project create p31ca-staging --production-branch main) || true

echo "=== 5. Verify ==="
echo "Secrets:"
gh secret list
echo ""
echo "Branch protection:"
gh api repos/"${OWNER}"/"${REPO}"/branches/main/protection | jq '.required_status_checks.strict'
echo ""
echo "Environments:"
gh api repos/"${OWNER}"/"${REPO}"/environments | jq '.environments[].name'

echo "✅ Bootstrap complete. Pipeline is now the only path to production."
