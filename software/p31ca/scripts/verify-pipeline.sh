#!/bin/bash
set -euo pipefail

REPO="p31labs/andromeda"
BRANCH="test/pipeline-verify-$(date +%s)"
COMMIT_MSG="test: verify pipeline bootstrap"

echo "=== Pipeline Verification ==="
echo "This script creates a test branch, pushes it, and opens a PR to trigger the pipeline."
echo ""

# Ensure we're on main and up to date
git checkout main
git pull origin main

# Create test branch
git checkout -b "${BRANCH}"

# Empty commit to trigger pipeline
git commit --allow-empty -m "${COMMIT_MSG}"

# Push branch
git push origin "${BRANCH}"

# Open PR
PR_URL=$(gh pr create \
  --repo "${REPO}" \
  --title "${COMMIT_MSG}" \
  --body "Automated pipeline verification. This PR will test all 11 stages of p31-deploy.yml. \\n\\nOnce verified, close this PR." \
  --head "${BRANCH}" \
  --base main)

echo ""
echo "✅ PR opened: ${PR_URL}"
echo "   Watch the pipeline run in GitHub Actions."
echo "   Close the PR once verified."
