#!/usr/bin/env bash
# Zenodo upload pipeline for P31 Andromeda research papers
# Usage: ./zenodo_pipeline.sh <doi_from_paper_xii> [--dry-run] [--skip-held] [--papers-dir PATH]
#
# This script:
# 1. Validates the Paper XII DOI and checks paper file availability
# 2. Reports which papers are found/missing
# 3. (Manual step) User uploads Paper XII to Zenodo and captures DOI
# 4. Updates DOI references in Paper XI and XIX with sed
# 5. Uploads remaining papers via zenodo_upload.py
#
# Paper sequence: XII first (manual, for DOI) → sed XI and XIX → upload all
#
# REQUIRES: zenodo_upload.py to be present and functional
# RECOMMENDED: Run with --dry-run first to verify paths and substitutions

set -euo pipefail

# Configuration
RESEARCH_DIR="/home/p31/andromeda/02_RESEARCH"
ZENODO_UPLOAD_SCRIPT="/home/p31/andromeda/scripts/zenodo_upload.py"
PAPER_DIR="${RESEARCH_DIR}/papers"
DRY_RUN=false
SKIP_HELD=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $*"; }

# Parse arguments
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <doi_from_paper_xii> [--dry-run] [--skip-held] [--papers-dir PATH]"
  echo ""
  echo "  <doi_from_paper_xii>: DOI obtained after manually uploading Paper XII to Zenodo"
  echo "                        Format: 10.5281/zenodo.XXXXX"
  echo "  --dry-run:             Show what would be done without executing uploads"
  echo "  --skip-held:           Skip uploading Papers XIII, XVIII, XX (legally risky)"
  echo "  --papers-dir PATH:     Override default papers directory"
  exit 1
fi

XII_DOI="$1"
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      log_info "Dry run mode enabled"
      shift
      ;;
    --skip-held)
      SKIP_HELD=true
      log_info "Skipping held papers (XIII, XVIII, XX)"
      shift
      ;;
    --papers-dir)
      PAPER_DIR="$2"
      shift 2
      ;;
    *)
      log_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate inputs
if [[ -z "${XII_DOI}" ]]; then
  log_error "Paper XII DOI cannot be empty"
  exit 1
fi

# Basic DOI format validation
if [[ ! "${XII_DOI}" =~ ^10\.[0-9]+\/[^/]+$ ]]; then
  log_warn "DOI format looks unusual: ${XII_DOI}"
  log_info "Expected format: 10.5281/zenodo.XXXXX"
fi

if [[ ! -f "${ZENODO_UPLOAD_SCRIPT}" ]]; then
  log_error "Zenodo upload script not found: ${ZENODO_UPLOAD_SCRIPT}"
  exit 1
fi

if [[ ! -d "${PAPER_DIR}" ]]; then
  log_error "Papers directory not found: ${PAPER_DIR}"
  log_info "Use --papers-dir PATH to specify where papers are located"
  exit 1
fi

# Define paper mappings using indexed arrays (more portable than associative arrays)
PAPER_NAMES=(
  "Paper I"
  "Paper II"
  "Paper III"
  "Paper IV"
  "Paper V"
  "Paper VI"
  "Paper VII"
  "Paper VIII"
  "Paper IX"
  "Paper X"
  "Paper XI"
  "Paper XII"
  "Paper XIII"
  "Paper XIV"
  "Paper XV"
  "Paper XVI"
  "Paper XVII"
  "Paper XVIII"
  "Paper XIX"
  "Paper XX"
)

# Extension map: most papers are PDFs, select ones are Markdown
PAPER_EXT=(
  ".md"   # Paper I
  ".md"   # Paper II
  ".md"   # Paper III
  ".md"   # Paper IV
  ".pdf"  # Paper V
  ".pdf"  # Paper VI
  ".pdf"  # Paper VII
  ".pdf"  # Paper VIII
  ".pdf"  # Paper IX
  ".pdf"  # Paper X
  ".md"   # Paper XI
  ".md"   # Paper XII
  ".md"   # Paper XIII (held)
  ".pdf"  # Paper XIV
  ".pdf"  # Paper XV
  ".pdf"  # Paper XVI
  ".pdf"  # Paper XVII
  ".md"   # Paper XVIII (held)
  ".md"   # Paper XIX
  ".md"   # Paper XX (held)
)

# Function to get file path for a paper number (1-20)
get_paper_path() {
  local num=$1
  local name="${PAPER_NAMES[$((num-1))]}"
  local ext="${PAPER_EXT[$((num-1))]}"
  echo "${PAPER_DIR}/${name}${ext}"
}

# Function to check if file exists
check_file_exists() {
  local num=$1
  local name="${PAPER_NAMES[$((num-1))]}"
  local file_path
  file_path=$(get_paper_path "$num")
  
  if [[ -f "${file_path}" ]]; then
    log_info "  [FOUND] ${name}: ${file_path}"
    return 0
  else
    log_warn "  [MISSING] ${name}: ${file_path}"
    return 1
  fi
}

# Function to scan all papers and report status
scan_papers() {
  log_step "Scanning papers directory: ${PAPER_DIR}"
  local found=0
  local missing=0
  declare -A PAPER_PATHS
  
  for i in $(seq 1 20); do
    local path
    path=$(get_paper_path "$i")
    local name="${PAPER_NAMES[$((i-1))]}"
    
    if [[ -f "${path}" ]]; then
      PAPER_PATHS["$name"]="${path}"
      ((found++))
    else
      ((missing++))
    fi
  done
  
  echo ""
  log_info "Scan results: ${found} found, ${missing} missing"
  echo ""
  
  if [[ $missing -gt 0 ]]; then
    log_warn "Missing papers will be skipped during upload:"
    for i in $(seq 1 20); do
      local path
      path=$(get_paper_path "$i")
      if [[ ! -f "${path}" ]]; then
        echo "    - ${PAPER_NAMES[$((i-1))]}"
      fi
    done
    echo ""
  fi
  
  echo "${PAPER_PATHS[@]}"
}

# Function to check Paper XII status
check_paper_xii() {
  local xii_path
  xii_path=$(get_paper_path 12)
  
  log_step "Checking Paper XII"
  
  if [[ -f "${xii_path}" ]]; then
    log_info "  Paper XII found: ${xii_path}"
    log_info "  Next step: Upload Paper XII manually to Zenodo, then provide the DOI"
    log_info "  DOI placeholder for this run: ${XII_DOI}"
    return 0
  else
    log_error "  Paper XII not found: ${xii_path}"
    log_error "  Cannot proceed without Paper XII. Upload it to Zenodo first."
    return 1
  fi
}

# Function to update DOI references in Paper XI and Paper XIX
update_doi_references() {
  local doi="$1"
  log_step "Updating DOI references in Paper XI and Paper XIX"
  
  local papers_to_update=(11 19)  # Paper XI and Paper XIX
  
  for num in "${papers_to_update[@]}"; do
    local path
    path=$(get_paper_path "$num")
    local name="${PAPER_NAMES[$((num-1))]}"
    
    if [[ ! -f "${path}" ]]; then
      log_warn "  Skipping ${name}: file not found at ${path}"
      continue
    fi
    
    log_info "  Processing ${name}: ${path}"
    
    if [[ "${DRY_RUN}" == true ]]; then
      log_info "  [DRY RUN] Would update DOI reference in ${name}"
      log_info "  [DRY RUN] Pattern: replace [9] or PLACEHOLDER_DOI with ${doi}"
      continue
    fi
    
    # Check for common DOI placeholder patterns
    local placeholder_found=false
    
    # Pattern 1: [9] (citation reference)
    if grep -q '\[9\]' "${path}"; then
      log_info "  Found placeholder [9] in ${name}"
      # Extract the short ID from DOI (e.g., 10.5281/zenodo.12345 → 12345)
      local short_id
      short_id=$(echo "${doi}" | grep -oP '[0-9]+$' || echo "${doi##*.}")
      sed -i "s/\[9\]/[${short_id}]/g" "${path}"
      placeholder_found=true
    fi
    
    # Pattern 2: [7] (for Paper XIX)
    if [[ "$num" -eq 19 ]] && grep -q '\[7\]' "${path}"; then
      log_info "  Found placeholder [7] in ${name}"
      local short_id
      short_id=$(echo "${doi}" | grep -oP '[0-9]+$' || echo "${doi##*.}")
      sed -i "s/\[7\]/[${short_id}]/g" "${path}"
      placeholder_found=true
    fi
    
    # Pattern 3: PLACEHOLDER_DOI or PLACEHOLDER_DOI_XII
    if grep -qi 'PLACEHOLDER_DOI' "${path}"; then
      log_info "  Found PLACEHOLDER_DOI in ${name}"
      sed -i "s/PLACEHOLDER_DOI_XII/${doi}/g" "${path}"
      sed -i "s/PLACEHOLDER_DOI/${doi}/g" "${path}"
      placeholder_found=true
    fi
    
    if [[ "${placeholder_found}" == true ]]; then
      log_info "  ✓ Updated DOI references in ${name}"
    else
      log_warn "  No DOI placeholder patterns found in ${name}"
      log_warn "  Manual update may be required. Check file for citation format."
    fi
  done
}

# Function to upload a paper via zenodo_upload.py
upload_paper() {
  local num=$1
  local path
  path=$(get_paper_path "$num")
  local name="${PAPER_NAMES[$((num-1))]}"
  
  if [[ ! -f "${path}" ]]; then
    log_warn "  Skipping ${name}: file not found"
    return 1
  fi
  
  if [[ "${DRY_RUN}" == true ]]; then
    log_info "  [DRY RUN] Would upload: ${name}"
    log_info "  [DRY RUN] File: ${path}"
    log_info "  [DRY RUN] Command: python3 ${ZENODO_UPLOAD_SCRIPT} ${path}"
    return 0
  fi
  
  log_info "  Uploading: ${name}"
  
  # Call zenodo_upload.py with the paper path
  # The script should handle metadata extraction and upload
  if python3 "${ZENODO_UPLOAD_SCRIPT}" "${path}"; then
    log_info "  ✓ Uploaded: ${name}"
    return 0
  else
    log_error "  ✗ Failed to upload: ${name}"
    return 1
  fi
}

# Main execution
log_info "========================================"
log_info "  Zenodo Upload Pipeline"
log_info "========================================"
echo ""
log_info "Research directory: ${RESEARCH_DIR}"
log_info "Papers directory:   ${PAPER_DIR}"
log_info "Paper XII DOI:      ${XII_DOI}"
log_info "Dry run:            ${DRY_RUN}"
log_info "Skip held papers:   ${SKIP_HELD}"
log_info "Upload script:      ${ZENODO_UPLOAD_SCRIPT}"
echo ""

# Step 0: Scan and report paper availability
PAPER_STATUS=$(scan_papers)
echo ""

# Step 1: Verify Paper XII exists
if ! check_paper_xii; then
  log_error "Cannot proceed without Paper XII"
  exit 1
fi
echo ""

# Step 2: Update DOI references in Paper XI and XIX
if [[ "${DRY_RUN}" == true ]]; then
  log_info "Would update DOI references (dry run mode)"
else
  update_doi_references "${XII_DOI}"
fi
echo ""

# Step 3: Upload papers in order (I-XII, XIV-XVII)
log_step "Uploading papers I-XII, XIV-XVII"
echo ""

upload_failures=0

# Upload Papers I through XII
for i in $(seq 1 12); do
  if ! upload_paper "$i"; then
    ((upload_failures++))
  fi
done

# Upload Papers XIV through XVII
for i in 14 15 16 17; do
  if ! upload_paper "$i"; then
    ((upload_failures++))
  fi
done

echo ""

# Step 4: Upload held papers if not skipped
if [[ "${SKIP_HELD}" == false ]]; then
  log_step "Uploading held papers (XIII, XVIII, XX)"
  log_warn "These papers are legally risky (DUNA/DAO claims, untested in courts)"
  echo ""
  
  for i in 13 18 20; do
    if ! upload_paper "$i"; then
      ((upload_failures++))
    fi
  done
else
  log_info "Skipping held papers (XIII, XVIII, XX) as requested"
fi

echo ""
log_info "========================================"
log_info "  Pipeline Complete"
log_info "========================================"
log_info "Upload failures: ${upload_failures}"

if [[ "${DRY_RUN}" == true ]]; then
  log_info "This was a dry run - no actual uploads were performed"
  log_info "Run without --dry-run to execute uploads"
fi

exit ${upload_failures}
