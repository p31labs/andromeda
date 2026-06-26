#!/bin/bash
set -euo pipefail

REPO="p31labs/andromeda"
OWNER="p31labs"

echo "=== 1. GitHub Secrets ==="
gh secret set CLOUDFLARE_API_TOKEN --body "${CLOUDFLARE_API_TOKEN:-}"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "${CLOUDFLARE_ACCOUNT_ID:-}"

echo "=== 2. Branch Protection ==="
if npx github-sane-defaults apply "${REPO}" --yes; then
  echo "Branch protection applied via github-sane-defaults"
else
  echo "Falling back to gh api for branch protection..."
  PROTECTION=$(cat <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": []
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "enforce_admins": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
)
  gh api repos/"${OWNER}"/"${REPO}"/branches/main/protection \
    --method PUT \
    --input - <<JSON
${PROTECTION}
JSON
fi

echo "=== 3. GitHub Environments ==="
USER_ID=$(gh api user --jq .id)

# Staging — no reviewers, auto-approve
gh api repos/"${OWNER}"/"${REPO}"/environments/staging \
  --method PUT \
  --input - <<JSON
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
  --input - <<JSON
{
  "wait_timer": 0,
  "reviewers": [
    { "type": "User", "id": "${USER_ID}" }
  ],
  "prevent_self_review": false,
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON

echo "=== 4. Cloudflare Pages Staging Project + Custom Domain ==="
# Create project if it doesn't exist
(npx wrangler pages project create p31ca-staging --production-branch main) || true

# Bind custom domain staging.p31ca.org
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  curl -s -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/p31ca-staging/domains" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"staging.p31ca.org"}' || echo "Domain may already exist or token lacks Pages:Edit scope"
else
  echo "SKIP: CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID not set — add custom domain manually in dashboard"
fi

echo "=== 5. Verify ==="
echo "Secrets:"
gh secret list
echo ""
echo "Branch protection:"
gh api repos/"${OWNER}"/"${REPO}"/branches/main/protection | jq '.required_status_checks.strict'
echo ""
echo "Environments:"
gh api repos/"${OWNER}"/"${REPO}"/environments | jq '.environments[].name'

echo ""
echo "✅ Bootstrap complete. Pipeline is now the only path to production."
echo "   Next: run 'pnpm run verify:pipeline' to test with a PR."
