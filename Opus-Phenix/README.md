# PHENIX PHANTOM v1.0.0

## "The Phantom Awakens" - Milestone 1

The Phenix Phantom is the all-digital evolution of the Phenix Navigator, replacing physical controls with a touchscreen interface while maintaining the G.O.D. Protocol's core principles.

### 🎯 Milestone 1 Achievements

- ✅ **Display**: AXS15231B QSPI (320x480 RGB565)
- ✅ **Touch**: Integrated capacitive touch (corruption-free!)
- ✅ **Backlight**: PWM-controlled (80% default)
- ✅ **LVGL**: Graphics library with interactive UI
- ✅ **Power**: AXP2101 PMU configured

### 🔧 Hardware

**Board**: Waveshare ESP32-S3 Touch LCD 3.5" Type B

| Component | Interface | Notes |
|-----------|-----------|-------|
| Display | QSPI | AXS15231B, GPIO1-5,12 |
| Touch | I2C | Integrated in AXS15231B |
| PMU | I2C (0x34) | AXP2101 |
| IO Expander | I2C (0x20) | TCA9554 |
| Backlight | GPIO6 | LEDC PWM |

### 📝 Key Technical Notes

**Touch Handling**: The `esp_lvgl_port` touch integration causes display corruption on AXS15231B. Solution: Manual touch polling in a separate FreeRTOS task with volatile shared state, bypassing `lvgl_port_add_touch()`.

**QSPI Display**: Uses custom init commands from xiaozhi firmware. Colors require byte-swapping (RGB565).

### 🏗️ Building

```bash
cd "C:\67\OpusPhenix"
pio run -t upload --upload-port COM11
pio device monitor --port COM11 --baud 115200
```

### 🗺️ Roadmap

- [ ] Tetrahedral UI Navigation
- [ ] IMU (QMI8658) - Self-Hug Detection
- [ ] Haptics (DRV2605L)
- [ ] LoRa Mesh (Whale Song Protocol)
- [ ] Audio Codec (ES8311)

### ⚖️ License

G.O.D. Protocol - Geometric Operations for Decentralized society

*Resilience over Convenience, Privacy over Engagement*

---

Built with 💙 for Earth's future
