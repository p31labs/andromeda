# Node Zero Hardware Validation Test Plan
**Device:** Waveshare ESP32-S3-Touch-LCD-3.5B (Type B, N16R8 variant)
**Firmware:** P31 Labs Node Zero (ESP-IDF 5.5.x, LVGL 8.4)
**Validation Date:** [To be filled]
**Validated By:** [To be filled]

## Scope
This test plan verifies the core hardware functionality of the Node Zero device as defined in the Master Control Document (MCD) for CWP-046. All tests must pass for hardware release.

## Safety Precautions
- Verify proper ESD handling procedures
- Use only approved power supplies (5V USB-C or 3.7V LiPo battery)
- Do not short GPIO pins, especially those in the PSRAM kill zone (GPIO 26-37)
- Monitor device temperature during extended operation

## Test Equipment Required
- Host computer with ESP-IDF 5.5.x toolchain
- USB-C cable (data capable)
- Logic analyzer or oscilloscope (optional but recommended)
- Multimeter
- Known-good LoRa node for communication testing
- Audio source (for microphone test) and headphones/speaker (for audio output test)
- Light source (for ambient light sensor test if applicable)

## Test Sequence

### 1. Power-On and Boot Validation
**Objective:** Verify device powers on and completes boot sequence without errors.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 1.1 | Connect device to USB-C power | Device powers on (no smoke, abnormal heat) | | |
| 1.2 | Observe boot logs via USB CDC | ESP-IDF bootloader messages, app start, no panic | | |
| 1.3 | Verify LVGL initialization | Display shows initial screen (boot logo or home screen) | | |
| 1.4 | Check backlight functionality | Backlight illuminates at default brightness (~78%) | | |

### 2. Display System Validation
**Objective:** Verify AXS15231B display operates correctly via QSPI with LVGL 8.4.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 2.1 | Verify resolution | Display shows 480x320 pixels (portrait native) | | |
| 2.2 | Verify rotation | Screen content rotated 90° clockwise via LVGL sw_rotate | | |
| 2.3 | Color test | Display solid red, green, blue, white, black screens without artifacts | | |
| 2.4 | Gradient test | Display smooth horizontal/vertical gradients without banding | | |
| 2.5 | Touch calibration | Touch input registers at correct screen coordinates (within 5px) | | |
| 2.6 | Double-buffer verification | No tearing during animated transitions | | |
| 2.7 | PSRAM verification | Confirm frame buffers allocated in PSRAM (heap caps log) | | |

### 3. Touch Input Validation
**Objective:** Verify AXS15231B integrated touch controller functions via I2C.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 3.1 | Touch detection | Finger/stylus touch produces reliable input events | | |
| 3.2 | Multi-touch | System handles single touch (multi-touch not required but should not crash) | | |
| 3.3 | Touch linearity | Touch accuracy across entire screen surface (corners, center, edges) | | |
| 3.4 | No false touches | No input registered when screen is untouched | | |
| 3.5 | Touch resolution | Minimum touch separation distinguishable (approx 5mm) | | |

### 4. Audio System Validation
**Objective:** Verify ES8311 codec functions for speaker output and microphone input.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 4.1 | Speaker test | Play 1kHz tone at 50% volume - clear audio output | | |
| 4.2 | Volume control | Volume adjustable from 0% to 100% without clipping | | |
| 4.3 | Microphone test | Speak into mic - input signal visible on waveform or RMS meter | | |
| 4.4 | Mic gain | Adjustable gain affects input signal level appropriately | | |
| 4.5 | Loopback test (optional) | Mic input routed to output with minimal latency (<20ms) | | |
| 4.6 | I2S clock signals | Verify BCLK, WS, DIN, DOUT signals on oscilloscope if available | | |

### 5. LoRa (SX1262) Validation
**Objective:** Verify Semtech SX1262 LoRa transceiver functions via FSPI.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 5.1 | Chip detection | SX1262 responds to SPI read of version/registers | | |
| 5.2 | TX test | Transmit packet at 868MHz/915MHz (region appropriate) | | |
| 5.3 | RX test | Receive packet from known-good LoRa node | | |
| 5.4 | RSSI reporting | Received Signal Strength Indicator values plausible | | |
| 5.5 | Antenna switch | Verify TX/RX switching via DIO1/BUSY pins if used | | |
| 5.6 | Frequency accuracy | Transmit frequency within ±10ppm of target | | |
| 5.7 | Duty cycle compliance | Observe regulatory duty cycle limits if transmitting continuously | | |

### 6. Power Management Validation
**Objective:** Verify power consumption characteristics and battery operation.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 6.1 | USB current | Measure idle current (display on, backlight 78%) < 180mA | | |
| 6.2 | Backlight PWM | Verify backlight brightness adjusts via LEDC PWM | | |
| 6.3 | Sleep mode | Enter low-power state (if implemented) - current < 30μA | | |
| 6.4 | Wake sources | Verify wake from touch, timer, or LoRa interrupt | | |
| 6.5 | Battery operation | Run 30 minutes on battery power (if battery connected) | | |
| 6.6 | Voltage monitoring | Battery voltage reading within 5% of multimeter measurement | | |

### 7. System Integrity Validation
**Objective:** Verify overall system stability and resource usage.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 7.1 | Heap monitoring | No memory leaks during 10-minute operation | | |
| 7.2 | Task execution | All FreeRTOS tasks meet deadlines (no stack overflow) | | |
| 7.3 | Watchdog | Timer/task watchdog does not trigger during normal operation | | |
| 7.4 | Log output | No persistent error messages in system logs | | |
| 7.5 | Temperature | Device temperature remains below 50°C under normal load | | |
| 7.6 | Reset behavior | External reset (BOOT button) restarts cleanly | | |

### 8. Stress and Reliability Validation
**Objective:** Verify device reliability under extended operation.

| Step | Procedure | Expected Result | Pass/Fail | Notes |
|------|-----------|-----------------|-----------|-------|
| 8.1 | Soak test | Run continuously for 4 hours with periodic user interaction | | |
| 8.2 | Thermal cycling | Operate at room temperature, then after 30 min in 40°C environment (if available) | | |
| 8.3 | Power cycling | Power off/on 10 times - device boots cleanly each time | | |
| 8.4 | Touch fatigue | Continuous touch input for 5 minutes - no degradation | | |
| 8.5 | Audio endurance | Play audio continuously for 30 minutes - no glitches | | |

## Pass/Fail Criteria
- **All tests in sections 1-7 must pass** for hardware release
- Section 8 (stress tests) are recommended but not strictly required for initial release
- Any test failure requires root cause analysis and retest after fix
- Document all failures in the test log below

## Test Log
| Test | Result | Date | Technician | Notes |
|------|--------|------|------------|-------|
|      |        |      |            |       |
|      |        |      |            |       |
|      |        |      |            |       |

## Sign-Off
**Hardware Engineer:** _________________________ Date: __________
**QA Engineer:** _________________________ Date: __________
**Release Manager:** _________________________ Date: __________

## References
- [Node Zero Schematic](link-to-schematic)
- [Waveshare ESP32-S3-Touch-LCD-3.5B Datasheet](link-to-display-datasheet)
- [AXS15231B Display Controller Datasheet](link-to-axs15231b-datasheet)
- [ES8311 Audio Codec Datasheet](link-to-es8311-datasheet)
- [SX1262 LoRa Transceiver Datasheet](link-to-sx1262-datasheet)
- [ESP32-S3 Technical Reference Manual](link-to-esp32s3-trm)
- [LVGL 8.4 Documentation](https://docs.lvgl.io/8.4/)
- [ESP-IDF 5.5.x Documentation](https://docs.espressif.com/projects/esp-idf/en/v5.5.x/)