# P31 Andromeda - Build All Family Apps
$ErrorActionPreference = "Continue"
$root = "C:\Users\sandra\Documents\P31_Andromeda"

$apps = @(
    @{ Name = "matriarch-culinary"; Path = "02_Client_or_Misc/matriarch-culinary-node/dashboard" },
    @{ Name = "fantasy-sports"; Path = "02_Client_or_Misc/fantasy-sports" },
    @{ Name = "p31-vibe-studio"; Path = "p31-vibe-studio" },
    @{ Name = "fence-pro"; Path = "02_Client_or_Misc/fence-pro" },
    @{ Name = "cashpilot"; Path = "02_Client_or_Misc/cashpilot/ui" }
)

foreach ($app in $apps) {
    $appPath = Join-Path $root $app.Path
    Write-Host "`n=== Building $($app.Name) ===" -ForegroundColor Cyan
    Write-Host "Path: $appPath"

    if (-not (Test-Path $appPath)) {
        Write-Host "PATH NOT FOUND" -ForegroundColor Red
        continue
    }

    # Check for index.html
    $indexHtml = Join-Path $appPath "index.html"
    if (-not (Test-Path $indexHtml)) {
        Write-Host "Creating index.html..." -ForegroundColor Yellow
        $mainTsx = if (Test-Path (Join-Path $appPath "src/main.tsx")) { "src/main.tsx" } elseif (Test-Path (Join-Path $appPath "src/main.jsx")) { "src/main.jsx" } else { "src/main.tsx" }
        @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>$($app.Name)</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/$mainTsx"></script>
</body>
</html>
"@ | Set-Content $indexHtml -Encoding UTF8
    }

    # Check for vite config
    $viteConfig = Join-Path $appPath "vite.config.ts"
    if (-not (Test-Path $viteConfig)) {
        $viteConfig = Join-Path $appPath "vite.config.js"
    }
    if (-not (Test-Path $viteConfig)) {
        Write-Host "Creating vite.config.ts..." -ForegroundColor Yellow
        @"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});
"@ | Set-Content (Join-Path $appPath "vite.config.ts") -Encoding UTF8
    }

    # Install deps
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    Push-Location $appPath
    pnpm install 2>&1 | Out-Null
    Pop-Location

    # Build
    Write-Host "Building..." -ForegroundColor Gray
    Push-Location $appPath
    $buildOutput = & npx vite build 2>&1
    $exitCode = $LASTEXITCODE
    Pop-Location

    if ($exitCode -eq 0 -and (Test-Path (Join-Path $appPath "dist"))) {
        $distFiles = (Get-ChildItem (Join-Path $appPath "dist") -Recurse -File).Count
        Write-Host "SUCCESS! ($distFiles files)" -ForegroundColor Green
    } else {
        Write-Host "FAILED (exit code: $exitCode)" -ForegroundColor Red
        $buildOutput | Select-Object -Last 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    }
}
