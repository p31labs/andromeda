/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    TETRAHEDRAL NAVIGATION UI                              ║
 * ║              G.O.D. Protocol - Geometric Operations                       ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  The Tetrahedron (K_4) is the fundamental unit of structure.              ║
 * ║  4 vertices, 4 faces, 6 edges - the minimum stable 3D form.               ║
 * ║                                                                           ║
 * ║  Vertex Mapping:                                                          ║
 * ║    [0] SHIELD  - Protection & Privacy (Top)                               ║
 * ║    [1] COMM    - Communication & Mesh (Left)                              ║
 * ║    [2] NAV     - Navigation & Location (Right)                            ║
 * ║    [3] CONFIG  - Settings & Calibration (Bottom)                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

#pragma once

#include "lvgl.h"

#ifdef __cplusplus
extern "C" {
#endif

// Vertex IDs - The 4 corners of existence
typedef enum {
    VERTEX_SHIELD = 0,  // Protection mode
    VERTEX_COMM   = 1,  // Communication mode
    VERTEX_NAV    = 2,  // Navigation mode
    VERTEX_CONFIG = 3,  // Configuration mode
    VERTEX_COUNT  = 4   // Always exactly 4 - no more, no less
} tetra_vertex_t;

// Vertex selection callback
typedef void (*tetra_select_cb_t)(tetra_vertex_t vertex);

// Colors - Coherence palette
#define TETRA_COLOR_BG         0x001020  // Deep space
#define TETRA_COLOR_EDGE       0x00AAAA  // Coherence blue
#define TETRA_COLOR_EDGE_DIM   0x004444  // Dimmed edge
#define TETRA_COLOR_VERTEX     0x00FFFF  // Bright cyan
#define TETRA_COLOR_SELECTED   0xFFD700  // Gold highlight
#define TETRA_COLOR_SHIELD     0xFF4444  // Red - protection
#define TETRA_COLOR_COMM       0x44FF44  // Green - connection
#define TETRA_COLOR_NAV        0x4444FF  // Blue - navigation
#define TETRA_COLOR_CONFIG     0xFFFF44  // Yellow - settings

/**
 * Create the tetrahedral navigation UI
 * @param parent Parent LVGL object (typically screen)
 * @param callback Function called when vertex is selected
 * @return The tetrahedron container object
 */
lv_obj_t *tetra_nav_create(lv_obj_t *parent, tetra_select_cb_t callback);

/**
 * Set the currently active/highlighted vertex
 * @param vertex The vertex to highlight
 */
void tetra_nav_set_active(tetra_vertex_t vertex);

/**
 * Get the currently active vertex
 * @return The active vertex ID
 */
tetra_vertex_t tetra_nav_get_active(void);

/**
 * Rotate the tetrahedron view (animation)
 * @param angle_deg Rotation angle in degrees
 */
void tetra_nav_rotate(int16_t angle_deg);

/**
 * Get vertex name string
 * @param vertex Vertex ID
 * @return Vertex name
 */
const char *tetra_vertex_name(tetra_vertex_t vertex);

#ifdef __cplusplus
}
#endif

