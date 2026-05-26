/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   VIRTUAL HAPTIC ENCODER (VHE)                                            ║
 * ║   Software-defined rotary control with haptic detents                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Replaces physical EC11 rotary encoder with touch + haptic simulation.
 * 
 * PHYSICS MODEL:
 * - Angular position θ tracked via touch coordinates
 * - Angular velocity ω calculated per frame
 * - Flywheel inertia on release: ω_{t+1} = ω_t × (1 - μ)
 * - Haptic "tick" fires every 15° of rotation
 * - Audio-Haptic sync: ticks are angle-based, not time-based
 * 
 * This creates the illusion of physical mass through precise timing.
 */

#ifndef VIRTUAL_ENCODER_H
#define VIRTUAL_ENCODER_H

#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include "drivers/drv2605l.h"

#ifdef __cplusplus
extern "C" {
#endif

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

#ifndef VHE_DETENT_ANGLE
#define VHE_DETENT_ANGLE        15.0f   // Degrees per haptic tick
#endif

#ifndef VHE_FRICTION_COEFF
#define VHE_FRICTION_COEFF      0.05f   // Flywheel friction μ
#endif

#ifndef VHE_MIN_VELOCITY
#define VHE_MIN_VELOCITY        2.0f    // Min angular velocity for flywheel
#endif

#define VHE_MAX_VELOCITY        1000.0f // Max angular velocity cap

// ═══════════════════════════════════════════════════════════════════════════
// STATE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    VHE_STATE_IDLE,         // Not being touched
    VHE_STATE_TRACKING,     // Finger on dial
    VHE_STATE_FLYWHEEL,     // Released with momentum (spinning down)
} vhe_state_t;

typedef struct {
    // State
    vhe_state_t state;
    
    // Position tracking
    float current_angle;        // Current angular position (degrees)
    float start_angle;          // Angle when touch started
    float last_angle;           // Previous frame angle
    float accumulated_rotation; // Total rotation since last detent
    
    // Velocity (for flywheel)
    float angular_velocity;     // Degrees per frame
    float velocity_history[4];  // Smoothing buffer
    uint8_t velocity_idx;
    
    // Dial geometry
    int16_t center_x;           // Dial center X coordinate
    int16_t center_y;           // Dial center Y coordinate
    int16_t inner_radius;       // Touch deadzone radius
    int16_t outer_radius;       // Max touch radius
    
    // Value tracking
    int32_t value;              // Encoded value (accumulates)
    int32_t min_value;          // Minimum value
    int32_t max_value;          // Maximum value
    bool wrap;                  // Wrap at limits?
    
    // Haptic driver reference
    drv2605l_t *haptic;
    
    // Callback
    void (*on_change)(int32_t delta, int32_t value);
    
    // Timing
    uint32_t last_update_ms;
    uint32_t last_detent_ms;    // Debounce for detent haptic
} virtual_encoder_t;

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @brief Initialize virtual encoder
 * @param encoder Encoder handle
 * @param center_x Center X coordinate of dial on screen
 * @param center_y Center Y coordinate of dial on screen
 * @param radius Dial radius in pixels
 * @param haptic Pointer to haptic driver (can be NULL)
 */
void vhe_init(virtual_encoder_t *encoder, int16_t center_x, int16_t center_y, 
              int16_t radius, drv2605l_t *haptic);

/**
 * @brief Set value limits
 */
void vhe_set_limits(virtual_encoder_t *encoder, int32_t min, int32_t max, bool wrap);

/**
 * @brief Set current value
 */
void vhe_set_value(virtual_encoder_t *encoder, int32_t value);

/**
 * @brief Set change callback
 */
void vhe_set_callback(virtual_encoder_t *encoder, void (*callback)(int32_t delta, int32_t value));

/**
 * @brief Process touch input
 * @param encoder Encoder handle
 * @param touched Is there a touch?
 * @param x Touch X coordinate
 * @param y Touch Y coordinate
 * @param now Current timestamp (ms)
 */
void vhe_process_touch(virtual_encoder_t *encoder, bool touched, int16_t x, int16_t y, uint32_t now);

/**
 * @brief Update flywheel physics (call every frame)
 * @param encoder Encoder handle
 * @param now Current timestamp (ms)
 * @return true if value changed
 */
bool vhe_update(virtual_encoder_t *encoder, uint32_t now);

/**
 * @brief Check if touch is within dial area
 */
bool vhe_hit_test(virtual_encoder_t *encoder, int16_t x, int16_t y);

/**
 * @brief Get current state for UI rendering
 */
vhe_state_t vhe_get_state(virtual_encoder_t *encoder);

/**
 * @brief Get current angle for UI rendering
 */
float vhe_get_angle(virtual_encoder_t *encoder);

/**
 * @brief Get current value
 */
int32_t vhe_get_value(virtual_encoder_t *encoder);

#ifdef __cplusplus
}
#endif

#endif // VIRTUAL_ENCODER_H

