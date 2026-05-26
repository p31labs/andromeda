/**
 * COGNITIVE SHIELD PROTOCOL - Implementation
 * Serial bridge to cognitive-shield web app
 */

#include "shield_protocol.h"
#include "esp_log.h"
#include <stdio.h>
#include <string.h>
#include <stdarg.h>

static const char *TAG = "SHIELD";

// ═══════════════════════════════════════════════════════════════════════════
// JSON PARSING HELPERS (Minimal, no dependency)
// ═══════════════════════════════════════════════════════════════════════════

static const char* json_find_key(const char* json, const char* key) {
    char search[64];
    snprintf(search, sizeof(search), "\"%s\"", key);
    return strstr(json, search);
}

static int json_get_int(const char* json, const char* key, int default_val) {
    const char* pos = json_find_key(json, key);
    if (!pos) return default_val;
    
    pos = strchr(pos, ':');
    if (!pos) return default_val;
    pos++;
    
    while (*pos == ' ') pos++;
    return atoi(pos);
}

static bool json_get_string(const char* json, const char* key, char* out, size_t max) {
    const char* pos = json_find_key(json, key);
    if (!pos) return false;
    
    pos = strchr(pos, ':');
    if (!pos) return false;
    
    pos = strchr(pos, '"');
    if (!pos) return false;
    pos++;
    
    size_t i = 0;
    while (*pos && *pos != '"' && i < max - 1) {
        out[i++] = *pos++;
    }
    out[i] = '\0';
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

static void process_command(shield_protocol_t *proto, const char* json) {
    ESP_LOGD(TAG, "RX: %s", json);
    
    char type_str[32] = {0};
    if (!json_get_string(json, "type", type_str, sizeof(type_str))) {
        ESP_LOGW(TAG, "Missing 'type' in command");
        return;
    }
    
    // Route command to callback
    if (strcmp(type_str, "SET_VOLTAGE") == 0) {
        int voltage = json_get_int(json, "voltage", -1);
        if (voltage >= 1 && voltage <= 10 && proto->callbacks.on_set_voltage) {
            proto->callbacks.on_set_voltage((uint8_t)voltage);
        }
    }
    else if (strcmp(type_str, "SET_SPOONS") == 0) {
        int spoons = json_get_int(json, "spoons", -1);
        if (spoons >= 0 && spoons <= 20 && proto->callbacks.on_set_spoons) {
            proto->callbacks.on_set_spoons((uint8_t)spoons);
        }
    }
    else if (strcmp(type_str, "ENTER_GROUNDING") == 0) {
        if (proto->callbacks.on_grounding) {
            proto->callbacks.on_grounding(true);
        }
    }
    else if (strcmp(type_str, "EXIT_GROUNDING") == 0) {
        if (proto->callbacks.on_grounding) {
            proto->callbacks.on_grounding(false);
        }
    }
    else if (strcmp(type_str, "TRIGGER_HAPTIC") == 0) {
        char haptic_type[16] = {0};
        if (json_get_string(json, "type", haptic_type, sizeof(haptic_type))) {
            haptic_type_t ht = HAPTIC_TYPE_CLICK;
            if (strcmp(haptic_type, "detent") == 0) ht = HAPTIC_TYPE_DETENT;
            else if (strcmp(haptic_type, "success") == 0) ht = HAPTIC_TYPE_SUCCESS;
            else if (strcmp(haptic_type, "error") == 0) ht = HAPTIC_TYPE_ERROR;
            
            if (proto->callbacks.on_haptic) {
                proto->callbacks.on_haptic(ht);
            }
        }
    }
    else if (strcmp(type_str, "SET_LED_PATTERN") == 0) {
        char pattern[16] = {0};
        if (json_get_string(json, "pattern", pattern, sizeof(pattern))) {
            led_pattern_t lp = LED_PATTERN_OFF;
            if (strcmp(pattern, "pulse") == 0) lp = LED_PATTERN_PULSE;
            else if (strcmp(pattern, "rainbow") == 0) lp = LED_PATTERN_RAINBOW;
            else if (strcmp(pattern, "alert") == 0) lp = LED_PATTERN_ALERT;
            else if (strcmp(pattern, "party") == 0) lp = LED_PATTERN_PARTY;
            
            if (proto->callbacks.on_led) {
                proto->callbacks.on_led(lp);
            }
        }
    }
    else if (strcmp(type_str, "MESH_BROADCAST") == 0) {
        char message[128] = {0};
        if (json_get_string(json, "message", message, sizeof(message))) {
            if (proto->callbacks.on_mesh_broadcast) {
                proto->callbacks.on_mesh_broadcast(message);
            }
        }
    }
    else if (strcmp(type_str, "PING") == 0) {
        if (proto->callbacks.on_ping) {
            proto->callbacks.on_ping();
        }
        // Auto-respond with PONG
        printf("{\"type\":\"PONG\",\"v\":\"%s\"}\n", SHIELD_PROTOCOL_VERSION_STR);
    }
    else {
        ESP_LOGW(TAG, "Unknown command type: %s", type_str);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

void shield_init(shield_protocol_t *proto, shield_callbacks_t *callbacks) {
    memset(proto, 0, sizeof(shield_protocol_t));
    
    if (callbacks) {
        memcpy(&proto->callbacks, callbacks, sizeof(shield_callbacks_t));
    }
    
    proto->initialized = true;
    ESP_LOGI(TAG, "Shield Protocol v%s initialized", SHIELD_PROTOCOL_VERSION_STR);
}

bool shield_process_char(shield_protocol_t *proto, char c) {
    if (!proto->initialized) return false;
    
    // Newline = end of command
    if (c == '\n' || c == '\r') {
        if (proto->cmd_idx > 0) {
            proto->cmd_buffer[proto->cmd_idx] = '\0';
            
            // Check if it's JSON
            if (proto->cmd_buffer[0] == '{') {
                process_command(proto, proto->cmd_buffer);
            }
            
            proto->cmd_idx = 0;
            return true;
        }
        return false;
    }
    
    // Buffer character
    if (proto->cmd_idx < sizeof(proto->cmd_buffer) - 1) {
        proto->cmd_buffer[proto->cmd_idx++] = c;
    }
    
    return false;
}

void shield_update_state(shield_protocol_t *proto, phenix_state_t *state) {
    memcpy(&proto->state, state, sizeof(phenix_state_t));
}

void shield_send_state(shield_protocol_t *proto) {
    phenix_state_t *s = &proto->state;
    
    printf("{\"nodeId\":%d,\"callsign\":\"%s\",\"name\":\"%s\",\"role\":\"%s\","
           "\"voltage\":%d,\"spoons\":%d,\"mode\":\"%s\",\"battery\":%d,"
           "\"meshConnected\":%s}\n",
           s->node_id,
           s->callsign,
           s->name,
           s->role,
           s->voltage,
           s->spoons,
           s->mode == MODE_GROUNDING ? "grounding" : "normal",
           s->battery,
           s->mesh_connected ? "true" : "false");
    fflush(stdout);
}

void shield_send_tagged(const char* tag, const char* format, ...) {
    printf("[%s] ", tag);
    
    va_list args;
    va_start(args, format);
    vprintf(format, args);
    va_end(args);
    
    printf("\n");
    fflush(stdout);
}

void shield_send_accel(int16_t x, int16_t y, int16_t z) {
    printf("[ACCEL] X=%d Y=%d Z=%d\n", x, y, z);
    fflush(stdout);
}

void shield_send_touch(bool active, int16_t x, int16_t y) {
    if (active) {
        printf("[T] %d,%d\n", x, y);
    } else {
        printf("[T] released\n");
    }
    fflush(stdout);
}

void shield_send_battery(uint8_t percent) {
    printf("[BAT] %d%%\n", percent);
    fflush(stdout);
}

void shield_send_mode(phenix_mode_t mode) {
    const char* mode_str = "normal";
    switch (mode) {
        case MODE_GROUNDING: mode_str = "grounding"; break;
        case MODE_BREATHING: mode_str = "breathing"; break;
        case MODE_HEAVY_WORK: mode_str = "heavy_work"; break;
        case MODE_LANGUAGE: mode_str = "language"; break;
        case MODE_DELTA: mode_str = "delta"; break;
        default: break;
    }
    printf("[MODE] %s\n", mode_str);
    fflush(stdout);
}

void shield_send_screen(phenix_screen_t screen) {
    const char* screen_str = "dashboard";
    switch (screen) {
        case SCREEN_WIFI: screen_str = "wifi"; break;
        case SCREEN_DRAW: screen_str = "draw"; break;
        case SCREEN_INFO: screen_str = "info"; break;
        case SCREEN_DEV: screen_str = "dev"; break;
        case SCREEN_DELTA: screen_str = "delta"; break;
        case SCREEN_SETTINGS: screen_str = "settings"; break;
        default: break;
    }
    printf("[APP] %s\n", screen_str);
    fflush(stdout);
}

// ═══════════════════════════════════════════════════════════════════════════
// WSTP BINARY ENCODING
// ═══════════════════════════════════════════════════════════════════════════

void wstp_encode_telemetry(wstp_telemetry_t *in, uint8_t out[2]) {
    uint16_t packed = 0;
    
    packed |= (in->voltage & 0x0F);           // 4 bits
    packed |= (in->spoons & 0x1F) << 4;       // 5 bits
    packed |= (in->emergency ? 1 : 0) << 9;   // 1 bit
    packed |= (in->grounding ? 1 : 0) << 10;  // 1 bit
    packed |= (in->mesh_connected ? 1 : 0) << 11; // 1 bit
    
    out[0] = packed & 0xFF;
    out[1] = (packed >> 8) & 0xFF;
}

void wstp_decode_telemetry(uint8_t in[2], wstp_telemetry_t *out) {
    uint16_t packed = in[0] | (in[1] << 8);
    
    out->voltage = packed & 0x0F;
    out->spoons = (packed >> 4) & 0x1F;
    out->emergency = (packed >> 9) & 0x01;
    out->grounding = (packed >> 10) & 0x01;
    out->mesh_connected = (packed >> 11) & 0x01;
}

