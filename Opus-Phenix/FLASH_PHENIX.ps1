<#
.SYNOPSIS
    Flash Opus Phenix firmware to ESP32-S3

.DESCRIPTION
    One-click flash script for the Phenix Phantom.
    Auto-detects COM port if not specified.

.PARAMETER Port
    COM port (e.g., COM5). Auto-detects if not provided.

.PARAMETER Environment
    PlatformIO environment. Default: phenix_phantom

.PARAMETER Erase
    Erase flash before programming (fresh start)

.EXAMPLE
    .\FLASH_PHENIX.ps1
    .\FLASH_PHENIX.ps1 -Port COM5
    .\FLASH_PHENIX.ps1 -Environment phenix_01_architect
    .\FLASH_PHENIX.ps1 -Erase
#>

param(
    [string]$Port = "",
    [string]$Environment = "phenix_phantom",
    [switch]$Erase = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   OPUS PHENIX - FLASH UTILITY                             ║" -ForegroundColor Cyan
Write-Host "║   'The geometry remains. Only the bulk vanishes.'         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Auto-detect port if not specified
if ([string]::IsNullOrEmpty($Port)) {
    Write-Host "[*] Auto-detecting ESP32-S3..." -ForegroundColor Yellow
    
    $ports = Get-WmiObject Win32_SerialPort | Where-Object {
        $_.Description -match "USB" -or 
        $_.Description -match "Serial" -or
        $_.Description -match "ESP"
    }
    
    if ($ports) {
        $Port = $ports[0].DeviceID
        Write-Host "[+] Found: $Port ($($ports[0].Description))" -ForegroundColor Green
    } else {
        Write-Host "[!] No ESP32-S3 detected. Put board in BOOT mode:" -ForegroundColor Red
        Write-Host "    1. Hold BOOT button" -ForegroundColor Yellow
        Write-Host "    2. Press and release RESET" -ForegroundColor Yellow
        Write-Host "    3. Release BOOT" -ForegroundColor Yellow
        Write-Host "    4. Run this script again" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "[*] Environment: $Environment" -ForegroundColor Cyan
Write-Host "[*] Port: $Port" -ForegroundColor Cyan
Write-Host ""

# Erase flash if requested
if ($Erase) {
    Write-Host "[*] Erasing flash (fresh start)..." -ForegroundColor Yellow
    & pio pkg exec -p tool-esptoolpy -- esptool.py --chip esp32s3 --port $Port erase_flash
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Erase failed. Is the board in BOOT mode?" -ForegroundColor Red
        exit 1
    }
    Write-Host "[+] Flash erased" -ForegroundColor Green
    Write-Host ""
}

# Build
Write-Host "[*] Building firmware..." -ForegroundColor Yellow
& pio run -e $Environment
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[+] Build complete" -ForegroundColor Green
Write-Host ""

# Flash
Write-Host "[*] Flashing to $Port..." -ForegroundColor Yellow
& pio run -e $Environment -t upload --upload-port $Port
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Flash failed. Try:" -ForegroundColor Red
    Write-Host "    1. Put board in BOOT mode" -ForegroundColor Yellow
    Write-Host "    2. Run with -Erase flag" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   FLASH COMPLETE - Press RESET to boot                    ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Offer to monitor
$monitor = Read-Host "Open serial monitor? (y/N)"
if ($monitor -eq "y" -or $monitor -eq "Y") {
    Write-Host "[*] Opening monitor (Ctrl+C to exit)..." -ForegroundColor Cyan
    & pio device monitor --port $Port --baud 115200
}

