#include "touch.h"
#include "config.h"
#include "bus_mutex.h"
#include "driver/i2c.h"
#include "esp_log.h"
#include "lvgl.h"

static const char *TAG = "touch";

// AXS15231B touch I2C read: send 2-byte command, receive 7 bytes.
// Protocol observed on Waveshare ESP32-S3-Touch-LCD-3.5B Type B hardware.
// [0]: touch count (& 0x0F)
// [1..2]: X high nibble + X low byte
// [3..4]: Y high nibble + Y low byte
// [5..6]: pressure / event
static bool axs_read_raw(uint16_t *x_out, uint16_t *y_out) {
    const uint8_t cmd[2] = {0x01, 0x10};
    uint8_t buf[7] = {0};

    esp_err_t err = i2c_master_write_read_device(
        I2C_MASTER_NUM, TOUCH_I2C_ADDR,
        cmd, sizeof(cmd),
        buf, sizeof(buf),
        pdMS_TO_TICKS(20));

    if (err != ESP_OK) return false;
    if ((buf[0] & 0x0F) == 0) return false;

    *x_out = ((uint16_t)(buf[1] & 0x0F) << 8) | buf[2];
    *y_out = ((uint16_t)(buf[3] & 0x0F) << 8) | buf[4];
    return true;
}

// ── LVGL read callback (called every LV_INDEV_DEF_READ_PERIOD ms) ────────────
static void touch_read_cb(lv_indev_drv_t *drv, lv_indev_data_t *data) {
    uint16_t tx = 0, ty = 0;
    bool pressed = false;

    // Mutex required: PMIC + codec + touch share I2C_NUM_0
    if (bus_mutex_take(30)) {
        pressed = axs_read_raw(&tx, &ty);
        bus_mutex_give();
    }

    if (pressed) {
        // Transform physical → logical coordinates for LV_DISP_ROT_90 (90° CW).
        // Physical panel: H_RES=480 (x), V_RES=320 (y).
        // LVGL logical after sw_rotate: width=320, height=480.
        // 90° CW: logical_x = ty, logical_y = H_RES-1 - tx
        data->point.x = (lv_coord_t)ty;
        data->point.y = (lv_coord_t)(DISPLAY_H_RES - 1 - tx);
        data->state   = LV_INDEV_STATE_PR;
    } else {
        data->state = LV_INDEV_STATE_REL;
    }
}

// ── Public API ─────────────────────────────────────────────────────────────────
lv_indev_t *touch_init(void) {
    // Probe device — abort early if nothing responds on 0x3B
    uint8_t probe_cmd[2] = {0x01, 0x10};
    uint8_t probe_buf[1] = {0};
    esp_err_t err = i2c_master_write_read_device(
        I2C_MASTER_NUM, TOUCH_I2C_ADDR,
        probe_cmd, sizeof(probe_cmd),
        probe_buf, sizeof(probe_buf),
        pdMS_TO_TICKS(20));
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "AXS15231B touch not found at 0x%02X (err %d)", TOUCH_I2C_ADDR, err);
        return NULL;
    }

    static lv_indev_drv_t indev_drv;
    lv_indev_drv_init(&indev_drv);
    indev_drv.type    = LV_INDEV_TYPE_POINTER;
    indev_drv.read_cb = touch_read_cb;

    lv_indev_t *indev = lv_indev_drv_register(&indev_drv);
    if (!indev) {
        ESP_LOGE(TAG, "LVGL indev registration failed");
        return NULL;
    }
    ESP_LOGI(TAG, "AXS15231B touch ready (I2C 0x%02X, rot-corrected)", TOUCH_I2C_ADDR);
    return indev;
}
