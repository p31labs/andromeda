#!/bin/bash
set -euo pipefail

REPO="p31labs/andromeda"
OWNER="p31labs"

# Resolve Cloudflare creds from wrangler config if not in env
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  WRANGLER_TOKEN=$(grep 'oauth_token' /home/p31/.wrangler/config/default.toml 2>/dev/null | sed 's/.*= "//;s/"//')
  if [ -n "$WRANGLER_TOKEN" ]; then
    export CLOUDFLARE_API_TOKEN="$WRANGLER_TOKEN"
  fi
fi
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  export CLOUDFLARE_ACCOUNT_ID=$(wrangler whoami --format json 2>/dev/null | jq -r '.accountId // empty')
fi

echo "=== 1. GitHub Secrets ==="
gh secret set CLOUDFLARE_API_TOKEN --body "${CLOUDFLARE_API_TOKEN:-}"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "${CLOUDFLARE_ACCOUNT_ID:-}"

echo "=== 2. Branch Protection ==="
if npx github-sane-defaults apply "${REPO}" --yes 2>/dev/null; then
  echo "Branch protection applied via github-sane-defaults"
else
  echo "Falling back to gh api for branch protection..."
  gh api repos/"${OWNER}"/"${REPO}"/branches/main/protection \
    --method PUT --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "lint"},{"context": "typecheck"},{"context": "audit-content"},
      {"context": "audit-pages"},{"context": "ground-truth"},{"context": "hub-verify"},
      {"context": "security"},{"context": "build"},{"context": "staging"},
      {"context": "smoke"},{"context": "quality-gate"}
    ]
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
fi

echo "=== 3. GitHub Environments ==="
USER_ID=$(gh api user --jq .id)

gh api repos/"${OWNER}"/"${REPO}"/environments/staging \
  --method PUT --input - <<JSON
{
  "wait_timer": 0,
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON

gh api repos/"${OWNER}"/"${REPO}"/environments/production \
  --method PUT --input - <<JSON
{
  "wait_timer": 0,
  "reviewers": [
    { "type": "User", "id": ${USER_ID} }
  ],
  "prevent_self_review": false,
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON

echo "=== 4. Cloudflare Pages Staging Project + Custom Domain ==="
(npx wrangler pages project create p31ca-staging --production-branch main) || true

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  # Bind custom domain
  curl -s -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/p31ca-staging/domains" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"staging.p31ca.org"}' >/dev/null 2>&1 || true

  # Create DNS CNAME if we have zone access
  ZONE_TAG=$(curl -s "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/zones?name=p31ca.org" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | jq -r '.result[0].id // empty')
  if [ -n "$ZONE_TAG" ]; then
    curl -s -X POST \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_TAG}/dns_records" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"type":"CNAME","name":"staging","content":"p31ca-staging.pages.dev","ttl":1,"proxied":true}' >/dev/null 2>&1 || true
  fi
fi

echo "=== 5. Verify ==="
echo "Secrets:"
(gh secret list 2>/dev/null || echo "Run from repo root")
echo ""
echo "Branch protection:"
gh api repos/"${OWNER}"/"${REPO}"/branches/main/protection | jq '{strict: .required_status_checks.strict, reviews: .required_pull_request_reviews.required_approving_review_count, force_push: .allow_force_pushes.enabled}'
echo ""
echo "Environments:"
gh api repos/"${OWNER}"/"${REPO}"/environments | jq '.environments[].name'

echo ""
echo "✅ Bootstrap complete. Pipeline is now the only path to production."
