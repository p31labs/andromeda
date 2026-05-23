# P31 DELTA Ecosystem - Monorepo Consolidation & Purge Script
# Warning: This script permanently deletes legacy duplicated packages to enforce the v3.0.0 architecture.

Write-Host "🌌 Initiating P31 Topology Enforcement (v3.0.0)"
Write-Host "------------------------------------------------"

# 1. Relocate p31-smallball into the family-apps cluster
Write-Host "[1/4] Relocating p31-smallball into K4 structure..."
New-Item -ItemType Directory -Force -Path "packages/family-apps"
if (Test-Path "p31-smallball") {
    Move-Item -Path "p31-smallball" -Destination "packages/family-apps/p31-smallball" -Force
}
Write-Host "  -> Relocation complete."

# 2. Purge Duplicated "prod" and "-1-" artifact packages
Write-Host "[2/4] Purging transducer duplicates..."
$toRemove = @(
    "p31-arcade-hub-static",
    "p31-smallball-prod",
    "p31-gridiron-prod",
    "p31-gridiron-1-",
    "p31-geodesicbuilder-1-",
    "p31-liquidsculptor-1-",
    "p31-resonancerings-1-",
    "p31-cardtable-1-",
    "p31-magnetic-poetry-1-"
)
foreach ($dir in $toRemove) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "  Removed: $dir"
    }
}
Write-Host "  -> Duplicates purged."

# 3. Quarantining/Removing the 04_Archives
Write-Host "[3/4] Eradicating legacy 04_Archives cluster..."
if (Test-Path "04_Archives/p31_final") {
    Remove-Item -Path "04_Archives/p31_final" -Recurse -Force
}
Write-Host "  -> Archives eradicated."

# 4. Enforce pnpm workspace sync
Write-Host "[4/4] Syncing pnpm lockfile..."
pnpm install --no-frozen-lockfile

Write-Host "------------------------------------------------"
Write-Host "✅ ENFORCEMENT COMPLETE. THE METAL IS SECURE."
