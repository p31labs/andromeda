#!/bin/bash
# P31 DELTA Ecosystem - Monorepo Consolidation & Purge Script
# Warning: This script permanently deletes legacy duplicated packages to enforce the v3.0.0 architecture.

echo "🌌 Initiating P31 Topology Enforcement (v3.0.0)"
echo "------------------------------------------------"

# 1. Relocate p31-smallball into the family-apps cluster
echo "[1/4] Relocating p31-smallball into K4 structure..."
mkdir -p packages/family-apps/
mv p31-smallball packages/family-apps/p31-smallball
echo "  -> Relocation complete."

# 2. Purge Duplicated "prod" and "-1-" artifact packages
echo "[2/4] Purging transducer duplicates..."
rm -rf p31-arcade-hub-static
rm -rf p31-smallball-prod
rm -rf p31-gridiron-prod
rm -rf p31-gridiron-1-
rm -rf p31-geodesicbuilder-1-
rm -rf p31-liquidsculptor-1-
rm -rf p31-resonancerings-1-
rm -rf p31-cardtable-1-
rm -rf p31-magnetic-poetry-1-
echo "  -> Duplicates purged."

# 3. Quarantining/Removing the 04_Archives 
# (Assuming complete removal per Sovereign design, change to 'mv' if backing up outside repo)
echo "[3/4] Eradicating legacy 04_Archives cluster..."
rm -rf 04_Archives/p31_final
echo "  -> Archives eradicated."

# 4. Enforce pnpm workspace sync
echo "[4/4] Syncing pnpm lockfile..."
pnpm install --no-frozen-lockfile

echo "------------------------------------------------"
echo "✅ ENFORCEMENT COMPLETE. THE METAL IS SECURE."