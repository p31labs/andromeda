#!/usr/bin/env bash
# deploy-all-pages.sh — deploys all 6 Cloudflare Pages sites in the p31 ecosystem.
set -euo pipefail

BASE=/home/p31/andromeda/software

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'
PASS=0; FAIL=0; WARN=0

pass() { ((PASS++)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}✘${NC} $1"; }
warn() { ((WARN++)); echo -e "  ${YELLOW}!${NC} $1"; }
info() { echo -e "  ${NC}▸${NC} $1"; }
section() { echo ""; echo -e "\033[1m$1\033[0m"; }

DRY_RUN=false
SINGLE_PROJECT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --project)
      SINGLE_PROJECT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--project <handle>]"
      exit 1
      ;;
  esac
done

get_wrangler() {
  if [[ -x "$BASE/p31ca/node_modules/.bin/wrangler" ]]; then
    echo "$BASE/p31ca/node_modules/.bin/wrangler"
  elif command -v wrangler &>/dev/null; then
    echo "wrangler"
  else
    echo ""
  fi
}

WRANGLER=$(get_wrangler)
if [[ -z "$WRANGLER" ]]; then
  echo -e "${RED}ERROR: wrangler not found. Install globally or in \$BASE/p31ca/node_modules/.bin/.${NC}"
  exit 1
fi

PROJECTS=(
  "p31ca|p31ca|$BASE/p31ca|npm run build|dist"
  "bonding|bonding|$BASE/bonding|pnpm run build|dist"
  "phos|phos|$BASE/phos|npm run build|dist"
  "spaceship-earth|spaceship-earth|$BASE/spaceship-earth|npm run build|dist"
  "ops|p31-hearing-ops|$BASE/p31-hearing-ops|npm run build|dist"
  "phosphorus31|phosphorus31|/home/p31/andromeda/phosphorus31.org/planetary-planet|npm run build|dist"
)

filtered_projects=()
for entry in "${PROJECTS[@]}"; do
  IFS='|' read -r handle name dir build_cmd dist_dir <<< "$entry"
  if [[ -z "$SINGLE_PROJECT" || "$handle" == "$SINGLE_PROJECT" ]]; then
    filtered_projects+=("$entry")
  fi
done

if [[ ${#filtered_projects[@]} -eq 0 ]]; then
  echo -e "${RED}No projects match --project '$SINGLE_PROJECT'.${NC}"
  exit 1
fi

section "🚀 Cloudflare Pages Deploy — ${#filtered_projects[@]} project(s)"
if $DRY_RUN; then
  info "DRY RUN — no builds or deploys will execute"
fi
info "wrangler: $WRANGLER"
echo ""

for entry in "${filtered_projects[@]}"; do
  IFS='|' read -r handle name dir build_cmd dist_dir <<< "$entry"

  section "Project: $handle → Cloudflare Pages project '$name'"
  info "Directory: $dir"

  if [[ ! -d "$dir" ]]; then
    warn "$handle — directory not found, skipping"
    continue
  fi

  info "Build command: $build_cmd (in $dir)"

  if $DRY_RUN; then
    info "[dry-run] Would run: (cd $dir && $build_cmd)"
    pass "$handle — build (dry-run)"
  else
    if (cd "$dir" && $build_cmd); then
      pass "$handle — build"
    else
      fail "$handle — build"
      continue
    fi
  fi

  info "Deploy command: wrangler pages deploy $dist_dir --project-name $name --branch=main --commit-dirty=true"

  if $DRY_RUN; then
    info "[dry-run] Would run: wrangler pages deploy $dist_dir --project-name $name --branch=main --commit-dirty=true"
    pass "$handle — deploy (dry-run)"
  else
    if (cd "$dir" && "$WRANGLER" pages deploy "$dist_dir" --project-name "$name" --branch=main --commit-dirty=true); then
      pass "$handle — deploy"
    else
      fail "$handle — deploy"
    fi
  fi
done

section "📊 Results"
TOTAL=$((PASS + FAIL + WARN))
echo ""
echo -e "  ${GREEN}Pass${NC}: $PASS  ${RED}Fail${NC}: $FAIL  ${YELLOW}Warn${NC}: $WARN  Total: $TOTAL"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}✅ All deploys succeeded.${NC}"
  exit 0
else
  echo -e "  ${RED}❘ $FAIL deploy(s) failed. Review output above.${NC}"
  exit 1
fi
