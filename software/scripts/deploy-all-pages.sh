#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# P31 ANDROMEDA — Deploy All Pages Sites
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[1m'; N='\033[0m'
ANDROMEDA="${ANDROMEDA:-/home/p31/andromeda}"

deploy() {
  local name="$1" dir="$2" project="$3" branch="${4:-master}"
  echo -e "\n  ${B}${name}${N} (${project}, ${branch})"
  if [[ -d "$dir" ]]; then
    cd "$dir"
    if wrangler pages deploy . --project-name "$project" --branch "$branch" 2>&1 | tail -1; then
      echo -e "  ${G}✓${N} ${name} deployed"
    else
      echo -e "  ${R}✗${N} ${name} deploy failed"
    fi
  else
    echo -e "  ${Y}⚠${N} ${name}: directory not found at ${dir}"
  fi
}

echo -e "${B}P31 Ecosystem — Deploy All Pages${N}"

deploy "p31ca.org"          "${ANDROMEDA}/software/p31ca"                    "p31ca"                    "master"
deploy "PHOS"               "${ANDROMEDA}/phos"                              "phos-btn"                 "master"
deploy "BONDING Chemistry"  "${ANDROMEDA}/software/bonding"                  "bonding"                  "master"
deploy "BONDING Onboarding" "/home/p31/bonding/apps/onboarding"             "bonding-meatspace"        "master"
deploy "phosphorus31.org"   "${ANDROMEDA}/phosphorus31.org/planetary-planet" "phosphorus31"             "master"
deploy "ops.p31ca.org"      "${ANDROMEDA}/software/p31-hearing-ops"          "p31-hearing-ops"          "master"

echo -e "\n${G}Done.${N}"
