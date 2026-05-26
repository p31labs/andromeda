/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   SELF-HUG E-STOP PROTOCOL                                                ║
 * ║   Biometric Pattern Match for Emergency Grounding Mode                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * TRIGGER: "Clutch" the device (3+ touch points, 60%+ surface) 
 *          + Accelerometer jerk toward body (Z > 2g)
 *          = Emergency Safe Mode
 * 
 * This replaces the physical mushroom-head E-Stop button with a natural
 * "hug the device" gesture that a distressed user would instinctively do.
 * 
 * GROUNDING RESPONSE:
 * - Visual: UI vanishes → Coherence Blue breathing animation (0.1 Hz)
 * - Haptic: LRA shifts to "Throb" mode → 60 BPM pulse (heart rate entrainment)
 * - Network: High-priority "Distress/Status: Overwhelmed" broadcast to mesh
 * 
 * EXIT: 5 taps anywhere OR draw triangle pattern
 */

#ifndef SELF_HUG_H
#define SELF_HUG_H

#include <stdint.h>
#include <stdbool.h>
#include "drivers/drv2605l.h"

#ifdef __cplusplus
extern "C" {
#endif

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Touch detection thresholds
#ifndef SELFHUG_TOUCH_POINTS_MIN
#define SELFHUG_TOUCH_POINTS_MIN    3       // Minimum simultaneous touches
#endif

#ifndef SELFHUG_SURFACE_AREA_MIN
#define SELFHUG_SURFACE_AREA_MIN    60      // % of screen covered
#endif

// IMU thresholds
#ifndef SELFHUG_ACCEL_Z_MIN
#define SELFHUG_ACCEL_Z_MIN         2.0f    // g-force (impact/jerk)
#endif

#ifndef SELFHUG_FUSION_WINDOW_MS
#define SELFHUG_FUSION_WINDOW_MS    100     // Time window for both conditions
#endif

// Boot protection
#define SELFHUG_BOOT_GRACE_MS       8000    // Ignore triggers for first 8 seconds

// Grounding mode timing
#define GROUNDING_BREATHE_PERIOD_MS 6000    // 6 second breath cycle (0.1 Hz)
#define GROUNDING_BREATHE_MIN       30      // Minimum brightness
#define GROUNDING_BREATHE_MAX       180     // Maximum brightness
#define GROUNDING_THROB_BPM         60      // Heart rate entrainment (beats/min)
#define GROUNDING_THROB_PERIOD_MS   1000    // 60 BPM = 1000ms per beat

// Exit sequence
#define GROUNDING_EXIT_TAPS         5       // Taps required to exit
#define GROUNDING_EXIT_WINDOW_MS    2000    // Time window for tap sequence

// ═══════════════════════════════════════════════════════════════════════════
// CALLBACK TYPES
// ═══════════════════════════════════════════════════════════════════════════

typedef void (*selfhug_enter_cb_t)(void);           // Called when entering grounding
typedef void (*selfhug_exit_cb_t)(void);            // Called when exiting grounding
typedef void (*selfhug_mesh_broadcast_cb_t)(const char* status);  // Broadcast to mesh

// ═══════════════════════════════════════════════════════════════════════════
// STATE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    SELFHUG_STATE_NORMAL,       // Normal operation
    SELFHUG_STATE_DETECTING,    // Potential hug detected, waiting for IMU
    SELFHUG_STATE_GROUNDING,    // Grounding mode active
} selfhug_state_t;

typedef struct {
    // Detection state
    selfhug_state_t state;
    uint32_t detection_start_ms;
    
    // Touch tracking
    uint8_t touch_points;
    uint16_t touch_surface_pct;
    bool touch_condition_met;
    uint32_t touch_condition_time;
    
    // IMU tracking
    float accel_z;              // Current Z acceleration (g)
    bool imu_condition_met;
    uint32_t imu_condition_time;
    
    // Grounding mode
    uint32_t grounding_start_ms;
    uint32_t breathe_phase;
    uint32_t last_throb_ms;
    
    // Exit sequence
    uint8_t exit_tap_count;
    uint32_t last_exit_tap_ms;
    
    // Drivers
    drv2605l_t *haptic;
    
    // Callbacks
    selfhug_enter_cb_t on_enter;
    selfhug_exit_cb_t on_exit;
    selfhug_mesh_broadcast_cb_t on_broadcast;
    
} selfhug_t;

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @brief Initialize self-hug detector
 * @param selfhug Handle
 * @param haptic Haptic driver (can be NULL)
 */
void selfhug_init(selfhug_t *selfhug, drv2605l_t *haptic);

/**
 * @brief Set callbacks
 */
void selfhug_set_callbacks(selfhug_t *selfhug,
                           selfhug_enter_cb_t on_enter,
                           selfhug_exit_cb_t on_exit,
                           selfhug_mesh_broadcast_cb_t on_broadcast);

/**
 * @brief Update touch input
 * @param selfhug Handle
 * @param touch_points Number of simultaneous touch points
 * @param surface_pct Percentage of screen surface covered
 * @param now Current timestamp (ms)
 */
void selfhug_update_touch(selfhug_t *selfhug, uint8_t touch_points, 
                          uint16_t surface_pct, uint32_t now);

/**
 * @brief Update IMU input
 * @param selfhug Handle
 * @param accel_x X acceleration (g)
 * @param accel_y Y acceleration (g)
 * @param accel_z Z acceleration (g)
 * @param now Current timestamp (ms)
 */
void selfhug_update_imu(selfhug_t *selfhug, float accel_x, float accel_y, 
                        float accel_z, uint32_t now);

/**
 * @brief Process state machine (call every frame)
 * @param selfhug Handle
 * @param now Current timestamp (ms)
 * @return true if grounding mode is active
 */
bool selfhug_process(selfhug_t *selfhug, uint32_t now);

/**
 * @brief Process tap for exit sequence
 * @param selfhug Handle
 * @param now Current timestamp (ms)
 * @return true if exit sequence completed
 */
bool selfhug_process_tap(selfhug_t *selfhug, uint32_t now);

/**
 * @brief Force entry into grounding mode (for menu access)
 */
void selfhug_force_enter(selfhug_t *selfhug, uint32_t now);

/**
 * @brief Force exit from grounding mode
 */
void selfhug_force_exit(selfhug_t *selfhug);

/**
 * @brief Check if grounding mode is active
 */
bool selfhug_is_active(selfhug_t *selfhug);

/**
 * @brief Get current breath phase (0.0 - 1.0) for animation
 */
float selfhug_get_breath_phase(selfhug_t *selfhug, uint32_t now);

/**
 * @brief Check if we should throb haptic (60 BPM)
 */
bool selfhug_should_throb(selfhug_t *selfhug, uint32_t now);

#ifdef __cplusplus
}
#endif

#endif // SELF_HUG_H

