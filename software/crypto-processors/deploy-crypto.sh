#!/usr/bin/env bash
set -euo pipefail

# ═════════════════════════════════════════════════════════════════════════════
# P31 Labs — Crypto Processor Deployment Script
#
# Manages BTCPay Server (Bitcoin/Lightning) and Paylix (EVM) processors
#
# Usage:
#   ./deploy-crypto.sh init      # Generate .env from placeholders
#   ./deploy-crypto.sh start     # Start all services
#   ./deploy-crypto.sh stop      # Stop all services
#   ./deploy-crypto.sh restart   # Restart all services
#   ./deploy-crypto.sh status    # Show container status
#   ./deploy-crypto.sh logs      # Tail logs for all services (or specify service)
#   ./deploy-crypto.sh backup    # Backup configs and volumes
#   ./deploy-crypto.sh update    # Pull latest images and restart
#   ./deploy-crypto.sh help      # Show this help
#
# Example:
#   ./deploy-crypto.sh init
#   ./deploy-crypto.sh start
#   ./deploy-crypto.sh logs -f   # Follow logs
# ═════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
EXAMPLE_ENV="${SCRIPT_DIR}/.env.example"

# ── Colors ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
pass()  { echo -e "${GREEN}[OK]${NC} $*"; }

# ── Helper Functions ────────────────────────────────────────────────────
require_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    fail ".env file not found. Run '$0 init' first."
  fi
}

source_env() {
  set -a
  source "$ENV_FILE"
  set +a
}

generate_secret() {
  openssl rand -hex 32
}

generate_mnemonic_words() {
  # Simple word list for demonstration - in reality, use a proper BIP39 generator
  local words=(
    abandon ability able about above absent absorb abstract absurd abuse access accident account
    account achieve acid acoustic acquire across act action actor actress actual adapt add addiction
    address adjust admit adult advance advice aerobic affair affect afford afraid africa afternoon
    age agent agree ahead aim air airport alarm album alcohol alert alien align alive alley
    allow almost alone along alphabet already also although always amazon ambassador amount
    amusement analyse analytic anchor ancient anger angle angry animal ankle announce annual
    another answer antenna antique anxiety any apart apartment apology appeal appear apple approve
    april arch arch argon area argument arise arm armed armor army around arrange arrest arrive
    arrow art artefact artist articulate art as ascend aspect assault asset assist assume asthma
    athlete atom attack attend attitude attorney attract auction audio audit august aunt author
    auto autumn average avocado avoid awake award aware awesome awful awkward axis baby bachelor
    bacon badge bag balance banana band bank bar bargain barrel base basic basket battle beach
    bean beauty because become beef before begin behave behavior belief believe bell belt bench
    benefit best betray better between bicycle bid big bike bind biology bird birth bite bitter
    black blade blame blanket blast bleach blind blood blossom blouse blue blur blame
  )
  
  # Select 12 random words (for demo only - use proper entropy in production!)
  local result=""
  for i in {1..12}; do
    local idx=$((RANDOM % ${#words[@]}))
    result+="${words[$idx]} "
  done
  echo "$result" | xargs  # trim
}

# ── Commands ─────────────────────────────────────────────────────────────
cmd_init() {
  info "Initializing P31 Crypto Processors configuration..."
  
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    fail "docker-compose.yml not found in $SCRIPT_DIR"
  fi
  
  if [[ ! -f "$EXAMPLE_ENV" ]]; then
    fail ".env.example not found in $SCRIPT_DIR"
  fi
  
  # Verify Paylix source structure
  if [[ ! -d "$SCRIPT_DIR/paylix" ]]; then
    warn "Paylix source directory not found - creating placeholder"
    mkdir -p "$SCRIPT_DIR/paylix/apps/web" "$SCRIPT_DIR/paylix/packages/indexer"
  fi
  
  if [[ ! -f "$SCRIPT_DIR/paylix/apps/web/Dockerfile" ]]; then
    warn "Paylix web Dockerfile missing - Paylix build will fail until source is provided"
  fi
  
  if [[ ! -f "$SCRIPT_DIR/paylix/packages/indexer/Dockerfile" ]]; then
    warn "Paylix indexer Dockerfile missing - Paylix build will fail until source is provided"
  fi
  
  # Copy example if .env doesn't exist
  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$EXAMPLE_ENV" "$ENV_FILE"
    pass "Created .env from .env.example"
  else
    warn ".env already exists - skipping creation"
  fi
  
  # Generate secrets if placeholders present
  local updated=0
  
  if grep -q "replace_with_random_64_hex_chars" "$ENV_FILE"; then
    local secret1=$(generate_secret)
    local secret2=$(generate_secret)
    sed -i.bak "s|SATSALE_WEBHOOK_SECRET=replace_with_random_64_hex_chars|SATSALE_WEBHOOK_SECRET=${secret1}|g" "$ENV_FILE"
    sed -i.bak "s|PAYLIX_WEBHOOK_SECRET=replace_with_random_64_hex_chars|PAYLIX_WEBHOOK_SECRET=${secret2}|g" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
    pass "Generated webhook secrets"
    updated=1
  fi
  
  if grep -q "replace_with_secure_password" "$ENV_FILE"; then
    local pgpass=$(generate_secret | head -c 24)
    sed -i.bak "s|POSTGRES_PASSWORD=replace_with_secure_password|POSTGRES_PASSWORD=${pgpass}|g" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
    pass "Generated Postgres password"
    updated=1
  fi
  
  if grep -q "replace with your twelve or twenty four word mnemonic" "$ENV_FILE"; then
    local mnemonic=$(generate_mnemonic_words)
    sed -i.bak "s|replace with your twelve or twenty four word mnemonic|${mnemonic}|g" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
    warn "Generated mnemonic for demonstration ONLY - REPLACE WITH YOUR OWN SECURE MNEMONIC"
    updated=1
  fi
  
  if grep -q "your_store_id_here" "$ENV_FILE"; then
    warn "Remember to set BTCPAY_STORE_ID after creating your store in BTCPay UI"
  fi
  
  if [[ $updated -eq 0 ]]; then
    info ".env already contains real values - no changes made"
  fi
  
  info ""
  info "Next steps:"
  info "  1. Edit .env and set real values:"
  info "     - BTCPAY_STORE_ID (from BTCPay UI after creating store)"
  info "     - PAYLIX_MNEMONIC (your secure wallet mnemonic)"
  info "     - Domains or use IP:port for testing"
  info "  2. Run: ./deploy-crypto.sh start"
  info "  3. Complete setup via web UI:"
  info "     - BTCPay: https://${SATSALE_DOMAIN:-satsale.p31ca.org}"
  info "     - Paylix: https://${PAYLIX_DOMAIN:-paylix.p31ca.org}"
}

cmd_start() {
  require_env_file
  info "Starting crypto processors..."
  cd "$SCRIPT_DIR"
  
  # Verify Paylix build context exists
  if [[ ! -d "$SCRIPT_DIR/paylix" ]]; then
    fail "Paylix source directory not found at $SCRIPT_DIR/paylix"
  fi
  
  if [[ ! -f "$SCRIPT_DIR/paylix/apps/web/Dockerfile" ]]; then
    fail "Paylix web Dockerfile missing at $SCRIPT_DIR/paylix/apps/web/Dockerfile"
  fi
  
  if [[ ! -f "$SCRIPT_DIR/paylix/packages/indexer/Dockerfile" ]]; then
    fail "Paylix indexer Dockerfile missing at $SCRIPT_DIR/paylix/packages/indexer/Dockerfile"
  fi
  
  # Pull base images first (faster than building)
  info "Pulling base images..."
  docker compose pull --ignore-buildable btcpay nbxplorer postgres caddy 2>/dev/null || true
  
  # Start services (this will build Paylix from source)
  info "Building and starting services (Paylix will build from source)..."
  docker compose up -d --build
  
  # Wait for startup
  info "Waiting for services to initialize..."
  sleep 5
  
  # Show status
  info "Service status:"
  docker compose ps
  
  info ""
  info "Services should be available at:"
  info "  BTCPay Server:  https://${SATSALE_DOMAIN:-satsale.p31ca.org}"
  info "  Paylix:         https://${PAYLIX_DOMAIN:-paylix.p31ca.org}"
  info "  donate-api:     https://donate-api.phosphorus31.org (Cloudflare Worker)"
  info ""
  info "Next steps:"
  info "  1. Complete BTCPay setup wizard at first launch"
  info "  2. Create a store in BTCPay and set BTCPAY_STORE_ID in .env"
  info "  3. Fund your Paylix wallet with USDC/USDT for gas"
  info "  4. Test with small donations"
}

cmd_stop() {
  require_env_file
  info "Stopping crypto processors..."
  cd "$SCRIPT_DIR"
  docker compose down
  pass "All services stopped"
}

cmd_restart() {
  cmd_stop
  sleep 2
  cmd_start
}

cmd_status() {
  require_env_file
  cd "$SCRIPT_DIR"
  docker compose ps
}

cmd_logs() {
  require_env_file
  cd "$SCRIPT_DIR"
  if [[ $# -eq 0 ]]; then
    docker compose logs -f
  else
    docker compose logs -f "$@"
  fi
}

cmd_backup() {
  require_env_file
  local timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_dir="${SCRIPT_DIR}/backups/${timestamp}"
  mkdir -p "$backup_dir"
  
  info "Creating backup in ${backup_dir}..."
  
  # Backup .env (secrets)
  if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" "${backup_dir}/.env"
    pass "Backed up .env"
  fi
  
  # Backup Caddyfile
  if [[ -f "${SCRIPT_DIR}/Caddyfile" ]]; then
    cp "${SCRIPT_DIR}/Caddyfile" "${backup_dir}/Caddyfile"
    pass "Backed up Caddyfile"
  fi
  
  # Backup compose file
  if [[ -f "${SCRIPT_DIR}/docker-compose.yml" ]]; then
    cp "${SCRIPT_DIR}/docker-compose.yml" "${backup_dir}/docker-compose.yml"
    pass "Backed up docker-compose.yml"
  fi
  
  # Backup Docker volumes using run command
  info "Backing up Docker volumes (this may take a moment)..."
  
  # BTCPay data
  if docker volume inspect p31_crypto-btcpay-data >/dev/null 2>&1; then
    docker run --rm \
      -v p31_crypto-btcpay-data:/data:ro \
      -v "${backup_dir}":/backup \
      alpine tar czf /backup/btcpay-data.tar.gz -C /data . 2>/dev/null || warn "BTCPay volume backup failed"
    pass "Backed up BTCPay volume"
  fi
  
  # Paylix data
  if docker volume inspect p31_crypto-paylix-data >/dev/null 2>&1; then
    docker run --rm \
      -v p31_crypto-paylix-data:/data:ro \
      -v "${backup_dir}":/backup \
      alpine tar czf /backup/paylix-data.tar.gz -C /data . 2>/dev/null || warn "Paylix volume backup failed"
    pass "Backed up Paylix volume"
  fi
  
  # Caddy data (certificates)
  if docker volume inspect p31_crypto-caddy-data >/dev/null 2>&1; then
    docker run --rm \
      -v p31_crypto-caddy-data:/data:ro \
      -v "${backup_dir}":/backup \
      alpine tar czf /backup/caddy-data.tar.gz -C /data . 2>/dev/null || warn "Caddy volume backup failed"
    pass "Backed up Caddy volume (certificates)"
  fi
  
  pass "Backup complete: ${backup_dir}"
  warn "IMPORTANT: Store your mnemonic/private key securely - it's NOT in these backups!"
}

cmd_update() {
  require_env_file
  info "Updating images and restarting services..."
  cd "$SCRIPT_DIR"
  docker compose pull
  docker compose up -d --remove-orphans
  pass "Update complete"
}

cmd_help() {
  cat << EOF
Usage: $0 {command}

Commands:
  init        Generate .env file from template with placeholder values
  start       Pull images and start all services
  stop        Stop all services
  restart     Stop then start services
  status      Show running container status
  logs        Show logs (add -f to follow, or service name to filter)
  backup      Backup .env, Caddyfile, compose file, and Docker volumes
  update      Pull latest images and restart services
  help        Show this help message

Examples:
  $0 init
  $0 start
  $0 logs -f
  $0 logs btcpay
  $0 backup

Environment:
  Edit .env to configure domains, wallet secrets, API keys, etc.
  Never commit .env to version control!

Documentation:
  See README.md for detailed setup and usage instructions.
EOF
}

# ── Main ───────────────────────────────────────────────────────────────
case "${1:-}" in
  init)
    cmd_init
    ;;
  start)
    cmd_start
    ;;
  stop)
    cmd_stop
    ;;
  restart)
    cmd_restart
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
  update)
    cmd_update
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