# P31 Labs — Status update (Windows). Same contract as update-status.sh (CWP-043).
# Usage: .\update-status.ps1 [path\to\status.json]

param(
  [string] $StatusFile = (Join-Path $PSScriptRoot 'status.json')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $StatusFile)) {
  Write-Error "Status file not found: $StatusFile"
}

$repoRoot = (& git -C $PSScriptRoot rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
}
$envFile = Join-Path $repoRoot '.env.master'
if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Error ".env.master not found at $envFile"
}

$null = Get-Content -LiteralPath $StatusFile -Raw -Encoding UTF8 | ConvertFrom-Json

$tokenLine = Select-String -LiteralPath $envFile -Pattern '^COMMAND_CENTER_STATUS_TOKEN=' | Select-Object -First 1
if (-not $tokenLine) { Write-Error "COMMAND_CENTER_STATUS_TOKEN not found in $envFile" }
$token = ($tokenLine.Line -split '=', 2)[1].Trim()

$body = Get-Content -LiteralPath $StatusFile -Raw -Encoding UTF8
$uri = 'https://command-center.trimtab-signal.workers.dev/api/status'

Write-Host "Pushing $StatusFile to command-center..."
$response = Invoke-WebRequest -Uri $uri -Method POST -UseBasicParsing `
  -Headers @{
    Authorization = "Bearer $token"
    'Content-Type' = 'application/json'
  } -Body $body

if ($response.StatusCode -eq 200) {
  Write-Host "Status updated successfully"
  Write-Host "  Dashboard: https://command-center.trimtab-signal.workers.dev"
} else {
  Write-Error "Failed: HTTP $($response.StatusCode) $($response.Content)"
}
