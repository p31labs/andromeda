/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   PHENIX PHANTOM - CENTRALIZED HARDWARE CONFIGURATION                     ║
 * ║   "The geometry remains. The connection remains. Only the bulk vanishes." ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Target: Waveshare ESP32-S3 Touch LCD 3.5" Type B
 * Spec:   96mm × 64mm × 16mm "Pocket Monolith"
 * 
 * CONSTITUTIONAL REQUIREMENTS:
 * - K₄ Topology: Exactly 4 core nodes (Tetrahedron)
 * - Privacy-First: Local processing, encrypted sync only
 * - Ephemeralization: Whale Song bandwidth (0.350 kbps) optimization
 */

#ifndef PHENIX_CONFIG_H
#define PHENIX_CONFIG_H

#include <stdint.h>

// ═══════════════════════════════════════════════════════════════════════════
// VERSION & BUILD INFO
// ═══════════════════════════════════════════════════════════════════════════

#define PHENIX_VERSION          "2.0.0"
#define PHENIX_CODENAME         "Phantom"
#define PHENIX_BUILD_DATE       __DATE__
#define PHENIX_BUILD_TIME       __TIME__

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY CONFIGURATION - QSPI (Type B Critical!)
// AXS15231B Controller via QSPI @ 40-60 FPS
// ═══════════════════════════════════════════════════════════════════════════

#define DISPLAY_WIDTH           480
#define DISPLAY_HEIGHT          320
#define DISPLAY_COLOR_DEPTH     16      // RGB565
#define DISPLAY_ROTATION        1       // Landscape

// QSPI Pins (Type B - 4 data lines)
#define PIN_LCD_QSPI_D0         GPIO_NUM_45
#define PIN_LCD_QSPI_D1         GPIO_NUM_46
#define PIN_LCD_QSPI_D2         GPIO_NUM_47
#define PIN_LCD_QSPI_D3         GPIO_NUM_48
#define PIN_LCD_QSPI_SCK        GPIO_NUM_3
#define PIN_LCD_QSPI_CS         GPIO_NUM_39

// Touch (FT5x06 via I2C)
#define PIN_TOUCH_SDA           GPIO_NUM_8
#define PIN_TOUCH_SCL           GPIO_NUM_7
#define PIN_TOUCH_RST           GPIO_NUM_NC   // Via IO Expander
#define PIN_TOUCH_INT           GPIO_NUM_2

// Backlight (PWM)
#define PIN_LCD_BL              GPIO_NUM_6
#define LCD_BL_PWM_CHANNEL      LEDC_CHANNEL_0
#define LCD_BL_PWM_FREQ         5000
#define LCD_BL_PWM_RESOLUTION   10

// ═══════════════════════════════════════════════════════════════════════════
// I2C BUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// I2C Bus 0 - Touch, IMU, RTC, PMU, IO Expander
#define PIN_I2C0_SDA            GPIO_NUM_8
#define PIN_I2C0_SCL            GPIO_NUM_7
#define I2C0_FREQ_HZ            400000

// I2C Bus 1 - Haptics (DRV2605L) - Dedicated for low latency
#define PIN_I2C1_SDA            GPIO_NUM_4
#define PIN_I2C1_SCL            GPIO_NUM_13
#define I2C1_FREQ_HZ            400000

// I2C Addresses
#define I2C_ADDR_TOUCH          0x38    // FT5x06/AXS15231B
#define I2C_ADDR_PMU            0x34    // AXP2101
#define I2C_ADDR_IMU            0x6B    // QMI8658
#define I2C_ADDR_RTC            0x51    // PCF85063
#define I2C_ADDR_IO_EXPANDER    0x20    // TCA9554
#define I2C_ADDR_HAPTIC         0x5A    // DRV2605L
#define I2C_ADDR_CODEC          0x18    // ES8311

// ═══════════════════════════════════════════════════════════════════════════
// IO EXPANDER (TCA9554) - PIN ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

#define IO_EXP_PIN_LCD_RST      0
#define IO_EXP_PIN_LCD_CS       1
#define IO_EXP_PIN_TP_RST       2
#define IO_EXP_PIN_SD_CS        3
// Pins 4-7: Reserved

// ═══════════════════════════════════════════════════════════════════════════
// HAPTIC FEEDBACK - DRV2605L (Virtual Haptic Encoder)
// ═══════════════════════════════════════════════════════════════════════════

#ifdef HAPTIC_ENABLED

// LRA Actuator Configuration
#define HAPTIC_ACTUATOR_TYPE    1       // 0 = ERM, 1 = LRA
#define HAPTIC_RESONANT_FREQ    205     // Hz (typical 10mm coin LRA)

// Virtual Encoder Configuration
#define VHE_DETENT_ANGLE        15.0f   // Degrees per detent (haptic tick)
#define VHE_FRICTION_COEFF      0.05f   // Flywheel friction μ
#define VHE_MIN_VELOCITY        2.0f    // Min angular velocity for flywheel

// DRV2605L Waveform Library Effects
#define HAPTIC_EFFECT_CLICK     1       // Sharp Click - 100%
#define HAPTIC_EFFECT_TICK      4       // Sharp Tick 3 - 60%
#define HAPTIC_EFFECT_BUMP      7       // Short Double Click - Strong
#define HAPTIC_EFFECT_SUCCESS   14      // Transition Ramp Up Short Smooth
#define HAPTIC_EFFECT_ERROR     52      // Pulsing Strong 2 - 100%
#define HAPTIC_EFFECT_THROB     47      // Pulsing Strong 1 - 60% (60 BPM grounding)

#endif // HAPTIC_ENABLED

// ═══════════════════════════════════════════════════════════════════════════
// LORA RADIO - EBYTE E22 (915MHz 1W "Whale Song")
// ═══════════════════════════════════════════════════════════════════════════

#ifdef LORA_ENABLED

// SPI Pins
#define PIN_LORA_MISO           GPIO_NUM_37
#define PIN_LORA_MOSI           GPIO_NUM_35
#define PIN_LORA_SCK            GPIO_NUM_36
#define PIN_LORA_CS             GPIO_NUM_34
#define PIN_LORA_DIO1           GPIO_NUM_33
#define PIN_LORA_RST            GPIO_NUM_47
#define PIN_LORA_BUSY           GPIO_NUM_21

// RF Configuration
#define LORA_FREQUENCY          915.0f  // MHz (US ISM)
#define LORA_BANDWIDTH          125.0f  // kHz
#define LORA_SPREADING_FACTOR   12      // SF12 for max range
#define LORA_CODING_RATE        5       // 4/5
#define LORA_TX_POWER           30      // dBm (1W)
#define LORA_PREAMBLE_LEN       8

// WSTP Protocol (Whale Song Transport Protocol)
#define WSTP_MAX_PAYLOAD        50      // Bytes (SF12 @ 915MHz limit)
#define WSTP_SYNC_WORD          0x14    // G.O.D. Protocol sync

#endif // LORA_ENABLED

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO - ES8311 CODEC + I2S
// ═══════════════════════════════════════════════════════════════════════════

#define PIN_I2S_BCK             GPIO_NUM_40
#define PIN_I2S_WS              GPIO_NUM_41
#define PIN_I2S_DOUT            GPIO_NUM_38
#define PIN_I2S_DIN             GPIO_NUM_15

// Audio Configuration
#define AUDIO_SAMPLE_RATE       16000   // Hz (optimized for speech)
#define AUDIO_BIT_DEPTH         16

// ═══════════════════════════════════════════════════════════════════════════
// DEAD MAN'S SWITCH - CAPACITIVE HAND DETECTION
// ═══════════════════════════════════════════════════════════════════════════

#define PIN_DEAD_MAN            GPIO_NUM_42

// ═══════════════════════════════════════════════════════════════════════════
// LED STRIP - WS2812B (Glow Stone Aesthetic)
// ═══════════════════════════════════════════════════════════════════════════

#define PIN_LED_DATA            GPIO_NUM_5
#define LED_COUNT               4
#define LED_BRIGHTNESS_DEFAULT  80      // 0-255

// ═══════════════════════════════════════════════════════════════════════════
// SELF-HUG E-STOP CONFIGURATION
// "Clutch" the device + accelerometer jerk toward body = Safe Mode
// ═══════════════════════════════════════════════════════════════════════════

// Touch detection thresholds
#define SELFHUG_TOUCH_POINTS_MIN    3   // Minimum simultaneous touches
#define SELFHUG_SURFACE_AREA_MIN    60  // % of screen covered

// IMU thresholds
#define SELFHUG_ACCEL_Z_MIN         2.0f    // g-force (impact/jerk)
#define SELFHUG_FUSION_WINDOW_MS    100     // Time window for both conditions

// Grounding mode
#define GROUNDING_BREATHE_PERIOD_MS 6000    // Slow breathing (0.1 Hz visual)
#define GROUNDING_THROB_BPM         60      // Heart rate entrainment

// ═══════════════════════════════════════════════════════════════════════════
// COGNITIVE SHIELD PROTOCOL - SERIAL BRIDGE
// ═══════════════════════════════════════════════════════════════════════════

#define SHIELD_PROTOCOL_VERSION     "1.0.0"
#define SHIELD_BAUD_RATE            115200

// Command Types (sync with cognitive-shield/src/lib/phenix-protocol.ts)
typedef enum {
    SHIELD_CMD_SET_VOLTAGE = 0x01,
    SHIELD_CMD_SET_SPOONS = 0x02,
    SHIELD_CMD_ENTER_GROUNDING = 0x03,
    SHIELD_CMD_EXIT_GROUNDING = 0x04,
    SHIELD_CMD_TRIGGER_HAPTIC = 0x05,
    SHIELD_CMD_SET_LED_PATTERN = 0x06,
    SHIELD_CMD_SYNC_STATE = 0x07,
    SHIELD_CMD_MESH_BROADCAST = 0x08,
    SHIELD_CMD_PING = 0xFF,
} shield_command_t;

// ═══════════════════════════════════════════════════════════════════════════
// LVGL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Memory allocation
#define LV_MEM_SIZE             (256 * 1024)     // 256KB in PSRAM
#define LV_MEM_ADR              0                // Allocate from PSRAM heap

// Display buffers (in PSRAM for double buffering)
// 320×480×2 = 307,200 bytes per buffer
#define LVGL_BUFFER_SIZE        (DISPLAY_WIDTH * DISPLAY_HEIGHT * sizeof(uint16_t))
#define LVGL_BUFFER_COUNT       2               // Double buffering

// Refresh rate
#define LVGL_TICK_PERIOD_MS     2               // 500 Hz tick rate
#define LVGL_HANDLER_PERIOD_MS  5               // 200 Hz handler

// ═══════════════════════════════════════════════════════════════════════════
// K₄ TETRAHEDRON - NODE IDENTITY
// ═══════════════════════════════════════════════════════════════════════════

#define K4_NODE_COUNT           4       // Immutable geometric constant

#ifndef PHENIX_ID
#define PHENIX_ID               1       // Default: ARCHITECT
#endif

// Node definitions (set via build flags)
#if PHENIX_ID == 1
    #define PHENIX_CALLSIGN     "ARCHITECT"
    #define PHENIX_NAME         "Will"
    #define PHENIX_ROLE         "Builder"
    #define PHENIX_NODE_ID      0x01
    #define PHENIX_COLOR_PRIMARY    0xFEA0  // Gold
    #define PHENIX_COLOR_ACCENT     0x07FF  // Cyan
    #define PHENIX_BOOT_MSG     "The Trimtab Awakens"
    #define PHENIX_IS_CORE      true
#elif PHENIX_ID == 2
    #define PHENIX_CALLSIGN     "PHOENIX"
    #define PHENIX_NAME         "Christyn"
    #define PHENIX_ROLE         "Rising"
    #define PHENIX_NODE_ID      0x02
    #define PHENIX_COLOR_PRIMARY    0xF81F  // Magenta
    #define PHENIX_COLOR_ACCENT     0xFEA0  // Gold
    #define PHENIX_BOOT_MSG     "From Ashes, Light"
    #define PHENIX_IS_CORE      true
#elif PHENIX_ID == 3
    #define PHENIX_CALLSIGN     "BASH"
    #define PHENIX_NAME         "Bash"
    #define PHENIX_ROLE         "Wonky Sprout"
    #define PHENIX_NODE_ID      0x03
    #define PHENIX_COLOR_PRIMARY    0x07E0  // Green
    #define PHENIX_COLOR_ACCENT     0x07FF  // Cyan
    #define PHENIX_BOOT_MSG     "Ready to Build!"
    #define PHENIX_IS_CORE      true
#elif PHENIX_ID == 4
    #define PHENIX_CALLSIGN     "WILLOW"
    #define PHENIX_NAME         "Willow"
    #define PHENIX_ROLE         "Wonky Sprout"
    #define PHENIX_NODE_ID      0x04
    #define PHENIX_COLOR_PRIMARY    0xF81F  // Pink
    #define PHENIX_COLOR_ACCENT     0x07E0  // Green
    #define PHENIX_BOOT_MSG     "The Tree Stands Strong"
    #define PHENIX_IS_CORE      true
#elif PHENIX_ID == 5
    #define PHENIX_CALLSIGN     "TYLER"
    #define PHENIX_NAME         "Tyler"
    #define PHENIX_ROLE         "Extended Node"
    #define PHENIX_NODE_ID      0x05
    #define PHENIX_COLOR_PRIMARY    0xF800  // Red
    #define PHENIX_COLOR_ACCENT     0xFEA0  // Gold
    #define PHENIX_BOOT_MSG     "The Mesh Expands"
    #define PHENIX_IS_CORE      false
#elif PHENIX_ID == 6
    #define PHENIX_CALLSIGN     "ASHLEY"
    #define PHENIX_NAME         "Ashley"
    #define PHENIX_ROLE         "Extended Node"
    #define PHENIX_NODE_ID      0x06
    #define PHENIX_COLOR_PRIMARY    0x780F  // Purple
    #define PHENIX_COLOR_ACCENT     0xF81F  // Pink
    #define PHENIX_BOOT_MSG     "Connected"
    #define PHENIX_IS_CORE      false
#elif PHENIX_ID == 7
    #define PHENIX_CALLSIGN     "LINK"
    #define PHENIX_NAME         "Link"
    #define PHENIX_ROLE         "Extended Node"
    #define PHENIX_NODE_ID      0x07
    #define PHENIX_COLOR_PRIMARY    0x07FF  // Cyan
    #define PHENIX_COLOR_ACCENT     0x07E0  // Green
    #define PHENIX_BOOT_MSG     "The Chain Grows"
    #define PHENIX_IS_CORE      false
#elif PHENIX_ID == 8
    #define PHENIX_CALLSIGN     "JUDAH"
    #define PHENIX_NAME         "Judah"
    #define PHENIX_ROLE         "Extended Node"
    #define PHENIX_NODE_ID      0x08
    #define PHENIX_COLOR_PRIMARY    0xFEA0  // Gold
    #define PHENIX_COLOR_ACCENT     0xF800  // Red
    #define PHENIX_BOOT_MSG     "The Lion Awakens"
    #define PHENIX_IS_CORE      false
#else
    #error "Invalid PHENIX_ID. Must be 1-8."
#endif

// ═══════════════════════════════════════════════════════════════════════════
// COLOR PALETTE - UNIVERSAL LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════

// Status Colors (RGB565)
#define COLOR_SAFE              0x07E0  // Green - Safe, grounded
#define COLOR_CAUTION           0xFEA0  // Yellow - Caution, stressed
#define COLOR_NEED_SUPPORT      0xFD20  // Orange - Need support
#define COLOR_SOS               0xF800  // Red - Emergency

// Mood Colors (Plutchik-inspired)
#define COLOR_CALM              0xB5BF  // Soft blue
#define COLOR_AFFECTION         0x07F4  // Teal
#define COLOR_ANXIETY           0xFB80  // Alert orange
#define COLOR_JOY               0xFFE0  // Bright yellow

// UI Colors
#define COLOR_BG_PRIMARY        0x0841  // Near black
#define COLOR_BG_SECONDARY      0x10A2  // Dark gray
#define COLOR_TEXT_PRIMARY      0xFFFF  // White
#define COLOR_TEXT_SECONDARY    0x8410  // Gray
#define COLOR_ACCENT            0xA5FF  // Purple accent

// Coherence Blue (Grounding Mode)
#define COLOR_COHERENCE_BLUE    0x5D7F  // Calming blue for breathing animation

#endif // PHENIX_CONFIG_H

