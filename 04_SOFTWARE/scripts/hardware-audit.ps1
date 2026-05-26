# CHUMP for CHANGE - Hardware Audit (Windows)
# Evaluates host machine for DePIN capabilities

Write-Host "=========================================="
Write-Host "  CHUMP DePIN Hardware Audit (Windows)    "
Write-Host "=========================================="

Write-Host "[*] System Information:"
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
Write-Host "    OS: $($os.Caption) $($os.Version)"
Write-Host "    Host: $($cs.Manufacturer) $($cs.Model)"
Write-Host "    CPU: $($cs.NumberOfProcessors) physical, $($cs.NumberOfLogicalProcessors) logical"

Write-Host "[*] Memory Allocation:"
$ram = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
$avail = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
Write-Host "    Total RAM: ${ram}GB (Available: ${avail}MB/$([math]::Round($avail/1024,1))GB)"

Write-Host "[*] Storage Capacity (Storj Node Viability):"
Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $total = [math]::Round($_.Size / 1GB, 1)
    $free = [math]::Round($_.FreeSpace / 1GB, 1)
    $pct = [math]::Round(($_.Size - $_.FreeSpace) / $_.Size * 100, 0)
    Write-Host "    $($_.DeviceID) $total`GB total, ${free}GB free (${pct}% used)"
}
Write-Host "    Checking disk types (SSD/HDD):"
Get-PhysicalDisk | ForEach-Object {
    $type = if ($_.MediaType -eq 4) {"SSD"} elseif ($_.MediaType -eq 3) {"HDD"} else {"Unknown($($_.MediaType))"}
    $size = [math]::Round($_.Size / 1GB, 0)
    Write-Host "    $($_.FriendlyName): ${type} — ${size}GB"
}

Write-Host "[*] GPU / Compute (Render/AI Viability):"
$gpus = Get-CimInstance Win32_VideoController
if ($gpus) {
    $gpus | ForEach-Object {
        $vram = [math]::Round($_.AdapterRAM / 1GB, 1)
        Write-Host "    GPU: $($_.Name) — VRAM: ${vram}GB | Driver: $($_.DriverVersion)"
    }
} else {
    Write-Host "    No GPU detected (CPU-only tier)"
}

Write-Host "[*] Network Latency:"
$ping = Test-Connection -ComputerName 8.8.8.8 -Count 3 -ErrorAction SilentlyContinue
if ($ping) {
    $avg = [math]::Round(($ping | Measure-Object -Property ResponseTime -Average).Average, 1)
    Write-Host "    Average Latency (to Google): ${avg}ms"
} else {
    Write-Host "    Ping failed (offline?)"
}

Write-Host "[*] Docker Status:"
$dockerOk = $false
try { $dockerVer = docker --version 2>$null; $dockerOk = $true } catch {}
if ($dockerOk) {
    $containers = docker ps -q 2>$null | Measure-Object | Select-Object -ExpandProperty Count
    Write-Host "    Docker: Available ($containers running containers)"
} else {
    Write-Host "    Docker: Not available"
}

Write-Host "=========================================="
Write-Host "  Audit Complete."
Write-Host "=========================================="
