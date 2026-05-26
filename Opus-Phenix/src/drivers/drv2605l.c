/**
 * DRV2605L HAPTIC DRIVER - Implementation
 * The "Phantom Click" for Virtual Haptic Encoder
 */

#include "drv2605l.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "DRV2605L";

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

static esp_err_t write_reg(drv2605l_t *driver, uint8_t reg, uint8_t value) {
    uint8_t buf[2] = { reg, value };
    return i2c_master_transmit(driver->i2c_handle, buf, 2, 100);
}

static esp_err_t read_reg(drv2605l_t *driver, uint8_t reg, uint8_t *value) {
    esp_err_t ret = i2c_master_transmit(driver->i2c_handle, &reg, 1, 100);
    if (ret != ESP_OK) return ret;
    return i2c_master_receive(driver->i2c_handle, value, 1, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

bool drv2605l_probe(i2c_master_bus_handle_t i2c_bus) {
    i2c_device_config_t cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = DRV2605L_ADDR,
        .scl_speed_hz = 400000,
    };
    
    i2c_master_dev_handle_t handle;
    esp_err_t ret = i2c_master_bus_add_device(i2c_bus, &cfg, &handle);
    if (ret != ESP_OK) return false;
    
    uint8_t status;
    ret = i2c_master_transmit_receive(handle, (uint8_t[]){DRV2605L_REG_STATUS}, 1, &status, 1, 100);
    
    i2c_master_bus_rm_device(handle);
    return (ret == ESP_OK);
}

esp_err_t drv2605l_init(drv2605l_t *driver, i2c_master_bus_handle_t i2c_bus, bool use_lra) {
    ESP_LOGI(TAG, "Initializing DRV2605L (LRA=%d)", use_lra);
    
    // Add device to bus
    i2c_device_config_t cfg = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = DRV2605L_ADDR,
        .scl_speed_hz = 400000,
    };
    
    esp_err_t ret = i2c_master_bus_add_device(i2c_bus, &cfg, &driver->i2c_handle);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to add I2C device: %s", esp_err_to_name(ret));
        return ret;
    }
    
    driver->lra_mode = use_lra;
    
    // Exit standby
    ret = write_reg(driver, DRV2605L_REG_MODE, 0x00);
    if (ret != ESP_OK) return ret;
    
    vTaskDelay(pdMS_TO_TICKS(1));
    
    // Select effect library
    // Library 6 = LRA, Library 1-5 = ERM
    uint8_t lib = use_lra ? DRV2605L_LIBRARY_LRA : DRV2605L_LIBRARY_TS2200A;
    ret = write_reg(driver, DRV2605L_REG_LIBRARY, lib);
    if (ret != ESP_OK) return ret;
    
    // Configure feedback control
    uint8_t feedback = 0;
    ret = read_reg(driver, DRV2605L_REG_FEEDBACK, &feedback);
    if (ret != ESP_OK) return ret;
    
    if (use_lra) {
        feedback |= 0x80;   // Set LRA mode bit
    } else {
        feedback &= ~0x80;  // Clear LRA mode bit (ERM)
    }
    ret = write_reg(driver, DRV2605L_REG_FEEDBACK, feedback);
    if (ret != ESP_OK) return ret;
    
    // Configure control registers for optimal response
    // CONTROL1: DRIVE_TIME (optimized for LRA)
    ret = write_reg(driver, DRV2605L_REG_CONTROL1, use_lra ? 0x93 : 0x13);
    if (ret != ESP_OK) return ret;
    
    // CONTROL2: Sample time, blanking time, IDISS time
    ret = write_reg(driver, DRV2605L_REG_CONTROL2, 0xF5);
    if (ret != ESP_OK) return ret;
    
    // CONTROL3: Enable LRA open loop, set data format
    uint8_t ctrl3 = use_lra ? 0x21 : 0x20;  // LRA_OPEN_LOOP = 1 for consistent clicks
    ret = write_reg(driver, DRV2605L_REG_CONTROL3, ctrl3);
    if (ret != ESP_OK) return ret;
    
    driver->initialized = true;
    ESP_LOGI(TAG, "DRV2605L initialized successfully");
    
    return ESP_OK;
}

esp_err_t drv2605l_deinit(drv2605l_t *driver) {
    if (!driver->initialized) return ESP_OK;
    
    // Enter standby
    write_reg(driver, DRV2605L_REG_MODE, DRV2605L_MODE_STANDBY);
    
    // Remove from bus
    i2c_master_bus_rm_device(driver->i2c_handle);
    driver->initialized = false;
    
    return ESP_OK;
}

esp_err_t drv2605l_play_effect(drv2605l_t *driver, drv2605l_effect_t effect) {
    if (!driver->initialized) return ESP_ERR_INVALID_STATE;
    
    esp_err_t ret;
    
    // Set mode to internal trigger
    ret = write_reg(driver, DRV2605L_REG_MODE, DRV2605L_MODE_INTTRIG);
    if (ret != ESP_OK) return ret;
    
    // Set waveform in slot 1
    ret = write_reg(driver, DRV2605L_REG_WAVESEQ1, effect);
    if (ret != ESP_OK) return ret;
    
    // End sequence (0 = stop)
    ret = write_reg(driver, DRV2605L_REG_WAVESEQ2, 0);
    if (ret != ESP_OK) return ret;
    
    // GO!
    ret = write_reg(driver, DRV2605L_REG_GO, 0x01);
    
    return ret;
}

esp_err_t drv2605l_play_sequence(drv2605l_t *driver, const drv2605l_effect_t *effects, uint8_t count) {
    if (!driver->initialized) return ESP_ERR_INVALID_STATE;
    if (count > 8) count = 8;
    
    esp_err_t ret;
    
    // Set mode to internal trigger
    ret = write_reg(driver, DRV2605L_REG_MODE, DRV2605L_MODE_INTTRIG);
    if (ret != ESP_OK) return ret;
    
    // Load waveforms
    for (uint8_t i = 0; i < count; i++) {
        ret = write_reg(driver, DRV2605L_REG_WAVESEQ1 + i, effects[i]);
        if (ret != ESP_OK) return ret;
    }
    
    // End sequence
    if (count < 8) {
        ret = write_reg(driver, DRV2605L_REG_WAVESEQ1 + count, 0);
        if (ret != ESP_OK) return ret;
    }
    
    // GO!
    return write_reg(driver, DRV2605L_REG_GO, 0x01);
}

esp_err_t drv2605l_play_preset(drv2605l_t *driver, haptic_preset_t preset) {
    drv2605l_effect_t effect;
    
    switch (preset) {
        case HAPTIC_CLICK:
            effect = DRV_EFFECT_STRONG_CLICK_100;
            break;
        case HAPTIC_TICK:
            effect = DRV_EFFECT_SHARP_CLICK_30;
            break;
        case HAPTIC_SUCCESS:
            effect = DRV_EFFECT_DOUBLE_CLICK_100;
            break;
        case HAPTIC_ERROR:
            effect = DRV_EFFECT_TRIPLE_CLICK_100;
            break;
        case HAPTIC_WARNING:
            effect = DRV_EFFECT_ALERT_750MS;
            break;
        case HAPTIC_NOTIFICATION:
            effect = DRV_EFFECT_STRONG_BUZZ_100;
            break;
        case HAPTIC_THROB:
            effect = DRV_EFFECT_PULSING_STRONG_1;
            break;
        case HAPTIC_CONFIRM:
            effect = DRV_EFFECT_SHARP_CLICK_100;
            break;
        case HAPTIC_REJECT:
            effect = DRV_EFFECT_PULSING_STRONG_2;
            break;
        default:
            effect = DRV_EFFECT_STRONG_CLICK_60;
    }
    
    return drv2605l_play_effect(driver, effect);
}

esp_err_t drv2605l_stop(drv2605l_t *driver) {
    if (!driver->initialized) return ESP_ERR_INVALID_STATE;
    return write_reg(driver, DRV2605L_REG_GO, 0x00);
}

esp_err_t drv2605l_set_realtime(drv2605l_t *driver, int8_t value) {
    if (!driver->initialized) return ESP_ERR_INVALID_STATE;
    
    esp_err_t ret;
    
    // Set mode to real-time playback
    ret = write_reg(driver, DRV2605L_REG_MODE, DRV2605L_MODE_REALTIME);
    if (ret != ESP_OK) return ret;
    
    // Write real-time value
    return write_reg(driver, DRV2605L_REG_RTPINPUT, (uint8_t)value);
}

esp_err_t drv2605l_calibrate(drv2605l_t *driver) {
    if (!driver->initialized) return ESP_ERR_INVALID_STATE;
    
    ESP_LOGI(TAG, "Running auto-calibration...");
    
    esp_err_t ret;
    
    // Set calibration mode
    ret = write_reg(driver, DRV2605L_REG_MODE, DRV2605L_MODE_AUTOCAL);
    if (ret != ESP_OK) return ret;
    
    // GO
    ret = write_reg(driver, DRV2605L_REG_GO, 0x01);
    if (ret != ESP_OK) return ret;
    
    // Wait for calibration (can take up to 1 second)
    vTaskDelay(pdMS_TO_TICKS(1200));
    
    // Check result
    uint8_t status;
    ret = read_reg(driver, DRV2605L_REG_STATUS, &status);
    if (ret != ESP_OK) return ret;
    
    if (status & 0x08) {
        ESP_LOGE(TAG, "Auto-calibration failed (status: 0x%02X)", status);
        return ESP_FAIL;
    }
    
    // Read calibration results
    uint8_t comp, bemf;
    read_reg(driver, DRV2605L_REG_AUTOCALCOMP, &comp);
    read_reg(driver, DRV2605L_REG_AUTOCALEMP, &bemf);
    
    ESP_LOGI(TAG, "Calibration complete: COMP=0x%02X, BEMF=0x%02X", comp, bemf);
    
    // Return to internal trigger mode
    return write_reg(driver, DRV2605L_REG_MODE, DRV2605L_MODE_INTTRIG);
}

