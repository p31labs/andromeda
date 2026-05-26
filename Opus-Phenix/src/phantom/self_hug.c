/**
 * SELF-HUG E-STOP PROTOCOL - Implementation
 * 
 * "Clutch the device. You are safe."
 */

#include "self_hug.h"
#include "esp_log.h"
#include <string.h>
#include <math.h>

static const char *TAG = "SELFHUG";

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

void selfhug_init(selfhug_t *selfhug, drv2605l_t *haptic) {
    memset(selfhug, 0, sizeof(selfhug_t));
    selfhug->state = SELFHUG_STATE_NORMAL;
    selfhug->haptic = haptic;
    
    ESP_LOGI(TAG, "Self-Hug protocol initialized");
}

void selfhug_set_callbacks(selfhug_t *selfhug,
                           selfhug_enter_cb_t on_enter,
                           selfhug_exit_cb_t on_exit,
                           selfhug_mesh_broadcast_cb_t on_broadcast) {
    selfhug->on_enter = on_enter;
    selfhug->on_exit = on_exit;
    selfhug->on_broadcast = on_broadcast;
}

void selfhug_update_touch(selfhug_t *selfhug, uint8_t touch_points, 
                          uint16_t surface_pct, uint32_t now) {
    selfhug->touch_points = touch_points;
    selfhug->touch_surface_pct = surface_pct;
    
    // Check touch condition
    bool condition = (touch_points >= SELFHUG_TOUCH_POINTS_MIN &&
                      surface_pct >= SELFHUG_SURFACE_AREA_MIN);
    
    if (condition && !selfhug->touch_condition_met) {
        selfhug->touch_condition_met = true;
        selfhug->touch_condition_time = now;
        ESP_LOGD(TAG, "Touch condition MET: %d points, %d%% surface", 
                 touch_points, surface_pct);
    }
    else if (!condition) {
        selfhug->touch_condition_met = false;
    }
}

void selfhug_update_imu(selfhug_t *selfhug, float accel_x, float accel_y, 
                        float accel_z, uint32_t now) {
    selfhug->accel_z = accel_z;
    
    // Check IMU condition (jerk toward body = +Z typically)
    // Note: Gravity component is ~1g, so we look for sudden spikes
    bool condition = (fabsf(accel_z) >= SELFHUG_ACCEL_Z_MIN);
    
    if (condition && !selfhug->imu_condition_met) {
        selfhug->imu_condition_met = true;
        selfhug->imu_condition_time = now;
        ESP_LOGD(TAG, "IMU condition MET: Z=%.2fg", accel_z);
    }
    else if (!condition) {
        // Decay with hysteresis
        if (selfhug->imu_condition_met && (now - selfhug->imu_condition_time > 200)) {
            selfhug->imu_condition_met = false;
        }
    }
}

bool selfhug_process(selfhug_t *selfhug, uint32_t now) {
    // Boot grace period - ignore all triggers
    if (now < SELFHUG_BOOT_GRACE_MS) {
        return false;
    }
    
    switch (selfhug->state) {
        case SELFHUG_STATE_NORMAL:
            // Check for sensor fusion trigger
            if (selfhug->touch_condition_met && selfhug->imu_condition_met) {
                // Both conditions met - check timing
                int32_t time_diff = (int32_t)(selfhug->touch_condition_time - 
                                              selfhug->imu_condition_time);
                
                if (abs(time_diff) <= SELFHUG_FUSION_WINDOW_MS) {
                    // TRIGGER!
                    selfhug_force_enter(selfhug, now);
                }
            }
            break;
            
        case SELFHUG_STATE_GROUNDING:
            // Update breath phase
            selfhug->breathe_phase = (now - selfhug->grounding_start_ms) % 
                                     GROUNDING_BREATHE_PERIOD_MS;
            
            // Haptic throb (60 BPM heartbeat)
            if (selfhug_should_throb(selfhug, now)) {
                if (selfhug->haptic && selfhug->haptic->initialized) {
                    drv2605l_play_preset(selfhug->haptic, HAPTIC_THROB);
                }
                selfhug->last_throb_ms = now;
            }
            break;
            
        default:
            break;
    }
    
    return (selfhug->state == SELFHUG_STATE_GROUNDING);
}

bool selfhug_process_tap(selfhug_t *selfhug, uint32_t now) {
    if (selfhug->state != SELFHUG_STATE_GROUNDING) {
        return false;
    }
    
    // Reset if too slow
    if (now - selfhug->last_exit_tap_ms > GROUNDING_EXIT_WINDOW_MS) {
        selfhug->exit_tap_count = 0;
    }
    
    selfhug->exit_tap_count++;
    selfhug->last_exit_tap_ms = now;
    
    ESP_LOGI(TAG, "Exit taps: %d/%d", selfhug->exit_tap_count, GROUNDING_EXIT_TAPS);
    
    // Audio feedback
    if (selfhug->haptic && selfhug->haptic->initialized) {
        drv2605l_play_preset(selfhug->haptic, HAPTIC_TICK);
    }
    
    if (selfhug->exit_tap_count >= GROUNDING_EXIT_TAPS) {
        selfhug_force_exit(selfhug);
        return true;
    }
    
    return false;
}

void selfhug_force_enter(selfhug_t *selfhug, uint32_t now) {
    if (selfhug->state == SELFHUG_STATE_GROUNDING) {
        return;  // Already in grounding
    }
    
    ESP_LOGI(TAG, "════════════════════════════════════════");
    ESP_LOGI(TAG, "  GROUNDING MODE ACTIVATED");
    ESP_LOGI(TAG, "  Breathe... You are safe.");
    ESP_LOGI(TAG, "  Tap 5× anywhere to exit");
    ESP_LOGI(TAG, "════════════════════════════════════════");
    
    selfhug->state = SELFHUG_STATE_GROUNDING;
    selfhug->grounding_start_ms = now;
    selfhug->exit_tap_count = 0;
    selfhug->last_throb_ms = now;
    
    // Callback
    if (selfhug->on_enter) {
        selfhug->on_enter();
    }
    
    // Broadcast to mesh
    if (selfhug->on_broadcast) {
        selfhug->on_broadcast("DISTRESS:OVERWHELMED");
    }
    
    // Entry haptic sequence (descending = calming)
    if (selfhug->haptic && selfhug->haptic->initialized) {
        drv2605l_effect_t sequence[] = {
            DRV_EFFECT_TRANSITION_HUM_1,
            DRV_EFFECT_SMOOTH_HUM_3,
        };
        drv2605l_play_sequence(selfhug->haptic, sequence, 2);
    }
    
    // Serial output for cognitive-shield sync
    printf("[MODE] grounding\n");
}

void selfhug_force_exit(selfhug_t *selfhug) {
    if (selfhug->state != SELFHUG_STATE_GROUNDING) {
        return;
    }
    
    ESP_LOGI(TAG, "════════════════════════════════════════");
    ESP_LOGI(TAG, "  GROUNDING MODE COMPLETE");
    ESP_LOGI(TAG, "  Welcome back. You did great.");
    ESP_LOGI(TAG, "════════════════════════════════════════");
    
    selfhug->state = SELFHUG_STATE_NORMAL;
    
    // Callback
    if (selfhug->on_exit) {
        selfhug->on_exit();
    }
    
    // Broadcast recovery
    if (selfhug->on_broadcast) {
        selfhug->on_broadcast("STATUS:RECOVERED");
    }
    
    // Exit haptic sequence (ascending = energizing)
    if (selfhug->haptic && selfhug->haptic->initialized) {
        drv2605l_effect_t sequence[] = {
            DRV_EFFECT_SMOOTH_HUM_3,
            DRV_EFFECT_TRANSITION_HUM_2,
            DRV_EFFECT_DOUBLE_CLICK_100,
        };
        drv2605l_play_sequence(selfhug->haptic, sequence, 3);
    }
    
    // Serial output for cognitive-shield sync
    printf("[MODE] normal\n");
}

bool selfhug_is_active(selfhug_t *selfhug) {
    return (selfhug->state == SELFHUG_STATE_GROUNDING);
}

float selfhug_get_breath_phase(selfhug_t *selfhug, uint32_t now) {
    if (selfhug->state != SELFHUG_STATE_GROUNDING) {
        return 0.0f;
    }
    
    // Phase: 0.0 → 1.0 → 0.0 over GROUNDING_BREATHE_PERIOD_MS
    uint32_t elapsed = (now - selfhug->grounding_start_ms) % GROUNDING_BREATHE_PERIOD_MS;
    float phase = (float)elapsed / GROUNDING_BREATHE_PERIOD_MS;
    
    // Sinusoidal breathing curve (0 → 1 → 0)
    float breath = sinf(phase * 3.14159f);
    breath = breath * breath;  // Ease in/out
    
    return breath;
}

bool selfhug_should_throb(selfhug_t *selfhug, uint32_t now) {
    if (selfhug->state != SELFHUG_STATE_GROUNDING) {
        return false;
    }
    
    return (now - selfhug->last_throb_ms >= GROUNDING_THROB_PERIOD_MS);
}

