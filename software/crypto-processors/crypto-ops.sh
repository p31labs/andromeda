#!/usr/bin/env bash
set -euo pipefail

# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
# P31 Labs — Crypto Processor Automation Suite
#
# Combines deployment, live testing, and monitoring for BTCPay Server + Paylix
#
# Usage:
#   ./crypto-ops.sh deploy [--test]      # Deploy and optionally run live tests
#   ./crypto-ops.sh test                 # Run live tests against deployed services
#   ./crypto-ops.sh monitor [MINUTES]    # Monitor service health (default: 5 min)
#   ./crypto-ops.sh deploy-and-test      # Deploy, run live tests, and report
#   ./crypto-ops.sh status               # Show current service status
#   ./crypto-ops.sh logs [SERVICE]       # Show logs (add -f to follow)
#   ./crypto-ops.sh backup               # Backup configs and volumes
#   ./crypto-ops.sh help                 # Show this help
#
# ══════════════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

# ── Colors ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
pass()  { echo -e "${GREEN}[OK]${NC} $*"; }
header() { echo -e "\n${CYAN}════════════════════════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}$1${NC}"; echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════════════${NC}\n"; }

# ── Helper Functions ────────────────────────────────────────────────────
require_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    fail ".env file not found. Run '$0 deploy --init' first."
  fi
}

source_env() {
  set -a
  source "$ENV_FILE"
  set +a
}

wait_for_service() {
  local service=$1
  local url=$2
  local timeout=${3:-60}
  local interval=5
  local elapsed=0
  
  info "Waiting for $service to be ready (timeout: ${timeout}s)..."
  
  while [[ $elapsed -lt $timeout ]]; do
    if curl -s -f "$url" >/dev/null 2>&1; then
      pass "$service is ready!"
      return 0
    fi
    sleep $interval
    ((elapsed+=interval))
    info "Still waiting... ($elapsed/$timeout seconds)"
  done
  
  fail "$service did not become ready within $timeout seconds"
  return 1
}

# ── Monitoring Function ─────────────────────────────────────────────────
cmd_monitor() {
  require_env_file
  source_env
  
  local duration=${1:-5}  # Default 5 minutes
  local interval=30       # Check every 30 seconds
  local end_time=$(($(date +%s) + duration * 60))
  
  header "MONITORING SERVICE HEALTH (${duration} minutes)"
  info "Checking services every ${interval} seconds"
  info "Monitoring will end at: $(date -d @$end_time)"
  info "Press Ctrl+C to stop early"
  
  local checks=0
  local failures=0
  
  while [[ $(date +%s) -lt $end_time ]]; do
    ((checks++))
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local status_msg="[$timestamp] Check #$checks:"
    
    # Check BTCPay Server
    if curl -s -f "https://${SATSALE_DOMAIN:-satsale.p31ca.org}/api/v1/health" >/dev/null 2>&1; then
      status_msg+=" BTCPay:✓"
    else
      status_msg+=" BTCPay:✗"
      ((failures++))
    fi
    
    # Check Paylix
    if curl -s -f "https://${PAYLIX_DOMAIN:-paylix.p31ca.org}/health" >/dev/null 2>&1; then
      status_msg+=" Paylix:✓"
    else
      status_msg+=" Paylix:✗"
      ((failures++))
    fi
    
    # Check donate-api
    if curl -s -f "https://donate-api.phosphorus31.org/health" >/dev/null 2>&1; then
      status_msg+=" donate-api:✓"
    else
      status_msg+=" donate-api:✗"
      ((failures++))
    fi
    
    echo -e "$status_msg"
    
    # If we had failures, show more detail
    if [[ $failures -gt 0 ]]; then
      warn "Detected $failures failing service(s) at $timestamp"
    fi
    
    sleep $interval
  done
  
  # Summary
  header "MONITORING COMPLETE"
  info "Total checks: $checks"
  info "Failed checks: $failures"
  if [[ $failures -eq 0 ]]; then
    pass "All services remained healthy throughout monitoring period"
  else
    warn "$failures total failure(s) detected during monitoring"
  fi
}

# ── Deployment Functions ────────────────────────────────────────────────
cmd_deploy() {
  local run_tests=false
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --test|-t) run_tests=true; shift ;;
      --init|-i) ./deploy-crypto.sh init; shift ;;
      *) warn "Unknown argument: $1"; shift ;;
    esac
  done
  
  header "DEPLOYING P31 CRYPTO PROCESSORS"
  
  # Initialize if needed
  if [[ ! -f "$ENV_FILE" ]]; then
    info "Initializing configuration..."
    ./deploy-crypto.sh init
  fi
  
  # Start services
  info "Starting services..."
  ./deploy-crypto.sh start
  
  # Wait for services to be ready
  source_env
  
  wait_for_service "BTCPay Server" "https://${SATSALE_DOMAIN:-satsale.p31ca.org}/api/v1/health" 120
  wait_for_service "Paylix" "https://${PAYLIX_DOMAIN:-paylix.p31ca.org}/health" 60
  
  pass "Deployment successful!"
  
  info "Services are available at:"
  info "  BTCPay Server:  https://${SATSALE_DOMAIN:-satsale.p31ca.org}"
  info "  Paylix:         https://${PAYLIX_DOMAIN:-paylix.p31ca.org}"
  info "  donate-api:     https://donate-api.phosphorus31.org (Cloudflare Worker)"
  
  # Run tests if requested
  if [[ "$run_tests" == true ]]; then
    header "RUNNING LIVE TESTS"
    cmd_test
  fi
}

cmd_test() {
  require_env_file
  source_env
  
  header "RUNNING LIVE TESTS AGAINST DEPLOYED SERVICES"
  
  local test_results=()
  
  # Test 1: BTCPay Server health
  info "Test 1: BTCPay Server health check"
  if curl -s -f "https://${SATSALE_DOMAIN:-satsale.p31ca.org}/api/v1/health" >/dev/null; then
    test_results+=("BTCPay Health: PASS")
    pass "BTCPay Server health check passed"
  else
    test_results+=("BTCPay Health: FAIL")
    fail "BTCPay Server health check failed"
  fi
  
  # Test 2: Paylix health
  info "Test 2: Paylix health check"
  if curl -s -f "https://${PAYLIX_DOMAIN:-paylix.p31ca.org}/health" >/dev/null; then
    test_results+=("Paylix Health: PASS")
    pass "Paylix health check passed"
  else
    test_results+=("Paylix Health: FAIL")
    fail "Paylix health check failed"
  fi
  
  # Test 3: donate-api health
  info "Test 3: donate-api health check"
  if curl -s -f "https://donate-api.phosphorus31.org/health" >/dev/null; then
    test_results+=("donate-api Health: PASS")
    pass "donate-api health check passed"
  else
    test_results+=("donate-api Health: FAIL")
    fail "donate-api health check failed"
  fi
  
  # Test 4: BTCPay invoice creation (small testnet amount if possible)
  info "Test 4: BTCPay invoice creation"
  if [[ -n "${BTCPAY_API_KEY:-}" && -n "${BTCPAY_STORE_ID:-}" ]]; then
    # Use a minimal testnet amount if we can detect testnet, otherwise use very small mainnet
    local amount=100  # 100 satoshis = $0.0003 at $30k/BTC (effectively dust)
    local currency="BTC"
    
    # Try to create an invoice - if it fails, we'll note it but not fail the whole test
    local invoice_response
    invoice_response=$(curl -s -X POST "https://${SATSALE_DOMAIN:-satsale.p31ca.org}/satSale/invoice" \
      -H "Content-Type: application/json" \
      -d "{\"amount\": $amount, \"currency\": \"$currency\"}" 2>&1) || true
    
    if echo "$invoice_response" | grep -q '"processor":"satsale"' && echo "$invoice_response" | grep -q '"payment_request":"'; then
      test_results+=("BTCPay Invoice: PASS")
      pass "BTCPay invoice creation successful"
      
      # Extract payment request for potential webhook simulation (optional)
      local payment_request
      payment_request=$(echo "$invoice_response" | grep -o '"payment_request":"[^"]*"' | cut -d'"' -f4)
      info "Payment request: $payment_request"
    else
      test_results+=("BTCPay Invoice: WARN (check config)")
      warn "BTCPay invoice creation failed - this may be expected if not fully configured"
      info "Response: $invoice_response"
    fi
  else
    test_results+=("BTCPay Invoice: SKIP (no API key/store ID)")
    warn "Skipping BTCPay invoice test - BTCPAY_API_KEY or BTCPAY_STORE_ID not set in .env"
  fi
  
  # Test 5: Paylix session creation
  info "Test 5: Paylix session creation"
  if [[ -n "${PAYLIX_API_KEY:-}" ]]; then
    local amount=10  # 10 USDC cents = $0.10 (reasonable test amount)
    local currency="USDC"
    local chain_id="137"  # Polygon
    
    local session_response
    session_response=$(curl -s -X POST "https://${PAYLIX_DOMAIN:-paylix.p31ca.org}/paylix/session" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${PAYLIX_API_KEY}" \
      -d "{\"amount\": $amount, \"currency\": \"$currency\", \"chain_id\": \"$chain_id\"}" 2>&1) || true
    
    if echo "$session_response" | grep -q '"processor":"paylix"' && echo "$session_response" | grep -q '"session_id":"'; then
      test_results+=("Paylix Session: PASS")
      pass "Paylix session creation successful"
    else
      test_results+=("Paylix Session: WARN (check config)")
      warn "Paylix session creation failed - this may be expected if not fully configured"
      info "Response: $session_response"
    fi
  else
    test_results+=("Paylix Session: SKIP (no API key)")
    warn "Skipping Paylix session test - PAYLIX_API_KEY not set in .env"
  fi
  
  # Test 6: Events endpoint
  info "Test 6: Events endpoint"
  if curl -s -f "https://donate-api.phosphorus31.org/events?limit=1" >/dev/null; then
    test_results+=("Events Endpoint: PASS")
    pass "Events endpoint accessible"
  else
    test_results+=("Events Endpoint: FAIL")
    fail "Events endpoint not accessible"
  fi
  
  # Print test summary
  header "LIVE TEST RESULTS"
  for result in "${test_results[@]}"; do
    if [[ $result == *"PASS"* ]]; then
      echo -e "${GREEN}✓ $result${NC}"
    elif [[ $result == *"FAIL"* ]]; then
      echo -e "${RED}✗ $result${NC}"
    else
      echo -e "${YELLOW}⚠ $result${NC}"
    fi
  done
  
  local pass_count=0
  local total_count=${#test_results[@]}
  
  for result in "${test_results[@]}"; do
    if [[ $result == *"PASS"* ]]; then
      ((pass_count++))
    fi
  done
  
  echo -e "\n${CYAN}Summary: $pass_count/$total_count tests passed${NC}"
  
  if [[ $pass_count -eq $total_count ]]; then
    pass "All live tests passed!"
    return 0
  else
    warn "Some tests failed or were skipped - check configuration"
    return 1
  fi
}

# ── Combined Functions ─────────────────────────────────────────────────
cmd_deploy_and_test() {
  header "DEPLOY, TEST, AND REPORT"
  cmd_deploy --test
}

cmd_status() {
  require_env_file
  source_env
  
  header "SERVICE STATUS"
  
  echo -e "${CYAN}BTCPay Server:${NC} https://${SATSALE_DOMAIN:-satsale.p31ca.org}"
  if curl -s -f "https://${SATSALE_DOMAIN:-satsale.p31ca.org}/api/v1/health" >/dev/null; then
    echo -e "  ${GREEN}UP${NC} (healthy)"
  else
    echo -e "  ${RED}DOWN${NC} (unhealthy)"
  fi
  
  echo -e "${CYAN}Paylix:${NC} https://${PAYLIX_DOMAIN:-paylix.p31ca.org}"
  if curl -s -f "https://${PAYLIX_DOMAIN:-paylix.p31ca.org}/health" >/dev/null; then
    echo -e "  ${GREEN}UP${NC} (healthy)"
  else
    echo -e "  ${RED}DOWN${NC} (unhealthy)"
  fi
  
  echo -e "${CYAN}donate-api:${NC} https://donate-api.phosphorus31.org"
  if curl -s -f "https://donate-api.phosphorus31.org/health" >/dev/null; then
    echo -e "  ${GREEN}UP${NC} (healthy)"
  else
    echo -e "  ${RED}DOWN${NC} (unhealthy)"
  fi
  
  echo -e "\n${CYAN}Environment Variables (from .env):${NC}"
  grep -E '^(SATSALE_DOMAIN|PAYLIX_DOMAIN|BTCPAY_STORE_ID|PAYLIX_MNEMONIC|PAYLIX_API_KEY|SATSALE_WEBHOOK_SECRET|PAYLIX_WEBHOOK_SECRET)=.' "$ENV_FILE" | while read -r line; do
    key=$(echo "$line" | cut -d'=' -f1)
    value=$(echo "$line" | cut -d'=' -f2-)
    # Mask sensitive values
    if [[ "$key" =~ (SECRET|KEY|MNEMONIC) ]]; then
      value="***MASKED***"
    fi
    echo -e "  $key=$value"
  done
}

cmd_logs() {
  require_env_file
  source_env
  
  if [[ $# -eq 0 ]]; then
    ./deploy-crypto.sh logs
  else
    ./deploy-crypto.sh logs "$@"
  fi
}

cmd_backup() {
  require_env_file
  source_env
  
  ./deploy-crypto.sh backup
}

cmd_help() {
  cat << EOF
Usage: $0 {command} [options]

Commands:
  deploy [--test] [--init]     Deploy services (--test runs live tests after)
  test                         Run live tests against deployed services
  monitor [MINUTES]            Monitor service health (default: 5 min)
  deploy-and-test              Deploy, run live tests, and report
  status                       Show current service status
  logs [SERVICE]               Show logs (add -f to follow, or service name)
  backup                       Backup configs and volumes
  help                         Show this help message

Live Test Features:
  - Tests BTCPay invoice creation (uses minimal BTC amount)
  - Tests Paylix session creation (uses small USDC amount)
  - Verifies health endpoints and event storage
  - Uses testnet/configurable amounts to minimize risk

Monitoring Features:
  - Checks service health every 30 seconds
  - Tracks uptime/downtime during monitoring period
  - Provides summary report with timestamps

Examples:
  $0 deploy --init --test   # Initialize config, deploy, and run live tests
  $0 deploy                 # Deploy using existing .env
  $0 test                   # Run live tests against current deployment
  $0 monitor 10             # Monitor for 10 minutes
  $0 deploy-and-test        # Deploy and run live tests
  $0 status                 # Check current health
  $0 logs -f                # Follow logs in real time
  $0 backup                 # Create backup of configs and volumes

Environment:
  Edit .env to configure domains, wallet secrets, API keys, etc.
  Never commit .env to version control!

Dependencies:
  - Docker Engine 20.10+
  - Docker Compose v2+
  - curl, jq (for health checks)
  - Existing donate-api Cloudflare Worker deployed

Documentation:
  See README.md in crypto-processors/ for detailed setup instructions.
EOF
}

# ── Main ───────────────────────────────────────────────────────────────
case "${1:-}" in
  deploy)
    shift
    cmd_deploy "$@"
    ;;
  test)
    cmd_test
    ;;
  monitor)
    shift
    cmd_monitor "$@"
    ;;
  deploy-and-test)
    cmd_deploy_and_test
    ;;
  status)
    cmd_status
    ;;
  logs)
    shift
    cmd_logs "$@"
    ;;
  backup)
    cmd_backup
    ;;
  help|--help|-h)
    cmd_help
    ;;
  *)
    echo "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac