<<<<<<< HEAD
#!/usr/bin/env bash
# WCD-06: SIGNED — P31-OQE <2026-06-18> — T-0 SCRAM valve (abdicate.sh)
# abdicate.sh — Emotional Packet Retirement (SOULSAFE Kenosis Protocol v0.1)
# Retires an emotional packet by writing an immutable tombstone and logging the event.
# This is the lightweight CORE-LOCAL protocol.
# For cryptographic governance abdication, see crypto-kenosis scripts in admin/.
#
# Usage:
#   ./abdicate.sh --packet-id <UUID> --reason <string> [--tombstone <path>]
#
# Exit codes:
#   0  Success
#   1  Missing or invalid arguments
#   2  Tombstone directory creation failure
#   3  Tombstone write failure
#   4  Health log write failure

set -euo pipefail

PACKET_ID=""
REASON=""
TOMBSTONE_DIR="/home/p31/.p31/cognitive-passport"

usage() {
  echo "Usage: $0 --packet-id <UUID> --reason <string> [--tombstone <path>]"
  echo "  --packet-id   Unique identifier for the emotional packet"
  echo "  --reason      Free-text reason for retirement"
  echo "  --tombstone   Override tombstone directory (default: .p31/cognitive-passport)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --packet-id) PACKET_ID="$2"; shift 2 ;;
    --reason)    REASON="$2"; shift 2 ;;
    --tombstone) TOMBSTONE_DIR="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

if [[ -z "$PACKET_ID" || -z "$REASON" ]]; then
  echo "Error: --packet-id and --reason are required."
  usage
fi

if [[ ! "$PACKET_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "Error: packet-id must be alphanumeric with dashes/underscores only."
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SESSION_ID="${USER:-unknown}-$(hostname)-$(date +%s)"
TOMBSTONE_FILE="${TOMBSTONE_DIR}/${PACKET_ID}.abdicate"

if [[ ! -d "$TOMBSTONE_DIR" ]]; then
  if ! mkdir -p "$TOMBSTONE_DIR" 2>/dev/null; then
    echo "Error: Cannot create tombstone directory: $TOMBSTONE_DIR"
    exit 2
  fi
fi

TMPFILE=$(mktemp "${TOMBSTONE_FILE}.tmp.XXXXXX")
trap 'rm -f "$TMPFILE"' EXIT

cat > "$TMPFILE" <<EOF
# ABDICATION TOMBSTONE
packet_id:   ${PACKET_ID}
reason:      "${REASON}"
timestamp:   ${TIMESTAMP}
session_id:  ${SESSION_ID}
status:      ABDICATED
operator:    ${USER:-unknown}
host:        $(hostname)
pwd:         $(pwd)
shell:       ${SHELL:-unknown}
EOF

if ! mv "$TMPFILE" "$TOMBSTONE_FILE" 2>/dev/null; then
  echo "Error: Cannot write tombstone: $TOMBSTONE_FILE"
  exit 3
fi

trap - EXIT

HEALTH_LOG="/home/p31/.p31/health.jsonl"
ABDICATE_EVENT=$(cat <<EOJSON
{"ts":"${TIMESTAMP}","event":"abdicate","packet_id":"${PACKET_ID}","reason":"${REASON}","session":"${SESSION_ID}"}
EOJSON
)

if ! echo "$ABDICATE_EVENT" >> "$HEALTH_LOG" 2>/dev/null; then
  echo "Warning: Tombstone written but health log update failed."
  exit 4
fi

echo "KENOSIS COMPLETE — ${PACKET_ID} retired at ${TIMESTAMP}"
echo "Tombstone: ${TOMBSTONE_FILE}"
exit 0
=======
#!/bin/bash
# scripts/abdicate.sh
# 🔺 P31 LABS: ABDICATION PROTOCOL & CRYPTOGRAPHIC KENOSIS

set -e

echo "🔺 INITIATING P31 ABDICATION CEREMONY..."
echo "WARNING: THIS ACTION IS IRREVERSIBLE AND ENFORCES FULL AUTOPOIESIS."
sleep 5

# 1. Volatile Initialization: Mount tmpfs RAM disk
echo "[1/5] Mounting volatile tmpfs RAM disk for ephemeral key generation..."
sudo mount -t tmpfs -o size=50M tmpfs /mnt/ramdisk

# Generate ephemeral OpenSSL RSA deployer key 
echo "[2/5] Generating ephemeral cryptographic material..."
openssl ecparam -name secp256k1 -genkey -noout -out /mnt/ramdisk/deployer_key.pem
DEPLOY_PKEY=$(openssl ec -in /mnt/ramdisk/deployer_key.pem -text -noout 2>/dev/null | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | sed 's/^00//')

# 2. Constitutional Deployment via Forge
echo "[3/5] Compiling and deploying GODConstitution.sol to the network..."
CONTRACT_ADDRESS=$(forge create contracts/GODConstitution.sol:GODConstitution \
    --private-key $DEPLOY_PKEY \
    --json | jq -r .deployedTo)

echo "Constitution deployed to: $CONTRACT_ADDRESS"

# 3. Renunciation of Authority
echo "[4/5] Executing abdicatePower(). Burning executive authority..."
cast send $CONTRACT_ADDRESS "abdicatePower()" \
    --private-key $DEPLOY_PKEY

# 4. Hardware Locking: Burn ESP32-S3 eFuses
echo "[5/5] Burning Node One ESP32-S3 eFuses. Enforcing Secure Boot V2 and disabling JTAG..."
# Requires Node One to be connected via serial
espefuse.py burn_efuse DIS_JTAG 1
espefuse.py burn_efuse DIS_USB_JTAG 1
espefuse.py burn_efuse SECURE_BOOT_EN 1

# 5. Cryptographic Shredding
echo "🔺 Shredding ephemeral keys from RAM disk..."
shred -u -z -n 3 /mnt/ramdisk/deployer_key.pem

echo "Unmounting RAM disk..."
sudo umount /mnt/ramdisk

echo "🟢 KENOSIS COMPLETE. THE ARCHITECT IS ELIMINATED AS A CENTRAL POINT OF FAILURE."
echo "MANUAL POWER CYCLE REQUIRED IMMEDIATELY."
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
