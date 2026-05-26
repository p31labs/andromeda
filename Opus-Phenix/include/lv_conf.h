/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║   LVGL v9 CONFIGURATION - Opus Phenix                                     ║
 * ║   Optimized for Waveshare ESP32-S3 Type B (QSPI + PSRAM)                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

#ifndef LV_CONF_H
#define LV_CONF_H

#include <stdint.h>

/*====================
   BASIC CONFIGURATION
 *====================*/

/* Color depth: 16 (RGB565) */
#define LV_COLOR_DEPTH 16

/* DPI for font rendering */
#define LV_DPI_DEF 130

/*====================
   MEMORY SETTINGS
 *====================*/

/* Use custom allocator (PSRAM via heap_caps) */
#define LV_MEM_CUSTOM 1
#define LV_MEM_CUSTOM_INCLUDE <esp_heap_caps.h>
#define LV_MEM_CUSTOM_ALLOC(size) heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT)
#define LV_MEM_CUSTOM_FREE(p) heap_caps_free(p)
#define LV_MEM_CUSTOM_REALLOC(p, sz) heap_caps_realloc(p, sz, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT)

/*====================
   DISPLAY SETTINGS
 *====================*/

/* Default display refresh period (ms) */
#define LV_DEF_REFR_PERIOD 16  /* ~60fps */

/* Enable GPU (use software rendering optimizations) */
#define LV_DRAW_SW_COMPLEX 1

/*====================
   OPERATING SYSTEM
 *====================*/

/* Use FreeRTOS */
#define LV_USE_OS LV_OS_FREERTOS

/*====================
   LOGGING
 *====================*/

#define LV_USE_LOG 1
#define LV_LOG_LEVEL LV_LOG_LEVEL_WARN
#define LV_LOG_PRINTF 1

/*====================
   ASSERTS
 *====================*/

#define LV_USE_ASSERT_NULL 1
#define LV_USE_ASSERT_MALLOC 1
#define LV_USE_ASSERT_OBJ 0
#define LV_USE_ASSERT_STYLE 0

/*====================
   FONTS
 *====================*/

/* Built-in fonts */
#define LV_FONT_MONTSERRAT_8  1
#define LV_FONT_MONTSERRAT_10 1
#define LV_FONT_MONTSERRAT_12 1
#define LV_FONT_MONTSERRAT_14 1
#define LV_FONT_MONTSERRAT_16 1
#define LV_FONT_MONTSERRAT_18 1
#define LV_FONT_MONTSERRAT_20 1
#define LV_FONT_MONTSERRAT_22 1
#define LV_FONT_MONTSERRAT_24 1
#define LV_FONT_MONTSERRAT_28 1
#define LV_FONT_MONTSERRAT_32 1

/* Default font */
#define LV_FONT_DEFAULT &lv_font_montserrat_14

/* Enable emoji support */
#define LV_USE_FONT_PLACEHOLDER 1

/*====================
   TEXT SETTINGS
 *====================*/

#define LV_TXT_ENC LV_TXT_ENC_UTF8
#define LV_TXT_BREAK_CHARS " ,.;:-_)]}"
#define LV_TXT_LINE_BREAK_LONG_LEN 0
#define LV_TXT_LINE_BREAK_LONG_PRE_MIN_LEN 3
#define LV_TXT_LINE_BREAK_LONG_POST_MIN_LEN 3

/*====================
   WIDGETS
 *====================*/

/* Base objects */
#define LV_USE_ARC        1
#define LV_USE_BAR        1
#define LV_USE_BTN        1
#define LV_USE_BTNMATRIX  1
#define LV_USE_CANVAS     1
#define LV_USE_CHECKBOX   1
#define LV_USE_DROPDOWN   1
#define LV_USE_IMG        1
#define LV_USE_LABEL      1
#define LV_USE_LINE       1
#define LV_USE_ROLLER     1
#define LV_USE_SLIDER     1
#define LV_USE_SWITCH     1
#define LV_USE_TEXTAREA   1
#define LV_USE_TABLE      1

/* Extra widgets */
#define LV_USE_ANIMIMG    1
#define LV_USE_CALENDAR   1
#define LV_USE_CHART      1
#define LV_USE_COLORWHEEL 1
#define LV_USE_LED        1
#define LV_USE_LIST       1
#define LV_USE_MENU       1
#define LV_USE_METER      1
#define LV_USE_MSGBOX     1
#define LV_USE_SPAN       1
#define LV_USE_SPINBOX    1
#define LV_USE_SPINNER    1
#define LV_USE_TABVIEW    1
#define LV_USE_TILEVIEW   1
#define LV_USE_WIN        1

/*====================
   THEMES
 *====================*/

#define LV_USE_THEME_DEFAULT 1
#define LV_THEME_DEFAULT_DARK 1  /* Dark theme by default (Phenix aesthetic) */

/*====================
   EXTRA FEATURES
 *====================*/

/* File system interface */
#define LV_USE_FS_FATFS 0
#define LV_USE_FS_STDIO 0

/* PNG decoder */
#define LV_USE_PNG 0

/* GIF decoder */
#define LV_USE_GIF 0

/* Snapshot */
#define LV_USE_SNAPSHOT 0

/* Monkey (for testing) */
#define LV_USE_MONKEY 0

/* Grid and flex layouts */
#define LV_USE_GRID 1
#define LV_USE_FLEX 1

/*====================
   ANIMATIONS
 *====================*/

#define LV_USE_ANIMATION 1

/* Default animation time (ms) */
#define LV_ANIM_DEF_TIME 200

/*====================
   GPU/ACCELERATION
 *====================*/

/* Use software rendering (ESP32-S3 has no GPU) */
#define LV_USE_DRAW_SW 1

/*====================
   INPUT DEVICES
 *====================*/

/* Enable touch input */
#define LV_INDEV_DEF_READ_PERIOD 10  /* Read touch every 10ms */

/* Long press time */
#define LV_INDEV_DEF_LONG_PRESS_TIME 400

/* Long press repeat time */  
#define LV_INDEV_DEF_LONG_PRESS_REP_TIME 100

/* Gesture threshold */
#define LV_INDEV_DEF_GESTURE_MIN_VELOCITY 3

#endif /* LV_CONF_H */

