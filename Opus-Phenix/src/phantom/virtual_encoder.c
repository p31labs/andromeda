/**
 * VIRTUAL HAPTIC ENCODER (VHE) - Implementation
 * 
 * The physics that make the "Phantom Click" feel real.
 */

#include "virtual_encoder.h"
#include "esp_log.h"
#include <string.h>

static const char *TAG = "VHE";

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

static float calc_angle(int16_t x, int16_t y, int16_t cx, int16_t cy) {
    float dx = (float)(x - cx);
    float dy = (float)(y - cy);
    float angle = atan2f(dy, dx) * (180.0f / M_PI);
    return angle;
}

static float angle_diff(float a, float b) {
    // Calculate shortest angular distance (-180 to +180)
    float diff = a - b;
    while (diff > 180.0f) diff -= 360.0f;
    while (diff < -180.0f) diff += 360.0f;
    return diff;
}

static float smooth_velocity(virtual_encoder_t *encoder, float new_vel) {
    encoder->velocity_history[encoder->velocity_idx] = new_vel;
    encoder->velocity_idx = (encoder->velocity_idx + 1) % 4;
    
    float sum = 0;
    for (int i = 0; i < 4; i++) {
        sum += encoder->velocity_history[i];
    }
    return sum / 4.0f;
}

static void fire_detent(virtual_encoder_t *encoder, uint32_t now) {
    // Debounce: minimum 20ms between detents
    if (now - encoder->last_detent_ms < 20) return;
    encoder->last_detent_ms = now;
    
    // Fire haptic tick
    if (encoder->haptic && encoder->haptic->initialized) {
        drv2605l_play_preset(encoder->haptic, HAPTIC_TICK);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

void vhe_init(virtual_encoder_t *encoder, int16_t center_x, int16_t center_y,
              int16_t radius, drv2605l_t *haptic) {
    memset(encoder, 0, sizeof(virtual_encoder_t));
    
    encoder->state = VHE_STATE_IDLE;
    encoder->center_x = center_x;
    encoder->center_y = center_y;
    encoder->inner_radius = radius / 4;    // 25% inner deadzone
    encoder->outer_radius = radius;
    encoder->haptic = haptic;
    
    // Default limits
    encoder->min_value = INT32_MIN;
    encoder->max_value = INT32_MAX;
    encoder->wrap = false;
    
    ESP_LOGI(TAG, "VHE initialized at (%d, %d) r=%d", center_x, center_y, radius);
}

void vhe_set_limits(virtual_encoder_t *encoder, int32_t min, int32_t max, bool wrap) {
    encoder->min_value = min;
    encoder->max_value = max;
    encoder->wrap = wrap;
}

void vhe_set_value(virtual_encoder_t *encoder, int32_t value) {
    encoder->value = value;
}

void vhe_set_callback(virtual_encoder_t *encoder, void (*callback)(int32_t, int32_t)) {
    encoder->on_change = callback;
}

bool vhe_hit_test(virtual_encoder_t *encoder, int16_t x, int16_t y) {
    float dx = (float)(x - encoder->center_x);
    float dy = (float)(y - encoder->center_y);
    float dist = sqrtf(dx * dx + dy * dy);
    
    return (dist >= encoder->inner_radius && dist <= encoder->outer_radius);
}

void vhe_process_touch(virtual_encoder_t *encoder, bool touched, int16_t x, int16_t y, uint32_t now) {
    float dt = (now - encoder->last_update_ms) / 1000.0f;
    if (dt <= 0) dt = 0.016f;  // Default to ~60fps
    encoder->last_update_ms = now;
    
    if (touched && vhe_hit_test(encoder, x, y)) {
        float touch_angle = calc_angle(x, y, encoder->center_x, encoder->center_y);
        
        if (encoder->state == VHE_STATE_IDLE || encoder->state == VHE_STATE_FLYWHEEL) {
            // Touch started
            encoder->state = VHE_STATE_TRACKING;
            encoder->start_angle = touch_angle;
            encoder->last_angle = touch_angle;
            encoder->angular_velocity = 0;
            
            // Clear velocity history
            memset(encoder->velocity_history, 0, sizeof(encoder->velocity_history));
            
            ESP_LOGD(TAG, "Touch started at %.1f°", touch_angle);
        }
        else if (encoder->state == VHE_STATE_TRACKING) {
            // Calculate rotation delta
            float delta = angle_diff(touch_angle, encoder->last_angle);
            encoder->last_angle = touch_angle;
            encoder->current_angle += delta;
            encoder->accumulated_rotation += delta;
            
            // Calculate angular velocity (degrees/second)
            float instant_velocity = delta / dt;
            encoder->angular_velocity = smooth_velocity(encoder, instant_velocity);
            
            // Check for detent crossing
            while (encoder->accumulated_rotation >= VHE_DETENT_ANGLE) {
                encoder->accumulated_rotation -= VHE_DETENT_ANGLE;
                encoder->value++;
                fire_detent(encoder, now);
                
                // Clamp or wrap
                if (encoder->value > encoder->max_value) {
                    encoder->value = encoder->wrap ? encoder->min_value : encoder->max_value;
                }
                
                if (encoder->on_change) {
                    encoder->on_change(1, encoder->value);
                }
            }
            
            while (encoder->accumulated_rotation <= -VHE_DETENT_ANGLE) {
                encoder->accumulated_rotation += VHE_DETENT_ANGLE;
                encoder->value--;
                fire_detent(encoder, now);
                
                // Clamp or wrap
                if (encoder->value < encoder->min_value) {
                    encoder->value = encoder->wrap ? encoder->max_value : encoder->min_value;
                }
                
                if (encoder->on_change) {
                    encoder->on_change(-1, encoder->value);
                }
            }
        }
    }
    else if (encoder->state == VHE_STATE_TRACKING) {
        // Touch released - check for flywheel
        if (fabsf(encoder->angular_velocity) > VHE_MIN_VELOCITY) {
            encoder->state = VHE_STATE_FLYWHEEL;
            ESP_LOGD(TAG, "Flywheel engaged: %.1f°/s", encoder->angular_velocity);
        } else {
            encoder->state = VHE_STATE_IDLE;
        }
    }
}

bool vhe_update(virtual_encoder_t *encoder, uint32_t now) {
    if (encoder->state != VHE_STATE_FLYWHEEL) {
        return false;
    }
    
    float dt = (now - encoder->last_update_ms) / 1000.0f;
    if (dt <= 0) dt = 0.016f;
    encoder->last_update_ms = now;
    
    bool changed = false;
    
    // Apply friction
    encoder->angular_velocity *= (1.0f - VHE_FRICTION_COEFF);
    
    // Cap velocity
    if (encoder->angular_velocity > VHE_MAX_VELOCITY) {
        encoder->angular_velocity = VHE_MAX_VELOCITY;
    } else if (encoder->angular_velocity < -VHE_MAX_VELOCITY) {
        encoder->angular_velocity = -VHE_MAX_VELOCITY;
    }
    
    // Apply rotation
    float delta = encoder->angular_velocity * dt;
    encoder->current_angle += delta;
    encoder->accumulated_rotation += delta;
    
    // Fire detents based on accumulated rotation
    while (encoder->accumulated_rotation >= VHE_DETENT_ANGLE) {
        encoder->accumulated_rotation -= VHE_DETENT_ANGLE;
        encoder->value++;
        fire_detent(encoder, now);
        changed = true;
        
        if (encoder->value > encoder->max_value) {
            encoder->value = encoder->wrap ? encoder->min_value : encoder->max_value;
        }
        
        if (encoder->on_change) {
            encoder->on_change(1, encoder->value);
        }
    }
    
    while (encoder->accumulated_rotation <= -VHE_DETENT_ANGLE) {
        encoder->accumulated_rotation += VHE_DETENT_ANGLE;
        encoder->value--;
        fire_detent(encoder, now);
        changed = true;
        
        if (encoder->value < encoder->min_value) {
            encoder->value = encoder->wrap ? encoder->max_value : encoder->min_value;
        }
        
        if (encoder->on_change) {
            encoder->on_change(-1, encoder->value);
        }
    }
    
    // Check if flywheel should stop
    if (fabsf(encoder->angular_velocity) < VHE_MIN_VELOCITY) {
        encoder->state = VHE_STATE_IDLE;
        encoder->angular_velocity = 0;
        ESP_LOGD(TAG, "Flywheel stopped");
    }
    
    return changed;
}

vhe_state_t vhe_get_state(virtual_encoder_t *encoder) {
    return encoder->state;
}

float vhe_get_angle(virtual_encoder_t *encoder) {
    return encoder->current_angle;
}

int32_t vhe_get_value(virtual_encoder_t *encoder) {
    return encoder->value;
}

