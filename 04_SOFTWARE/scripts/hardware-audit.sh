#!/bin/bash
# CHUMP for CHANGE - Hardware Audit Tool
# Evaluates host machine for DePIN capabilities (Render, Storj, etc.)

echo "=========================================="
echo "  CHUMP DePIN Hardware Audit Initialized  "
echo "=========================================="

# 1. Check OS and Architecture
echo "[*] System Information:"
uname -a | awk '{print "    OS/Arch: " $1, $2, $3, $12}'

# 2. Check RAM
echo "[*] Memory Allocation:"
free -h | awk '/^Mem:/ {print "    Total RAM: " $2 " (Available: " $7 ")"}'

# 3. Check Disk Space & Type (Looking for SSD/NVMe or high capacity)
echo "[*] Storage Capacity (Storj Node Viability):"
df -h --output=source,size,avail,pcent,target -x tmpfs -x devtmpfs | grep -v "boot" | awk '{print "    " $0}'
echo "    Checking disk types (0=SSD/NVMe, 1=HDD):"
lsblk -d -o name,rota | grep -v "loop" | awk '{print "    " $1 ": ROTA=" $2}'

# 4. Check GPU / CUDA (Looking for Render/AI viability)
echo "[*] GPU / Compute (Render/AI Viability):"
if command -v nvidia-smi &> /dev/null
then
    nvidia-smi --query-gpu=name,memory.total,memory.free,temperature.gpu --format=csv,noheader | awk -F',' '{print "    GPU:" $1 " | VRAM:" $2 " (Free:" $3 ") | Temp: " $4 "C"}'
else
    echo "    No NVIDIA GPU detected or nvidia-smi not installed. (CPU-only tier)"
fi

# 5. Check Network Speed (Basic ping test for latency)
echo "[*] Network Latency (Bandwidth Sharing Viability):"
ping -c 3 8.8.8.8 | tail -1 | awk '{print "    Average Latency (to Google): " $4}' | cut -d '/' -f 2 | awk '{print "    " $0 " ms"}'

echo "=========================================="
echo "  Audit Complete."
echo "=========================================="
