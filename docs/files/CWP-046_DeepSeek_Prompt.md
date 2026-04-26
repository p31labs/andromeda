# CWP-046: Node Zero Display Boot Sequence
## DeepSeek Firmware Agent Prompt

You are the P31 Labs firmware engineer. Your task is to implement the verified boot sequence for the Waveshare ESP32-S3-Touch-LCD-3.5B (N16R8) that cures the blank screen bug.

## Hardware
- **MCU:** ESP32-S3R8 (dual-core 240MHz Xtensa LX7, 16MB flash, 8MB Octal PSRAM)
- **Display:** AXS15231B QSPI (3.5" capacitive touch LCD)
- **I/O Expander:** TCA9554PWR at I2C address 0x20
- **Toolchain:** ESP-IDF 5.5.x (NOT 6.0), LVGL 8.4 (NOT 9.x — 30% RAM overhead unacceptable)
- **Display Driver:** espressif/esp_lcd_axs15231b v2.1.0 (ESP Component Registry)

## CRITICAL CONSTRAINTS — MEMORIZE THESE

### PSRAM Firewall (ABSOLUTE)
GPIO 33, 34, 35, 36, 37 are RESERVED for Octal PSRAM data/control lines.
- NEVER configure these as outputs
- NEVER attach peripherals to these pins
- These pins must be HIGH-Z with internal pull-downs BEFORE power rail collapse
- Violating this causes PSRAM initialization failure and system crash

### GPIO 26-32 are ALSO reserved (SPI flash/PSRAM shared bus)
Total forbidden zone: GPIO 26-37 (12 pins unavailable)

### USB-JTAG: GPIO 19, 20 — handle with care
### Strapping pins: GPIO 0, 3, 45, 46 — require special handling

## Verified Pin Allocation (from MCD v1.0, April 12, 2026)

| Subsystem | GPIO | Interface |
|-----------|------|-----------|
| QSPI Display | 9, 10, 11, 12, 13, 14 | QSPI Mode 0, 40 MHz |
| I2C Bus (shared) | 7 (SCL), 8 (SDA) | 400 kHz |
| TCA9554 Expander | I2C addr 0x20 | Display reset control |
| DRV2605L Haptic | I2C addr 0x5A | Waveform sequencer |
| QMI8658 IMU | I2C addr 0x6B | 6-axis accel/gyro |
| SX1262 LoRa | SPI (dedicated bus) | 915 MHz ISM |
| NXP SE050 | I2C addr 0x48 | EAL6+ HSM |

## Boot Sequence (MCD v1.0, WCD-FW10, task FW10.5)

Implement this EXACT sequence. Order matters. Timing matters.

```
1. Initialize I2C master at 400 kHz
   - SDA: GPIO 8
   - SCL: GPIO 7
   - Pull-ups: external (on Waveshare board)

2. Configure TCA9554 (0x20) output register
   - Set all outputs to known state
   - Identify which TCA9554 pin controls AXS15231B RST_N
   - Reference Waveshare schematic or example code

3. Assert display reset (RST_N LOW)
   - Hold LOW for minimum 20ms
   - This is non-negotiable timing

4. Release reset (RST_N HIGH)
   - Wait 120ms stabilization delay
   - Display controller needs this to initialize internal registers

5. Initialize QSPI interface
   - GPIO 9-14
   - SPI Mode 0
   - Clock: 40 MHz
   - Use espressif/esp_lcd_axs15231b driver with use_qspi_interface = 1

6. Initialize LVGL 8.4
   - Display buffer in PSRAM (not SRAM — preserve SRAM for stack/heap)
   - Color depth: RGB565 (LVGL 8 native, no RGB888 conversion overhead)
   - Target: 30 FPS minimum on boot screen
```

## Deliverable

A complete, compilable ESP-IDF project with:
1. `main/main.c` — boot sequence implementation
2. `main/display.c` / `display.h` — display init with TCA9554 reset
3. `main/i2c_master.c` / `i2c_master.h` — shared I2C bus init
4. `CMakeLists.txt` — project config with component dependencies
5. `sdkconfig.defaults` — PSRAM enabled, flash mode QIO, 240MHz CPU

## What NOT to do
- Do NOT use GPIO 33-37 for anything
- Do NOT use LVGL 9.x (memory overhead kills us)
- Do NOT use Arduino framework (ESP-IDF only)
- Do NOT skip the 120ms stabilization delay
- Do NOT put display buffers in SRAM (use PSRAM via heap_caps_malloc with MALLOC_CAP_SPIRAM)

## Verification
```bash
idf.py build    # Must complete with zero errors
idf.py flash    # Board boots to non-blank display
```

Display should show a simple boot screen (P31 logo or "NODE ZERO" text) confirming the full init chain works.

## Reference
- Waveshare ESP32-S3-Touch-LCD-3.5B wiki
- espressif/esp_lcd_axs15231b component docs
- TCA9554 datasheet (TI SCPS210)
- AXS15231B application notes
- ESP-IDF Programming Guide v5.5.x (GPIO, SPI Master, I2C)
