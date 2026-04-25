#!/bin/bash
# K4 Cage Messaging - Production Deployment Script
# P31 Labs, Inc. | EIN 42-1888158

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
D1_DATABASE_NAME="p31-telemetry"
WORKER_NAME="k4-cage"
ENVIRONMENT="${ENVIRONMENT:-production}"

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
  echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
  echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}" >&2
}

step() {
  echo ""
  echo -e "${BLUE}═══ $1 ═══${NC}"
}

# Check prerequisites
check_prereqs() {
  step "Checking Prerequisites"
  
  if ! command -v npx &> /dev/null; then
    error "npx not found. Install Node.js first."
    exit 1
  fi
  
  if [ ! -f "$SCRIPT_DIR/wrangler.toml" ]; then
    error "wrangler.toml not found"
    exit 1
  fi
  
  log "Prerequisites check passed"
}

# Setup D1 Database
setup_d1() {
  step "Setting Up D1 Database"
  
  log "Checking if D1 database exists..."
  
  # Try to get database ID from wrangler.toml
  local db_id=$(grep -A1 '\[\[d1_databases\]\]' "$SCRIPT_DIR/wrangler.toml" | grep 'database_id' | head -1 | cut -d'=' -f2 | tr -d ' "')
  
  if [ -z "$db_id" ] || [ "$db_id" = "REPLACE_WITH_YOUR_D1_DATABASE_ID" ]; then
    warn "D1 database not configured in wrangler.toml"
    log "Creating new D1 database: $D1_DATABASE_NAME"
    
    cd "$PROJECT_ROOT"
    local output
    output=$(npx wrangler d1 create "$D1_DATABASE_NAME" 2>&1) || {
      error "Failed to create D1 database"
      exit 1
    }
    
    # Extract database ID
    db_id=$(echo "$output" | grep -oP 'database_id:\s*\K[a-f0-9-]+' | head -1)
    
    if [ -z "$db_id" ]; then
      error "Could not extract database ID from output"
      echo "$output"
      exit 1
    fi
    
    log "Created D1 database with ID: $db_id"
    
    # Update wrangler.toml
    log "Updating wrangler.toml with database ID..."
    sed -i.bak "s/database_id = \"REPLACE_WITH_YOUR_D1_DATABASE_ID\"/database_id = \"$db_id\"/" "$SCRIPT_DIR/wrangler.toml"
    
    if [ $? -ne 0 ]; then
      error "Failed to update wrangler.toml"
      error "Please manually set database_id = \"$db_id\" in wrangler.toml"
      exit 1
    fi
    
    log "wrangler.toml updated successfully"
    cd "$SCRIPT_DIR"
  else
    log "Using existing D1 database: $db_id"
  fi
  
  export D1_DATABASE_ID="$db_id"
}

# Apply database schema
apply_schema() {
  step "Applying Database Schema"
  
  if [ -z "${D1_DATABASE_ID:-}" ]; then
    error "D1_DATABASE_ID not set"
    exit 1
  fi
  
  local schema_file="$SCRIPT_DIR/schema.sql"
  
  if [ ! -f "$schema_file" ]; then
    error "Schema file not found: $schema_file"
    exit 1
  fi
  
  log "Applying schema from $schema_file..."
  
  cd "$PROJECT_ROOT"
  npx wrangler d1 execute "$D1_DATABASE_NAME" \
    --remote \
    --file="$schema_file" || {
    error "Failed to apply schema"
    exit 1
  }
  
  log "Schema applied successfully"
  cd "$SCRIPT_DIR"
}

# Deploy worker
deploy_worker() {
  step "Deploying K4-Cage Worker"
  
  cd "$PROJECT_ROOT"
  
  log "Building and deploying worker..."
  
  if npx wrangler deploy "$WORKER_NAME"; then
    log "Worker deployed successfully"
  else
    error "Worker deployment failed"
    exit 1
  fi
  
  cd "$SCRIPT_DIR"
}

# Set secrets
setup_secrets() {
  step "Configuring Secrets"
  
  local secrets=(
    "ADMIN_TOKEN"
    "INTERNAL_FANOUT_TOKEN"
    "STATUS_TOKEN"
  )
  
  for secret in "${secrets[@]}"; do
    if ! npx wrangler secret list | grep -q "^${secret}$"; then
      warn "Secret $secret not set"
      read -p "Enter value for $secret (or press Enter to skip): " value
      if [ -n "$value" ]; then
        echo "$value" | npx wrangler secret put "$secret"
        log "Set secret: $secret"
      fi
    else
      log "Secret $secret already exists"
    fi
  done
}

# Verify deployment
verify_deployment() {
  step "Verifying Deployment"
  
  local worker_url="https://$WORKER_NAME.trimtab-signal.workers.dev"
  
  log "Testing health endpoint..."
  
  local health_response
  health_response=$(curl -s -w "\n%{http_code}" "$worker_url/health" 2>/dev/null) || {
    error "Health check failed - worker may not be ready"
    return 1
  }
  
  local http_code
  http_code=$(echo "$health_response" | tail -1)
  local body
  body=$(echo "$health_response" | head -1)
  
  if [ "$http_code" = "200" ]; then
    log "Health check passed: $body"
  else
    error "Health check failed with HTTP $http_code"
    return 1
  fi
  
  log "Testing deep health (D1 connection)..."
  local deep_response
  deep_response=$(curl -s "$worker_url/api/health?deep=true" 2>/dev/null) || true
  
  if echo "$deep_response" | grep -q '"d1":true'; then
    log "D1 connection verified"
  else
    warn "D1 connection may have issues"
  fi
  
  log "Deployment verification complete"
}

# Run migrations
run_migrations() {
  step "Running Migrations"
  
  log "Checking Durable Object migrations..."
  
  cd "$PROJECT_ROOT"
  
  # Migrations are automatically applied by Cloudflare
  # This step just verifies configuration
  log "Migrations configured in wrangler.toml:"
  grep '\[\[migrations\]\]' -A2 "$SCRIPT_DIR/wrangler.toml" || true
  
  log "Migrations check complete"
  cd "$SCRIPT_DIR"
}

# Print summary
print_summary() {
  step "Deployment Summary"
  
  echo ""
  echo "  Worker:         $WORKER_NAME"
  echo "  Environment:    $ENVIRONMENT"
  echo "  D1 Database:    $D1_DATABASE_NAME"
  echo "  Database ID:    ${D1_DATABASE_ID:-not set}"
  echo ""
  echo "  Endpoints:"
  echo "    Health:       https://$WORKER_NAME.trimtab-signal.workers.dev/health"
  echo "    API:          https://$WORKER_NAME.trimtab-signal.workers.dev/api/"
  echo "    Messages:     https://$WORKER_NAME.trimtab-signal.workers.dev/messages"
  echo "    Conversations: https://$WORKER_NAME.trimtab-signal.workers.dev/conversations"
  echo ""
  echo "  Next Steps:"
  echo "    1. Test messaging API"
  echo "    2. Deploy frontend components"
  echo "    3. Configure WebSocket clients"
  echo "    4. Set up monitoring"
  echo ""
  log "Deployment script completed successfully!"
}

# Main execution
main() {
  echo ""
  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║   K4 CAGE MESSAGING - PRODUCTION DEPLOYMENT                  ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"
  echo ""
  
  # Confirm deployment
  read -p "Deploy to $ENVIRONMENT? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    log "Deployment cancelled"
    exit 0
  fi
  
  # Execute steps
  check_prereqs
  setup_d1
  apply_schema
  run_migrations
  deploy_worker
  setup_secrets
  verify_deployment
  print_summary
}

# Run main
main "$@"
