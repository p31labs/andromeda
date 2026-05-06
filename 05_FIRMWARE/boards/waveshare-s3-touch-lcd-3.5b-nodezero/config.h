#ifndef _BOARD_CONFIG_H_
#define _BOARD_CONFIG_H_

// ── P31 Node Zero — Waveshare ESP32-S3-Touch-LCD-3.5B (Type B, N16R8) ────────
// Board: 480×320 AXS15231B display + touch, ES8311 codec, AXP2101 PMIC
// Kill zone: GPIO 26-37 reserved for Octal PSRAM — NEVER route anything here
// ─────────────────────────────────────────────────────────────────────────────

// ── I2C (shared bus — AXP2101 PMIC + ES8311 codec + AXS15231B touch) ────────
// All I2C transactions must acquire g_i2c_mutex (bus_mutex.h) before use
#define I2C_MASTER_SDA      GPIO_NUM_8
#define I2C_MASTER_SCL      GPIO_NUM_7
#define I2C_MASTER_NUM      I2C_NUM_0
#define I2C_MASTER_FREQ_HZ  400000      // Fast Mode

// ── Display: AXS15231B via QSPI (SPI2_HOST) ──────────────────────────────────
// DC pin: GPIO_NUM_NC — AXS15231B QSPI encodes cmd/data in transaction header.
// Do NOT set DC to any GPIO (original config used GPIO 0 = BOOT button — WRONG)
#define DISPLAY_HOST        SPI2_HOST
#define DISPLAY_CS          GPIO_NUM_12
#define DISPLAY_CLK         GPIO_NUM_5
#define DISPLAY_D0          GPIO_NUM_1
#define DISPLAY_D1          GPIO_NUM_2
#define DISPLAY_D2          GPIO_NUM_3
#define DISPLAY_D3          GPIO_NUM_4
#define DISPLAY_DC          GPIO_NUM_NC  // No DC pin for QSPI mode
#define DISPLAY_RST         GPIO_NUM_NC  // Power-on reset sufficient
#define DISPLAY_BACKLIGHT   GPIO_NUM_6
#define DISPLAY_BL_INVERT   false
#define DISPLAY_CLK_HZ      (40 * 1000 * 1000)

// Physical panel dimensions (portrait native)
#define DISPLAY_H_RES       480
#define DISPLAY_V_RES       320

// Rotation: 90° CW via LVGL SOFTWARE rotation — hardware MADCTL swap causes
// blank screen on AXS15231B (silicon boundary alignment bug — see display.c)
#define DISPLAY_LVGL_ROT    LV_DISP_ROT_90

// ── Touch: AXS15231B integrated DDIC via I2C ─────────────────────────────────
#define TOUCH_I2C_ADDR      0x3B
#define TOUCH_INT           GPIO_NUM_NC  // Interrupt not wired on Type B
#define TOUCH_RST           GPIO_NUM_NC

// ── LoRa: Semtech SX1262 via FSPI (SPI3_HOST) ────────────────────────────────
// Repurposed camera pins — no camera on Type B board
// All GPIOs above 37: clear of Octal PSRAM kill zone (26-37)
#define LORA_HOST           SPI3_HOST
#define LORA_SCK            GPIO_NUM_41  // CAM_PCLK repurposed
#define LORA_MOSI           GPIO_NUM_42  // CAM_Y6 repurposed
#define LORA_MISO           GPIO_NUM_39  // CAM_Y8 repurposed
#define LORA_NSS            GPIO_NUM_40  // CAM_Y7 repurposed (severs HW TE — OK, SW DMA used)
#define LORA_BUSY           GPIO_NUM_21  // CAM_Y9 repurposed
#define LORA_DIO1           GPIO_NUM_38  // CAM_XCLK repurposed
#define LORA_NRST           GPIO_NUM_45  // CAM_Y2 repurposed
#define LORA_CLK_HZ         (8 * 1000 * 1000)

// ── Audio: ES8311 codec ───────────────────────────────────────────────────────
#define AUDIO_SAMPLE_RATE   24000
#define AUDIO_I2S_MCLK      GPIO_NUM_44
#define AUDIO_I2S_WS        GPIO_NUM_15
#define AUDIO_I2S_BCLK      GPIO_NUM_13
#define AUDIO_I2S_DIN       GPIO_NUM_14   // ESP32 → codec (speaker)
#define AUDIO_I2S_DOUT      GPIO_NUM_16   // codec → ESP32 (mic)
#define AUDIO_ES8311_ADDR   0x18          // I2C address (ADDR pin tied low)
#define AUDIO_PA_PIN        GPIO_NUM_NC   // No PA on this board

// ── PMIC: X-Powers AXP2101 ───────────────────────────────────────────────────
#define PMIC_I2C_ADDR       0x34
#define PMIC_ENABLE         1

// ── System ────────────────────────────────────────────────────────────────────
#define BOOT_BUTTON         GPIO_NUM_0
#define BUILTIN_LED         GPIO_NUM_NC

#endif // _BOARD_CONFIG_H_
