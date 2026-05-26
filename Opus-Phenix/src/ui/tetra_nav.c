/**
 * Tetrahedral Navigation UI Implementation
 * G.O.D. Protocol - "No lists. No feeds. Use spatial interfaces."
 */

#include "tetra_nav.h"
#include "esp_log.h"
#include <math.h>

static const char *TAG = "TETRA";

// ═══════════════════════════════════════════════════════════════════════════
// Internal State
// ═══════════════════════════════════════════════════════════════════════════

static lv_obj_t *s_container = NULL;
static lv_obj_t *s_vertex_btns[VERTEX_COUNT] = {NULL};
static lv_obj_t *s_vertex_labels[VERTEX_COUNT] = {NULL};
static lv_obj_t *s_edge_lines[6] = {NULL};  // 6 edges in a tetrahedron
static lv_obj_t *s_center_label = NULL;
static tetra_vertex_t s_active_vertex = VERTEX_SHIELD;
static tetra_select_cb_t s_callback = NULL;

// Vertex names
static const char *s_vertex_names[VERTEX_COUNT] = {
    "SHIELD",
    "COMM", 
    "NAV",
    "CONFIG"
};

// Vertex icons
static const char *s_vertex_icons[VERTEX_COUNT] = {
    LV_SYMBOL_WARNING,   // Shield - protection
    LV_SYMBOL_CALL,      // Comm - communication
    LV_SYMBOL_GPS,       // Nav - navigation
    LV_SYMBOL_SETTINGS,  // Config - settings
};

// Vertex colors
static const uint32_t s_vertex_colors[VERTEX_COUNT] = {
    TETRA_COLOR_SHIELD,
    TETRA_COLOR_COMM,
    TETRA_COLOR_NAV,
    TETRA_COLOR_CONFIG
};

// Edge connections: v1, v2 for each edge
static const uint8_t s_edges[6][2] = {
    {0, 1}, {0, 2}, {0, 3},  // From top to base
    {1, 2}, {2, 3}, {3, 1}   // Base triangle
};

// 2D positions (pre-calculated for a static tetrahedron view)
// Adjusted for 320x380 container starting at y=35
// Top vertex (SHIELD), then base triangle (COMM left, NAV right, CONFIG bottom)
static const int16_t s_vertex_x[VERTEX_COUNT] = {160, 60, 260, 160};
static const int16_t s_vertex_y[VERTEX_COUNT] = {50, 180, 180, 300};

// ═══════════════════════════════════════════════════════════════════════════
// Edge Drawing using LVGL Line Objects
// ═══════════════════════════════════════════════════════════════════════════

static void update_edge_styles(void) {
    for (int i = 0; i < 6; i++) {
        if (s_edge_lines[i] == NULL) continue;
        
        uint8_t v1 = s_edges[i][0];
        uint8_t v2 = s_edges[i][1];
        
        // Highlight edges connected to active vertex
        if (v1 == s_active_vertex || v2 == s_active_vertex) {
            lv_obj_set_style_line_color(s_edge_lines[i], lv_color_hex(TETRA_COLOR_EDGE), 0);
            lv_obj_set_style_line_width(s_edge_lines[i], 3, 0);
            lv_obj_set_style_line_opa(s_edge_lines[i], LV_OPA_100, 0);
        } else {
            lv_obj_set_style_line_color(s_edge_lines[i], lv_color_hex(TETRA_COLOR_EDGE_DIM), 0);
            lv_obj_set_style_line_width(s_edge_lines[i], 1, 0);
            lv_obj_set_style_line_opa(s_edge_lines[i], LV_OPA_60, 0);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════════════════════════════════════════

static void vertex_click_handler(lv_event_t *e) {
    tetra_vertex_t vertex = (tetra_vertex_t)(intptr_t)lv_event_get_user_data(e);
    
    ESP_LOGI(TAG, "Vertex selected: %s", s_vertex_names[vertex]);
    
    tetra_nav_set_active(vertex);
    
    if (s_callback) {
        s_callback(vertex);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

lv_obj_t *tetra_nav_create(lv_obj_t *parent, tetra_select_cb_t callback) {
    s_callback = callback;
    
    // Main container
    s_container = lv_obj_create(parent);
    lv_obj_set_size(s_container, 320, 380);
    lv_obj_align(s_container, LV_ALIGN_TOP_MID, 0, 35);
    lv_obj_set_style_bg_color(s_container, lv_color_hex(TETRA_COLOR_BG), 0);
    lv_obj_set_style_border_width(s_container, 0, 0);
    lv_obj_set_style_pad_all(s_container, 0, 0);
    lv_obj_clear_flag(s_container, LV_OBJ_FLAG_SCROLLABLE);
    
    // Create edge lines FIRST (so buttons are on top)
    static lv_point_precise_t line_points[6][2];
    for (int i = 0; i < 6; i++) {
        uint8_t v1 = s_edges[i][0];
        uint8_t v2 = s_edges[i][1];
        
        line_points[i][0].x = s_vertex_x[v1];
        line_points[i][0].y = s_vertex_y[v1];
        line_points[i][1].x = s_vertex_x[v2];
        line_points[i][1].y = s_vertex_y[v2];
        
        s_edge_lines[i] = lv_line_create(s_container);
        lv_line_set_points(s_edge_lines[i], line_points[i], 2);
        lv_obj_set_style_line_rounded(s_edge_lines[i], true, 0);
    }
    
    // Create vertex buttons
    for (int i = 0; i < VERTEX_COUNT; i++) {
        s_vertex_btns[i] = lv_button_create(s_container);
        lv_obj_set_size(s_vertex_btns[i], 65, 65);
        lv_obj_set_pos(s_vertex_btns[i], s_vertex_x[i] - 32, s_vertex_y[i] - 32);
        lv_obj_set_style_radius(s_vertex_btns[i], LV_RADIUS_CIRCLE, 0);
        lv_obj_set_style_bg_color(s_vertex_btns[i], lv_color_hex(s_vertex_colors[i]), 0);
        lv_obj_set_style_bg_opa(s_vertex_btns[i], LV_OPA_90, 0);
        lv_obj_set_style_border_width(s_vertex_btns[i], 2, 0);
        lv_obj_set_style_border_color(s_vertex_btns[i], lv_color_hex(TETRA_COLOR_VERTEX), 0);
        lv_obj_set_style_shadow_width(s_vertex_btns[i], 15, 0);
        lv_obj_set_style_shadow_color(s_vertex_btns[i], lv_color_hex(s_vertex_colors[i]), 0);
        lv_obj_set_style_shadow_opa(s_vertex_btns[i], LV_OPA_50, 0);
        
        // Pressed state
        lv_obj_set_style_bg_opa(s_vertex_btns[i], LV_OPA_100, LV_STATE_PRESSED);
        lv_obj_set_style_shadow_opa(s_vertex_btns[i], LV_OPA_100, LV_STATE_PRESSED);
        
        // Icon label
        s_vertex_labels[i] = lv_label_create(s_vertex_btns[i]);
        lv_label_set_text(s_vertex_labels[i], s_vertex_icons[i]);
        lv_obj_set_style_text_color(s_vertex_labels[i], lv_color_hex(0xFFFFFF), 0);
        lv_obj_center(s_vertex_labels[i]);
        
        // Click handler
        lv_obj_add_event_cb(s_vertex_btns[i], vertex_click_handler, 
                           LV_EVENT_CLICKED, (void *)(intptr_t)i);
    }
    
    // Center label showing active mode
    s_center_label = lv_label_create(s_container);
    lv_label_set_text(s_center_label, s_vertex_names[s_active_vertex]);
    lv_obj_set_style_text_color(s_center_label, lv_color_hex(TETRA_COLOR_SELECTED), 0);
    lv_obj_align(s_center_label, LV_ALIGN_CENTER, 0, 20);
    
    // Set initial active state
    tetra_nav_set_active(VERTEX_SHIELD);
    
    ESP_LOGI(TAG, "Tetrahedral navigation created");
    return s_container;
}

void tetra_nav_set_active(tetra_vertex_t vertex) {
    if (vertex >= VERTEX_COUNT) return;
    
    // Remove highlight from previous
    if (s_vertex_btns[s_active_vertex]) {
        lv_obj_set_style_border_width(s_vertex_btns[s_active_vertex], 2, 0);
        lv_obj_set_style_border_color(s_vertex_btns[s_active_vertex], 
                                       lv_color_hex(TETRA_COLOR_VERTEX), 0);
    }
    
    s_active_vertex = vertex;
    
    // Add highlight to new
    if (s_vertex_btns[vertex]) {
        lv_obj_set_style_border_width(s_vertex_btns[vertex], 4, 0);
        lv_obj_set_style_border_color(s_vertex_btns[vertex], 
                                       lv_color_hex(TETRA_COLOR_SELECTED), 0);
    }
    
    // Update center label
    if (s_center_label) {
        lv_label_set_text(s_center_label, s_vertex_names[vertex]);
    }
    
    // Update edge highlighting
    update_edge_styles();
}

tetra_vertex_t tetra_nav_get_active(void) {
    return s_active_vertex;
}

void tetra_nav_rotate(int16_t angle_deg) {
    // Static layout - rotation not implemented yet
    // Could animate positions in the future
    (void)angle_deg;
}

const char *tetra_vertex_name(tetra_vertex_t vertex) {
    if (vertex >= VERTEX_COUNT) return "UNKNOWN";
    return s_vertex_names[vertex];
}
