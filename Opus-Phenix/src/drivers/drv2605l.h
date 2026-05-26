/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   DRV2605L HAPTIC DRIVER                                                  ║
 * ║   Texas Instruments Linear Resonant Actuator (LRA) Controller             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * The "Phantom Click" - Software-defined haptics that feel like hardware.
 * 
 * Features:
 * - 123 ROM waveform effects
 * - Auto-resonance calibration for LRA
 * - Real-time playback mode for custom waveforms
 * - Sub-millisecond latency for virtual encoder detents
 */

#ifndef DRV2605L_H
#define DRV2605L_H

#include <stdint.h>
#include <stdbool.h>
#include "driver/i2c_master.h"
#include "esp_err.h"

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER MAP
// ═══════════════════════════════════════════════════════════════════════════

#define DRV2605L_ADDR               0x5A

// Status registers
#define DRV2605L_REG_STATUS         0x00
#define DRV2605L_REG_MODE           0x01
#define DRV2605L_REG_RTPIN          0x02
#define DRV2605L_REG_LIBRARY        0x03
#define DRV2605L_REG_WAVESEQ1       0x04
#define DRV2605L_REG_WAVESEQ2       0x05
#define DRV2605L_REG_WAVESEQ3       0x06
#define DRV2605L_REG_WAVESEQ4       0x07
#define DRV2605L_REG_WAVESEQ5       0x08
#define DRV2605L_REG_WAVESEQ6       0x09
#define DRV2605L_REG_WAVESEQ7       0x0A
#define DRV2605L_REG_WAVESEQ8       0x0B
#define DRV2605L_REG_GO             0x0C
#define DRV2605L_REG_OVERDRIVE      0x0D
#define DRV2605L_REG_SUSTAINPOS     0x0E
#define DRV2605L_REG_SUSTAINNEG     0x0F
#define DRV2605L_REG_BRAKE          0x10
#define DRV2605L_REG_AUDIOCTRL      0x11
#define DRV2605L_REG_AUDIOLEVEL     0x12
#define DRV2605L_REG_AUDIOLOWMID    0x13
#define DRV2605L_REG_AUDIOMIDHIGH   0x14
#define DRV2605L_REG_AUDIORECALC    0x15
#define DRV2605L_REG_VBAT           0x21
#define DRV2605L_REG_LRARESON       0x22
#define DRV2605L_REG_FEEDBACK       0x1A
#define DRV2605L_REG_CONTROL1       0x1B
#define DRV2605L_REG_CONTROL2       0x1C
#define DRV2605L_REG_CONTROL3       0x1D
#define DRV2605L_REG_CONTROL4       0x1E
#define DRV2605L_REG_CONTROL5       0x1F
#define DRV2605L_REG_RTPINPUT       0x02
#define DRV2605L_REG_AUTOCALCOMP    0x18
#define DRV2605L_REG_AUTOCALEMP     0x19

// Mode bits
#define DRV2605L_MODE_INTTRIG       0x00
#define DRV2605L_MODE_EXTTRIGEDGE   0x01
#define DRV2605L_MODE_EXTTRIGLVL    0x02
#define DRV2605L_MODE_PWMANALOG     0x03
#define DRV2605L_MODE_AUDIOVIBE     0x04
#define DRV2605L_MODE_REALTIME      0x05
#define DRV2605L_MODE_DIAGNOS       0x06
#define DRV2605L_MODE_AUTOCAL       0x07
#define DRV2605L_MODE_STANDBY       0x40

// Library selection
#define DRV2605L_LIBRARY_EMPTY      0x00
#define DRV2605L_LIBRARY_TS2200A    0x01
#define DRV2605L_LIBRARY_TS2200B    0x02
#define DRV2605L_LIBRARY_TS2200C    0x03
#define DRV2605L_LIBRARY_TS2200D    0x04
#define DRV2605L_LIBRARY_TS2200E    0x05
#define DRV2605L_LIBRARY_LRA        0x06

// ═══════════════════════════════════════════════════════════════════════════
// WAVEFORM EFFECTS (Library 6 - LRA)
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    // Strong Clicks (1-16)
    DRV_EFFECT_STRONG_CLICK_100     = 1,    // Virtual Encoder Detent
    DRV_EFFECT_STRONG_CLICK_60      = 2,
    DRV_EFFECT_STRONG_CLICK_30      = 3,
    DRV_EFFECT_SHARP_CLICK_100      = 4,    // Sharp tactile feedback
    DRV_EFFECT_SHARP_CLICK_60       = 5,
    DRV_EFFECT_SHARP_CLICK_30       = 6,
    DRV_EFFECT_SOFT_BUMP_100        = 7,
    DRV_EFFECT_SOFT_BUMP_60         = 8,
    DRV_EFFECT_SOFT_BUMP_30         = 9,
    DRV_EFFECT_DOUBLE_CLICK_100     = 10,   // Confirmation haptic
    DRV_EFFECT_DOUBLE_CLICK_60      = 11,
    DRV_EFFECT_TRIPLE_CLICK_100     = 12,   // Error/Alert
    DRV_EFFECT_SOFT_FUZZ_60         = 13,
    DRV_EFFECT_STRONG_BUZZ_100      = 14,   // Notification
    DRV_EFFECT_ALERT_750MS          = 15,
    DRV_EFFECT_ALERT_1000MS         = 16,
    
    // Transition Ramps (27-44)
    DRV_EFFECT_RAMP_UP_LONG         = 27,
    DRV_EFFECT_RAMP_UP_SHORT        = 28,
    DRV_EFFECT_RAMP_DOWN_LONG       = 29,
    DRV_EFFECT_RAMP_DOWN_SHORT      = 30,
    
    // Pulsing Effects (47-58) - For Grounding Mode
    DRV_EFFECT_PULSING_STRONG_1     = 47,   // 60 BPM heart rate entrainment
    DRV_EFFECT_PULSING_STRONG_2     = 52,   // Error feedback
    DRV_EFFECT_PULSING_MEDIUM_1     = 53,
    DRV_EFFECT_PULSING_MEDIUM_2     = 54,
    DRV_EFFECT_PULSING_SHARP_1      = 55,
    DRV_EFFECT_PULSING_SHARP_2      = 56,
    
    // Transition Hums (57-62)
    DRV_EFFECT_TRANSITION_HUM_1     = 57,
    DRV_EFFECT_TRANSITION_HUM_2     = 58,
    
    // Long Buzzes (64-72)
    DRV_EFFECT_SMOOTH_HUM_1         = 64,
    DRV_EFFECT_SMOOTH_HUM_2         = 65,
    DRV_EFFECT_SMOOTH_HUM_3         = 66,
    DRV_EFFECT_SMOOTH_HUM_4         = 67,
    DRV_EFFECT_SMOOTH_HUM_5         = 68,
    
    // Custom sequences
    DRV_EFFECT_NONE                 = 0,
    DRV_EFFECT_STOP                 = 0,
} drv2605l_effect_t;

// ═══════════════════════════════════════════════════════════════════════════
// HAPTIC PRESETS - Named effects for application use
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    HAPTIC_CLICK,           // Sharp detent (VHE)
    HAPTIC_TICK,            // Soft tick (scrolling)
    HAPTIC_SUCCESS,         // Positive confirmation
    HAPTIC_ERROR,           // Error/rejection
    HAPTIC_WARNING,         // Caution
    HAPTIC_NOTIFICATION,    // Message received
    HAPTIC_THROB,           // Grounding mode heartbeat
    HAPTIC_CONFIRM,         // Button press confirm
    HAPTIC_REJECT,          // Action rejected
} haptic_preset_t;

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER API
// ═══════════════════════════════════════════════════════════════════════════

typedef struct {
    i2c_master_dev_handle_t i2c_handle;
    bool initialized;
    bool lra_mode;          // true = LRA, false = ERM
    uint8_t resonant_freq;  // LRA resonant frequency (Hz)
} drv2605l_t;

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize DRV2605L haptic driver
 * @param driver Pointer to driver handle
 * @param i2c_bus I2C master bus handle
 * @param use_lra true for LRA actuator, false for ERM
 * @return ESP_OK on success
 */
esp_err_t drv2605l_init(drv2605l_t *driver, i2c_master_bus_handle_t i2c_bus, bool use_lra);

/**
 * @brief Deinitialize driver
 */
esp_err_t drv2605l_deinit(drv2605l_t *driver);

/**
 * @brief Play single waveform effect from ROM library
 * @param driver Driver handle
 * @param effect Effect ID (1-123)
 */
esp_err_t drv2605l_play_effect(drv2605l_t *driver, drv2605l_effect_t effect);

/**
 * @brief Play sequence of up to 8 effects
 * @param driver Driver handle
 * @param effects Array of effect IDs (0 = end)
 * @param count Number of effects (max 8)
 */
esp_err_t drv2605l_play_sequence(drv2605l_t *driver, const drv2605l_effect_t *effects, uint8_t count);

/**
 * @brief Play preset haptic pattern
 * @param driver Driver handle
 * @param preset Named preset
 */
esp_err_t drv2605l_play_preset(drv2605l_t *driver, haptic_preset_t preset);

/**
 * @brief Stop any playing effect
 */
esp_err_t drv2605l_stop(drv2605l_t *driver);

/**
 * @brief Set real-time playback value (-127 to +127)
 * For custom waveform generation
 */
esp_err_t drv2605l_set_realtime(drv2605l_t *driver, int8_t value);

/**
 * @brief Run auto-calibration (call once on first boot)
 */
esp_err_t drv2605l_calibrate(drv2605l_t *driver);

/**
 * @brief Check if device is present
 */
bool drv2605l_probe(i2c_master_bus_handle_t i2c_bus);

#ifdef __cplusplus
}
#endif

#endif // DRV2605L_H

