/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   COGNITIVE SHIELD PROTOCOL                                               ║
 * ║   Serial/WebSerial Bridge to Cognitive Shield Web App                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * PROTOCOL DESIGN:
 * - JSON commands from Shield → Phenix (set voltage, trigger haptic, etc.)
 * - Tagged telemetry from Phenix → Shield ([ACCEL], [T], [BAT], etc.)
 * - Binary WSTP packets for mesh optimization (future)
 * 
 * SYNC WITH: cognitive-shield/src/lib/phenix-protocol.ts
 */

#ifndef SHIELD_PROTOCOL_H
#define SHIELD_PROTOCOL_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL VERSION
// ═══════════════════════════════════════════════════════════════════════════

#define SHIELD_PROTOCOL_VERSION_STR     "1.0.0"
#define SHIELD_PROTOCOL_BAUD            115200

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND TYPES (Incoming from Cognitive Shield)
// Sync with: phenix-protocol.ts ShieldCommandType
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    SHIELD_CMD_SET_VOLTAGE      = 0x01,
    SHIELD_CMD_SET_SPOONS       = 0x02,
    SHIELD_CMD_ENTER_GROUNDING  = 0x03,
    SHIELD_CMD_EXIT_GROUNDING   = 0x04,
    SHIELD_CMD_TRIGGER_HAPTIC   = 0x05,
    SHIELD_CMD_SET_LED_PATTERN  = 0x06,
    SHIELD_CMD_SYNC_STATE       = 0x07,
    SHIELD_CMD_MESH_BROADCAST   = 0x08,
    SHIELD_CMD_PING             = 0xFF,
} shield_cmd_type_t;

// ═══════════════════════════════════════════════════════════════════════════
// HAPTIC TYPES
// Sync with: phenix-protocol.ts HapticType
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    HAPTIC_TYPE_CLICK,
    HAPTIC_TYPE_DETENT,
    HAPTIC_TYPE_SUCCESS,
    HAPTIC_TYPE_ERROR,
} haptic_type_t;

// ═══════════════════════════════════════════════════════════════════════════
// LED PATTERNS
// Sync with: phenix-protocol.ts LEDPattern
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    LED_PATTERN_OFF,
    LED_PATTERN_PULSE,
    LED_PATTERN_RAINBOW,
    LED_PATTERN_ALERT,
    LED_PATTERN_PARTY,
} led_pattern_t;

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE STATE (Outgoing to Cognitive Shield)
// Sync with: phenix-protocol.ts PhenixState
// ═══════════════════════════════════════════════════════════════════════════

typedef enum {
    MODE_NORMAL,
    MODE_GROUNDING,
    MODE_BREATHING,
    MODE_HEAVY_WORK,
    MODE_LANGUAGE,
    MODE_DELTA,
} phenix_mode_t;

typedef enum {
    SCREEN_DASHBOARD,
    SCREEN_WIFI,
    SCREEN_DRAW,
    SCREEN_INFO,
    SCREEN_DEV,
    SCREEN_DELTA,
    SCREEN_SETTINGS,
} phenix_screen_t;

typedef struct {
    uint8_t node_id;
    char callsign[17];          // Max 16 chars + null
    char name[33];              // Max 32 chars + null
    char role[17];              // Max 16 chars + null
    uint8_t voltage;            // 1-10
    uint8_t spoons;             // 0-20
    phenix_mode_t mode;
    phenix_screen_t screen;
    uint8_t battery;            // 0-100
    bool mesh_connected;
    int16_t encoder_delta;      // Change since last update
    
    // Sensor data
    struct {
        int16_t x, y, z;
    } accelerometer;
    
    struct {
        bool active;
        int16_t x, y;
    } touch;
    
    struct {
        bool connected;
        int8_t rssi;
        uint8_t networks;
    } wifi;
    
} phenix_state_t;

// ═══════════════════════════════════════════════════════════════════════════
// WSTP TELEMETRY (Binary packed for Whale Song efficiency)
// 2 bytes = entire status over LoRa @ 0.350 kbps
// ═══════════════════════════════════════════════════════════════════════════
//
// ┌─────────────────────────────────────────────────────────────────┐
// │ Bits 0-3   │ voltage (4 bits, 0-15, we use 1-10)               │
// │ Bits 4-8   │ spoons (5 bits, 0-31, we use 0-20)                │
// │ Bit 9      │ emergency flag                                     │
// │ Bit 10     │ grounding active                                   │
// │ Bit 11     │ mesh connected                                     │
// │ Bits 12-15 │ reserved (battery quadrant)                       │
// └─────────────────────────────────────────────────────────────────┘

typedef struct {
    uint8_t voltage;        // 1-10
    uint8_t spoons;         // 0-20
    bool emergency;
    bool grounding;
    bool mesh_connected;
} wstp_telemetry_t;

// ═══════════════════════════════════════════════════════════════════════════
// CALLBACK TYPES
// ═══════════════════════════════════════════════════════════════════════════

typedef void (*shield_set_voltage_cb_t)(uint8_t voltage);
typedef void (*shield_set_spoons_cb_t)(uint8_t spoons);
typedef void (*shield_grounding_cb_t)(bool enter);
typedef void (*shield_haptic_cb_t)(haptic_type_t type);
typedef void (*shield_led_cb_t)(led_pattern_t pattern);
typedef void (*shield_mesh_broadcast_cb_t)(const char* message);
typedef void (*shield_ping_cb_t)(void);

typedef struct {
    shield_set_voltage_cb_t on_set_voltage;
    shield_set_spoons_cb_t on_set_spoons;
    shield_grounding_cb_t on_grounding;
    shield_haptic_cb_t on_haptic;
    shield_led_cb_t on_led;
    shield_mesh_broadcast_cb_t on_mesh_broadcast;
    shield_ping_cb_t on_ping;
} shield_callbacks_t;

// ═══════════════════════════════════════════════════════════════════════════
// PROTOCOL HANDLE
// ═══════════════════════════════════════════════════════════════════════════

typedef struct {
    shield_callbacks_t callbacks;
    phenix_state_t state;
    bool initialized;
    
    // Command parsing
    char cmd_buffer[256];
    uint16_t cmd_idx;
} shield_protocol_t;

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @brief Initialize Shield protocol handler
 */
void shield_init(shield_protocol_t *proto, shield_callbacks_t *callbacks);

/**
 * @brief Process incoming character (call from UART RX)
 * @return true if a complete command was processed
 */
bool shield_process_char(shield_protocol_t *proto, char c);

/**
 * @brief Update state and send telemetry
 */
void shield_update_state(shield_protocol_t *proto, phenix_state_t *state);

/**
 * @brief Send full state as JSON (for initial sync)
 */
void shield_send_state(shield_protocol_t *proto);

/**
 * @brief Send tagged telemetry line
 * Format: [TAG] data
 */
void shield_send_tagged(const char* tag, const char* format, ...);

/**
 * @brief Send accelerometer data
 */
void shield_send_accel(int16_t x, int16_t y, int16_t z);

/**
 * @brief Send touch data
 */
void shield_send_touch(bool active, int16_t x, int16_t y);

/**
 * @brief Send battery data
 */
void shield_send_battery(uint8_t percent);

/**
 * @brief Send mode change
 */
void shield_send_mode(phenix_mode_t mode);

/**
 * @brief Send screen change
 */
void shield_send_screen(phenix_screen_t screen);

/**
 * @brief Encode telemetry to 2-byte WSTP format
 */
void wstp_encode_telemetry(wstp_telemetry_t *in, uint8_t out[2]);

/**
 * @brief Decode 2-byte WSTP telemetry
 */
void wstp_decode_telemetry(uint8_t in[2], wstp_telemetry_t *out);

#ifdef __cplusplus
}
#endif

#endif // SHIELD_PROTOCOL_H

