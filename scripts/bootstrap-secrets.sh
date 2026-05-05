#!/usr/bin/env bash
# P31 — Worker Secrets Bootstrap
# Sets all Cloudflare Worker secrets for Phase 2 edge services.
# Reads from .env.master if present; prompts for any missing values.
# Run once per deployment environment.

set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"

G='\033[0;32m' Y='\033[1;33m' C='\033[0;36m' R='\033[0;31m' N='\033[0m'
ok()   { echo -e "${G}  ✓${N} $1"; }
warn() { echo -e "${Y}  ⚠${N} $1"; }
die()  { echo -e "${R}  ✗${N} $1"; exit 1; }
hdr()  { echo -e "\n${C}── $1 ──────────────────────────────────${N}"; }

# ── Locate wrangler ──────────────────────────────────────────────────────────
WRANGLER="$(command -v wrangler 2>/dev/null || echo "")"
if [ -z "$WRANGLER" ]; then
  WRANGLER="$(cd "$REPO/04_SOFTWARE/p31ca" && npx --yes wrangler --version >/dev/null 2>&1 && echo "npx wrangler")"
  [ -n "$WRANGLER" ] || die "wrangler not found — npm install -g wrangler"
fi
ok "wrangler: $WRANGLER $(${WRANGLER} --version 2>/dev/null | head -1 || true)"

# ── Load .env.master ─────────────────────────────────────────────────────────
for f in "$REPO/.env.master" "$REPO/04_SOFTWARE/.env.master" "/home/p31/.env.master"; do
  if [ -f "$f" ]; then
    set -a; source "$f"; set +a
    ok "Loaded secrets from $f"
    break
  fi
done

# ── Helper: set one secret ────────────────────────────────────────────────────
set_secret() {
  local worker_dir="$1"
  local secret_name="$2"
  local env="${3:-production}"
  local val="${!secret_name:-}"

  if [ -z "$val" ] && [ -t 0 ] && [ -t 1 ]; then
    echo -ne "  ${Y}${secret_name}${N} (hidden): "
    read -rs val
    echo ""
  fi

  if [ -z "$val" ]; then
    warn "$secret_name not set — skipping (set manually: cd $worker_dir && ${WRANGLER} secret put $secret_name)"
    return
  fi

  (cd "$worker_dir" && echo "$val" | ${WRANGLER} secret put "$secret_name" --env "$env" 2>&1 \
    | grep -qE "Success|already|Updated" && ok "$secret_name → $worker_dir") \
    || warn "$secret_name set failed in $worker_dir"
}

# ── Helper: set secret with no env flag (legacy workers) ─────────────────────
set_secret_noenv() {
  local worker_dir="$1"
  local secret_name="$2"
  local val="${!secret_name:-}"

  if [ -z "$val" ] && [ -t 0 ] && [ -t 1 ]; then
    echo -ne "  ${Y}${secret_name}${N} (hidden): "
    read -rs val
    echo ""
  fi

  if [ -z "$val" ]; then
    warn "$secret_name not set — skipping"
    return
  fi

  (cd "$worker_dir" && echo "$val" | ${WRANGLER} secret put "$secret_name" 2>&1 \
    | grep -qE "Success|already|Updated" && ok "$secret_name → $worker_dir") \
    || warn "$secret_name set failed"
}

# ── Q-Factor Coherence Worker ─────────────────────────────────────────────────
hdr "Q-Factor Worker (api.p31ca.org/qfactor/*)"
QF="$REPO/04_SOFTWARE/cloudflare-worker/q-factor"
set_secret "$QF" "P31_API_SECRET"
set_secret "$QF" "P31_FHIR_SECRET"

# ── FHIR Worker (api.p31ca.org/fhir/*) ───────────────────────────────────────
hdr "FHIR Worker (api.p31ca.org/fhir/*)"
FHIR="$REPO/04_SOFTWARE/p31ca/workers/fhir"
if [ -d "$FHIR" ]; then
  set_secret "$FHIR" "EPIC_CLIENT_ID"
  set_secret "$FHIR" "EPIC_CLIENT_SECRET"
  set_secret "$FHIR" "HA_WEBHOOK_CRITICAL"
  set_secret "$FHIR" "HA_WEBHOOK_WARNING"
  set_secret "$FHIR" "P31_API_SECRET"
else
  warn "FHIR worker dir not found at $FHIR"
fi

# ── Buffer Worker ─────────────────────────────────────────────────────────────
hdr "Buffer Worker"
BUF_DIRS=(
  "$REPO/04_SOFTWARE/p31ca/workers/buffer"
  "$REPO/04_SOFTWARE/cloudflare-worker/buffer"
)
for d in "${BUF_DIRS[@]}"; do
  if [ -d "$d" ] && [ -f "$d/wrangler.toml" ]; then
    set_secret "$d" "P31_API_SECRET"
    break
  fi
done

# ── Home Assistant MQTT bridge token ─────────────────────────────────────────
hdr "HA long-lived access token (for Meshtastic bridge)"
MQTT_CONF="$REPO/05_FIRMWARE/meshtastic/ha-mqtt-bridge.yaml"
if [ -f "$MQTT_CONF" ] && grep -q "REPLACE_HA_LONG_LIVED_TOKEN" "$MQTT_CONF"; then
  HA_TOKEN="${HA_LONG_LIVED_TOKEN:-}"
  if [ -z "$HA_TOKEN" ] && [ -t 0 ] && [ -t 1 ]; then
    echo -e "  ${Y}HA long-lived token${N} (Profile → Security → Long-Lived Access Tokens):"
    echo -ne "  Token (hidden): "
    read -rs HA_TOKEN
    echo ""
  fi
  if [ -n "$HA_TOKEN" ]; then
    sed -i.bak "s|REPLACE_HA_LONG_LIVED_TOKEN|$HA_TOKEN|" "$MQTT_CONF"
    rm -f "${MQTT_CONF}.bak"
    ok "HA token injected into ha-mqtt-bridge.yaml"
  else
    warn "HA token not set — bridge will fail to authenticate"
  fi
else
  ok "ha-mqtt-bridge.yaml already configured"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${G}═══ Secrets bootstrap complete ═══${N}"
echo ""
echo -e "  ${C}Still manual (requires physical device):${N}"
echo -e "  1. Epic FHIR auth:   https://api.p31ca.org/fhir/auth  (iPhone Safari)"
echo -e "  2. eSIM:             iPhone → Settings → Cellular → Add eSIM → US Mobile Warp"
echo -e "  3. Meshtastic flash: meshtastic --configure 05_FIRMWARE/meshtastic/p31-mesh-config.yaml"
echo -e "  4. Matrix VPS:       bash scripts/provision-matrix-vps.sh  (needs HETZNER_API_TOKEN)"
echo ""
