/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         PHENIX PHANTOM v1.0.0                             ║
 * ║                   "The Phantom Awakens" - Milestone 1                     ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Hardware: Waveshare ESP32-S3 Touch LCD 3.5" Type B                       ║
 * ║  Display:  AXS15231B (QSPI) - 320x480 RGB565                              ║
 * ║  Touch:    AXS15231B integrated (I2C) - Manual handling                   ║
 * ║  PMU:      AXP2101                                                        ║
 * ║  IO:       TCA9554 Expander                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  G.O.D. Protocol - Geometric Operations for Decentralized society        ║
 * ║  © 2026 - Resilience over Convenience, Privacy over Engagement           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "audio.c"
#include "esp_log.h"
#include "esp_heap_caps.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "driver/i2c_master.h"
#include "driver/ledc.h"
#include "driver/gpio.h"
#include "driver/spi_master.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "esp_lcd_panel_vendor.h"
#include "esp_lcd_axs15231b.h"
#include "esp_io_expander_tca9554.h"
#include "esp_timer.h"
#include "esp_lvgl_port.h"
#include "lvgl.h"
#include "ui/tetra_nav.h"

static const char *TAG = "PHENIX";

// ═══════════════════════════════════════════════════════════════════════════
// Hardware Configuration
// ═══════════════════════════════════════════════════════════════════════════

// I2C Bus
#define PIN_I2C_SDA     GPIO_NUM_8
#define PIN_I2C_SCL     GPIO_NUM_7

// QSPI Display
#define PIN_LCD_BL      GPIO_NUM_6
#define PIN_LCD_CS      GPIO_NUM_12
#define PIN_LCD_CLK     GPIO_NUM_5
#define PIN_LCD_DATA0   GPIO_NUM_1
#define PIN_LCD_DATA1   GPIO_NUM_2
#define PIN_LCD_DATA2   GPIO_NUM_3
#define PIN_LCD_DATA3   GPIO_NUM_4

// Display Resolution
#define LCD_H_RES       320
#define LCD_V_RES       480

// I2C Addresses
#define TCA9554_ADDR    ESP_IO_EXPANDER_I2C_TCA9554_ADDRESS_000
#define AXP2101_ADDR    0x34

// ═══════════════════════════════════════════════════════════════════════════
// Global Handles
// ═══════════════════════════════════════════════════════════════════════════

static i2c_master_bus_handle_t i2c_bus = NULL;
static esp_lcd_panel_handle_t panel = NULL;
static esp_lcd_panel_io_handle_t panel_io = NULL;
static esp_io_expander_handle_t expander = NULL;
static esp_lcd_touch_handle_t g_touch_handle = NULL;
static lv_indev_t *g_touch_indev = NULL;

// Touch state (updated by touch task, read by LVGL)
static volatile int16_t g_touch_x = 0;
static volatile int16_t g_touch_y = 0;
static volatile bool g_touch_pressed = false;

// ═══════════════════════════════════════════════════════════════════════════
// AXS15231B Display Init Commands (from xiaozhi firmware)
// ═══════════════════════════════════════════════════════════════════════════

static const axs15231b_lcd_init_cmd_t lcd_init_cmds[] = {
    {0xBB, (uint8_t[]){0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x5A, 0xA5}, 8, 0},
    {0xA0, (uint8_t[]){0xC0, 0x10, 0x00, 0x02, 0x00, 0x00, 0x04, 0x3F, 0x20, 0x05, 0x3F, 0x3F, 0x00, 0x00, 0x00, 0x00, 0x00}, 17, 0},
    {0xA2, (uint8_t[]){0x30, 0x3C, 0x24, 0x14, 0xD0, 0x20, 0xFF, 0xE0, 0x40, 0x19, 0x80, 0x80, 0x80, 0x20, 0xf9, 0x10, 0x02, 0xff, 0xff, 0xF0, 0x90, 0x01, 0x32, 0xA0, 0x91, 0xE0, 0x20, 0x7F, 0xFF, 0x00, 0x5A}, 31, 0},
    {0xD0, (uint8_t[]){0xE0, 0x40, 0x51, 0x24, 0x08, 0x05, 0x10, 0x01, 0x20, 0x15, 0x42, 0xC2, 0x22, 0x22, 0xAA, 0x03, 0x10, 0x12, 0x60, 0x14, 0x1E, 0x51, 0x15, 0x00, 0x8A, 0x20, 0x00, 0x03, 0x3A, 0x12}, 30, 0},
    {0xA3, (uint8_t[]){0xA0, 0x06, 0xAa, 0x00, 0x08, 0x02, 0x0A, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x55, 0x55}, 22, 0},
    {0xC1, (uint8_t[]){0x31, 0x04, 0x02, 0x02, 0x71, 0x05, 0x24, 0x55, 0x02, 0x00, 0x41, 0x00, 0x53, 0xFF, 0xFF, 0xFF, 0x4F, 0x52, 0x00, 0x4F, 0x52, 0x00, 0x45, 0x3B, 0x0B, 0x02, 0x0d, 0x00, 0xFF, 0x40}, 30, 0},
    {0xC3, (uint8_t[]){0x00, 0x00, 0x00, 0x50, 0x03, 0x00, 0x00, 0x00, 0x01, 0x80, 0x01}, 11, 0},
    {0xC4, (uint8_t[]){0x00, 0x24, 0x33, 0x80, 0x00, 0xea, 0x64, 0x32, 0xC8, 0x64, 0xC8, 0x32, 0x90, 0x90, 0x11, 0x06, 0xDC, 0xFA, 0x00, 0x00, 0x80, 0xFE, 0x10, 0x10, 0x00, 0x0A, 0x0A, 0x44, 0x50}, 29, 0},
    {0xC5, (uint8_t[]){0x18, 0x00, 0x00, 0x03, 0xFE, 0x3A, 0x4A, 0x20, 0x30, 0x10, 0x88, 0xDE, 0x0D, 0x08, 0x0F, 0x0F, 0x01, 0x3A, 0x4A, 0x20, 0x10, 0x10, 0x00}, 23, 0},
    {0xC6, (uint8_t[]){0x05, 0x0A, 0x05, 0x0A, 0x00, 0xE0, 0x2E, 0x0B, 0x12, 0x22, 0x12, 0x22, 0x01, 0x03, 0x00, 0x3F, 0x6A, 0x18, 0xC8, 0x22}, 20, 0},
    {0xC7, (uint8_t[]){0x50, 0x32, 0x28, 0x00, 0xa2, 0x80, 0x8f, 0x00, 0x80, 0xff, 0x07, 0x11, 0x9c, 0x67, 0xff, 0x24, 0x0c, 0x0d, 0x0e, 0x0f}, 20, 0},
    {0xC9, (uint8_t[]){0x33, 0x44, 0x44, 0x01}, 4, 0},
    {0xCF, (uint8_t[]){0x2C, 0x1E, 0x88, 0x58, 0x13, 0x18, 0x56, 0x18, 0x1E, 0x68, 0x88, 0x00, 0x65, 0x09, 0x22, 0xC4, 0x0C, 0x77, 0x22, 0x44, 0xAA, 0x55, 0x08, 0x08, 0x12, 0xA0, 0x08}, 27, 0},
    {0xD5, (uint8_t[]){0x40, 0x8E, 0x8D, 0x01, 0x35, 0x04, 0x92, 0x74, 0x04, 0x92, 0x74, 0x04, 0x08, 0x6A, 0x04, 0x46, 0x03, 0x03, 0x03, 0x03, 0x82, 0x01, 0x03, 0x00, 0xE0, 0x51, 0xA1, 0x00, 0x00, 0x00}, 30, 0},
    {0xD6, (uint8_t[]){0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE, 0x93, 0x00, 0x01, 0x83, 0x07, 0x07, 0x00, 0x07, 0x07, 0x00, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x00, 0x84, 0x00, 0x20, 0x01, 0x00}, 30, 0},
    {0xD7, (uint8_t[]){0x03, 0x01, 0x0b, 0x09, 0x0f, 0x0d, 0x1E, 0x1F, 0x18, 0x1d, 0x1f, 0x19, 0x40, 0x8E, 0x04, 0x00, 0x20, 0xA0, 0x1F}, 19, 0},
    {0xD8, (uint8_t[]){0x02, 0x00, 0x0a, 0x08, 0x0e, 0x0c, 0x1E, 0x1F, 0x18, 0x1d, 0x1f, 0x19}, 12, 0},
    {0xD9, (uint8_t[]){0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F}, 12, 0},
    {0xDD, (uint8_t[]){0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F}, 12, 0},
    {0xDF, (uint8_t[]){0x44, 0x73, 0x4B, 0x69, 0x00, 0x0A, 0x02, 0x90}, 8, 0},
    {0xE0, (uint8_t[]){0x3B, 0x28, 0x10, 0x16, 0x0c, 0x06, 0x11, 0x28, 0x5c, 0x21, 0x0D, 0x35, 0x13, 0x2C, 0x33, 0x28, 0x0D}, 17, 0},
    {0xE1, (uint8_t[]){0x37, 0x28, 0x10, 0x16, 0x0b, 0x06, 0x11, 0x28, 0x5C, 0x21, 0x0D, 0x35, 0x14, 0x2C, 0x33, 0x28, 0x0F}, 17, 0},
    {0xE2, (uint8_t[]){0x3B, 0x07, 0x12, 0x18, 0x0E, 0x0D, 0x17, 0x35, 0x44, 0x32, 0x0C, 0x14, 0x14, 0x36, 0x3A, 0x2F, 0x0D}, 17, 0},
    {0xE3, (uint8_t[]){0x37, 0x07, 0x12, 0x18, 0x0E, 0x0D, 0x17, 0x35, 0x44, 0x32, 0x0C, 0x14, 0x14, 0x36, 0x32, 0x2F, 0x0F}, 17, 0},
    {0xE4, (uint8_t[]){0x3B, 0x07, 0x12, 0x18, 0x0E, 0x0D, 0x17, 0x39, 0x44, 0x2E, 0x0C, 0x14, 0x14, 0x36, 0x3A, 0x2F, 0x0D}, 17, 0},
    {0xE5, (uint8_t[]){0x37, 0x07, 0x12, 0x18, 0x0E, 0x0D, 0x17, 0x39, 0x44, 0x2E, 0x0C, 0x14, 0x14, 0x36, 0x3A, 0x2F, 0x0F}, 17, 0},
    {0xA4, (uint8_t[]){0x85, 0x85, 0x95, 0x82, 0xAF, 0xAA, 0xAA, 0x80, 0x10, 0x30, 0x40, 0x40, 0x20, 0xFF, 0x60, 0x30}, 16, 0},
    {0xA4, (uint8_t[]){0x85, 0x85, 0x95, 0x85}, 4, 0},
    {0xBB, (uint8_t[]){0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, 8, 0},
    {0x13, (uint8_t[]){0x00}, 0, 0},
    {0x11, (uint8_t[]){0x00}, 0, 120},
    {0x2C, (uint8_t[]){0x00, 0x00, 0x00, 0x00}, 4, 0},
    {0x2a, (uint8_t[]){0x00, 0x00, 0x01, 0x3f}, 4, 0},
    {0x2b, (uint8_t[]){0x00, 0x00, 0x01, 0xdf}, 4, 0}
};

// ═══════════════════════════════════════════════════════════════════════════
// Hardware Initialization
// ═══════════════════════════════════════════════════════════════════════════

static esp_err_t i2c_write_byte(uint8_t addr, uint8_t reg, uint8_t val) {
    i2c_device_config_t cfg = {};
    cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    cfg.device_address = addr;
    cfg.scl_speed_hz = 400000;
    
    i2c_master_dev_handle_t dev;
    esp_err_t ret = i2c_master_bus_add_device(i2c_bus, &cfg, &dev);
    if (ret != ESP_OK) return ret;
    
    uint8_t buf[2] = {reg, val};
    ret = i2c_master_transmit(dev, buf, 2, 100);
    i2c_master_bus_rm_device(dev);
    return ret;
}

static void init_i2c(void) {
    i2c_master_bus_config_t cfg = {};
    cfg.clk_source = I2C_CLK_SRC_DEFAULT;
    cfg.i2c_port = I2C_NUM_0;
    cfg.scl_io_num = PIN_I2C_SCL;
    cfg.sda_io_num = PIN_I2C_SDA;
    cfg.glitch_ignore_cnt = 7;
    cfg.flags.enable_internal_pullup = true;
    ESP_ERROR_CHECK(i2c_new_master_bus(&cfg, &i2c_bus));
}

static void init_io_expander(void) {
    ESP_ERROR_CHECK(esp_io_expander_new_i2c_tca9554(i2c_bus, TCA9554_ADDR, &expander));
    
    // Configure reset pins as outputs
    ESP_ERROR_CHECK(esp_io_expander_set_dir(expander, 
        IO_EXPANDER_PIN_NUM_0 | IO_EXPANDER_PIN_NUM_1, IO_EXPANDER_OUTPUT));
    
    // Assert reset (LOW)
    ESP_ERROR_CHECK(esp_io_expander_set_level(expander, 
        IO_EXPANDER_PIN_NUM_0 | IO_EXPANDER_PIN_NUM_1, 0));
    vTaskDelay(pdMS_TO_TICKS(100));
    
    // Release reset (HIGH)
    ESP_ERROR_CHECK(esp_io_expander_set_level(expander, 
        IO_EXPANDER_PIN_NUM_0 | IO_EXPANDER_PIN_NUM_1, 1));
    vTaskDelay(pdMS_TO_TICKS(200));
}

static void init_pmu(void) {
    // Enable DC1 only
    i2c_write_byte(AXP2101_ADDR, 0x80, 0x01);
    // Disable all LDOs first
    i2c_write_byte(AXP2101_ADDR, 0x90, 0x00);
    i2c_write_byte(AXP2101_ADDR, 0x91, 0x00);
    // DC1 = 3.3V
    i2c_write_byte(AXP2101_ADDR, 0x82, (3300 - 1500) / 100);
    // ALDO1 = 3.3V
    i2c_write_byte(AXP2101_ADDR, 0x92, (3300 - 500) / 100);
    // BLDO1 = 1.5V, BLDO2 = 2.8V
    i2c_write_byte(AXP2101_ADDR, 0x96, (1500 - 500) / 100);
    i2c_write_byte(AXP2101_ADDR, 0x97, (2800 - 500) / 100);
    // Enable ALDO1, BLDO1, BLDO2
    i2c_write_byte(AXP2101_ADDR, 0x90, 0x31);
    vTaskDelay(pdMS_TO_TICKS(100));
}

static void init_display(void) {
    // QSPI bus configuration
    spi_bus_config_t buscfg = {};
    buscfg.data0_io_num = PIN_LCD_DATA0;
    buscfg.data1_io_num = PIN_LCD_DATA1;
    buscfg.data2_io_num = PIN_LCD_DATA2;
    buscfg.data3_io_num = PIN_LCD_DATA3;
    buscfg.sclk_io_num = PIN_LCD_CLK;
    buscfg.max_transfer_sz = LCD_H_RES * 80 * sizeof(uint16_t);
    ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &buscfg, SPI_DMA_CH_AUTO));
    
    // Panel IO configuration
    esp_lcd_panel_io_spi_config_t io_config = AXS15231B_PANEL_IO_QSPI_CONFIG(PIN_LCD_CS, NULL, NULL);
    ESP_ERROR_CHECK(esp_lcd_new_panel_io_spi(SPI2_HOST, &io_config, &panel_io));
    
    // Panel driver configuration
    const axs15231b_vendor_config_t vendor_config = {
        .init_cmds = lcd_init_cmds,
        .init_cmds_size = sizeof(lcd_init_cmds) / sizeof(lcd_init_cmds[0]),
        .flags = { .use_qspi_interface = 1 },
    };
    esp_lcd_panel_dev_config_t panel_config = {};
    panel_config.reset_gpio_num = -1;
    panel_config.rgb_ele_order = LCD_RGB_ELEMENT_ORDER_RGB;
    panel_config.bits_per_pixel = 16;
    panel_config.vendor_config = (void *)&vendor_config;
    
    ESP_ERROR_CHECK(esp_lcd_new_panel_axs15231b(panel_io, &panel_config, &panel));
    ESP_ERROR_CHECK(esp_lcd_panel_reset(panel));
    ESP_ERROR_CHECK(esp_lcd_panel_init(panel));
    ESP_ERROR_CHECK(esp_lcd_panel_invert_color(panel, false));
    ESP_ERROR_CHECK(esp_lcd_panel_swap_xy(panel, false));
    ESP_ERROR_CHECK(esp_lcd_panel_mirror(panel, false, false));
}

static void init_backlight(void) {
    ledc_timer_config_t timer = {};
    timer.speed_mode = LEDC_LOW_SPEED_MODE;
    timer.timer_num = LEDC_TIMER_1;
    timer.duty_resolution = LEDC_TIMER_10_BIT;
    timer.freq_hz = 5000;
    timer.clk_cfg = LEDC_AUTO_CLK;
    ESP_ERROR_CHECK(ledc_timer_config(&timer));

    ledc_channel_config_t channel = {};
    channel.speed_mode = LEDC_LOW_SPEED_MODE;
    channel.channel = LEDC_CHANNEL_0;
    channel.timer_sel = LEDC_TIMER_1;
    channel.gpio_num = PIN_LCD_BL;
    channel.duty = 0;
    channel.hpoint = 0;
    ESP_ERROR_CHECK(ledc_channel_config(&channel));

    // Set to 80% brightness
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, (80 * 1023) / 100);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Touch Input (Manual Handling - avoids esp_lvgl_port corruption)
// ═══════════════════════════════════════════════════════════════════════════

static void lvgl_touch_read_cb(lv_indev_t *indev, lv_indev_data_t *data) {
    data->point.x = g_touch_x;
    data->point.y = g_touch_y;
    data->state = g_touch_pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

static void touch_task(void *arg) {
    uint16_t touch_x[1];
    uint16_t touch_y[1];
    uint8_t touch_cnt = 0;
    
    while (1) {
        if (g_touch_handle != NULL) {
            esp_err_t ret = esp_lcd_touch_read_data(g_touch_handle);
            if (ret == ESP_OK) {
                #pragma GCC diagnostic push
                #pragma GCC diagnostic ignored "-Wdeprecated-declarations"
                bool touched = esp_lcd_touch_get_coordinates(g_touch_handle, touch_x, touch_y, NULL, &touch_cnt, 1);
                #pragma GCC diagnostic pop
                
                static bool was_touched = false;
                if (touched && touch_cnt > 0) {
                    // Raw coordinates from 480x320 touch panel
                    int raw_x = touch_x[0];
                    int raw_y = touch_y[0];
                    
                    // Transform to 320x480 display coordinates:
                    // Swap X/Y and scale to display resolution
                    int screen_x = (raw_y * LCD_H_RES) / 320;  // Y becomes X
                    int screen_y = (raw_x * LCD_V_RES) / 480;  // X becomes Y
                    
                    // Clamp to screen bounds
                    if (screen_x < 0) screen_x = 0;
                    if (screen_x >= LCD_H_RES) screen_x = LCD_H_RES - 1;
                    if (screen_y < 0) screen_y = 0;
                    if (screen_y >= LCD_V_RES) screen_y = LCD_V_RES - 1;
                    
                    g_touch_x = screen_x;
                    g_touch_y = screen_y;
                    g_touch_pressed = true;
                    
                    // Debug: log only on first touch
                    if (!was_touched) {
                        ESP_LOGI(TAG, "TAP: raw(%d,%d) -> screen(%d,%d)", raw_x, raw_y, screen_x, screen_y);
                    }
                    was_touched = true;
                } else {
                    was_touched = false;
                    g_touch_pressed = false;
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(20)); // 50Hz polling
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LVGL Setup
// ═══════════════════════════════════════════════════════════════════════════

static void init_lvgl_port(void) {
    // Initialize LVGL port
    const lvgl_port_cfg_t lvgl_cfg = ESP_LVGL_PORT_INIT_CONFIG();
    ESP_ERROR_CHECK(lvgl_port_init(&lvgl_cfg));
    
    // Add display
    lvgl_port_display_cfg_t disp_cfg = {};
    disp_cfg.io_handle = panel_io;
    disp_cfg.panel_handle = panel;
    disp_cfg.buffer_size = LCD_H_RES * LCD_V_RES / 8;
    disp_cfg.double_buffer = true;
    disp_cfg.hres = LCD_H_RES;
    disp_cfg.vres = LCD_V_RES;
    disp_cfg.monochrome = false;
    disp_cfg.rotation.swap_xy = false;
    disp_cfg.rotation.mirror_x = true;
    disp_cfg.rotation.mirror_y = false;
    disp_cfg.flags.buff_dma = false;
    disp_cfg.flags.buff_spiram = true;
    disp_cfg.flags.sw_rotate = true;
    disp_cfg.flags.swap_bytes = true;
    
    lv_display_t *disp = lvgl_port_add_disp(&disp_cfg);
    if (disp == NULL) {
        ESP_LOGE(TAG, "Failed to add display!");
        return;
    }
    
    // Initialize touch controller
    // Raw touch - we'll transform coordinates manually
    esp_lcd_touch_config_t tp_cfg = {
        .x_max = 480,
        .y_max = 320,
        .rst_gpio_num = GPIO_NUM_NC,
        .int_gpio_num = GPIO_NUM_NC,
        .levels = { .reset = 0, .interrupt = 0 },
        .flags = { .swap_xy = 0, .mirror_x = 0, .mirror_y = 0 },
    };
    
    esp_lcd_panel_io_handle_t tp_io_handle = NULL;
    esp_lcd_panel_io_i2c_config_t tp_io_config = ESP_LCD_TOUCH_IO_I2C_AXS15231B_CONFIG();
    tp_io_config.scl_speed_hz = 400 * 1000;
    
    esp_lcd_new_panel_io_i2c(i2c_bus, &tp_io_config, &tp_io_handle);
    
    if (tp_io_handle != NULL) {
        esp_lcd_touch_handle_t tp = NULL;
        esp_err_t touch_ret = esp_lcd_touch_new_i2c_axs15231b(tp_io_handle, &tp_cfg, &tp);
        if (touch_ret == ESP_OK && tp != NULL) {
            g_touch_handle = tp;
            ESP_LOGI(TAG, "Touch controller initialized");
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI Creation - Tetrahedral Navigation
// ═══════════════════════════════════════════════════════════════════════════

static void on_vertex_selected(tetra_vertex_t vertex) {
    ESP_LOGI(TAG, "Mode selected: %s", tetra_vertex_name(vertex));
    // TODO: Switch to mode-specific screens
}

static void create_ui(void) {
    lvgl_port_lock(0);
    
    lv_obj_t *scr = lv_screen_active();
    lv_obj_set_style_bg_color(scr, lv_color_hex(0x000810), 0);
    
    // Title - Coherence Blue
    lv_obj_t *title = lv_label_create(scr);
    lv_label_set_text(title, "PHENIX PHANTOM");
    lv_obj_set_style_text_color(title, lv_color_hex(0x00FFFF), 0);
    lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 10);
    
    // Create tetrahedral navigation
    tetra_nav_create(scr, on_vertex_selected);
    
    // Version footer
    lv_obj_t *version = lv_label_create(scr);
    lv_label_set_text(version, "v1.1.0 | Tetrahedral Nav");
    lv_obj_set_style_text_color(version, lv_color_hex(0x333333), 0);
    lv_obj_align(version, LV_ALIGN_BOTTOM_MID, 0, -10);
    
    lvgl_port_unlock();
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

extern "C" void app_main(void) {
    printf("\n\n");
    ESP_LOGI(TAG, "╔═══════════════════════════════════════════════════════╗");
    ESP_LOGI(TAG, "║        PHENIX PHANTOM v1.1.0 - Tetrahedral UI         ║");
    ESP_LOGI(TAG, "║            G.O.D. Protocol Navigation                 ║");
    ESP_LOGI(TAG, "╚═══════════════════════════════════════════════════════╝");

    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // Hardware initialization
    ESP_LOGI(TAG, "[1/6] I2C Bus...");
    init_i2c();
    
    ESP_LOGI(TAG, "[2/6] IO Expander...");
    init_io_expander();
    
    ESP_LOGI(TAG, "[3/6] Power Management...");
    init_pmu();
    
    ESP_LOGI(TAG, "[4/6] Display (QSPI)...");
    init_display();
    
    ESP_LOGI(TAG, "[5/6] Backlight...");
    init_backlight();
    
    ESP_LOGI(TAG, "[6/6] LVGL + Touch...");
    init_lvgl_port();

    // Audio initialization (ES8311/I2S)
    audio_init(i2c_bus);
    
    // Start touch polling task
    xTaskCreate(touch_task, "touch", 4096, NULL, 3, NULL);
    
    // Create manual LVGL input device
    if (lvgl_port_lock(0)) {
        g_touch_indev = lv_indev_create();
        lv_indev_set_type(g_touch_indev, LV_INDEV_TYPE_POINTER);
        lv_indev_set_read_cb(g_touch_indev, lvgl_touch_read_cb);
        lvgl_port_unlock();
    }
    
    // Create UI
    create_ui();

    ESP_LOGI(TAG, "");
    ESP_LOGI(TAG, "  ✓ PHENIX PHANTOM OPERATIONAL");
    ESP_LOGI(TAG, "");
    ESP_LOGI(TAG, "  Heap: %lu KB free", esp_get_free_heap_size() / 1024);
    ESP_LOGI(TAG, "");

    // Main loop - just monitor heap
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(10000));
        ESP_LOGI(TAG, "Heap: %lu KB", esp_get_free_heap_size() / 1024);
    }
}
