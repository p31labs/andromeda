// Minimal ES8311/I2S initialization for Waveshare ESP32-S3 Type B
// Xiaozhi/Waveshare reference implementation
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_log.h"

#define ES8311_ADDR 0x18
#define PA_ENABLE_GPIO GPIO_NUM_3

static const char *TAG = "AUDIO";

// I2C write helper for ES8311
static esp_err_t es8311_write_reg(i2c_master_bus_handle_t i2c_bus, uint8_t reg, uint8_t val) {
    i2c_device_config_t cfg = {};
    cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    cfg.device_address = ES8311_ADDR;
    cfg.scl_speed_hz = 400000;
    i2c_master_dev_handle_t dev;
    esp_err_t ret = i2c_master_bus_add_device(i2c_bus, &cfg, &dev);
    if (ret != ESP_OK) return ret;
    uint8_t buf[2] = {reg, val};
    ret = i2c_master_transmit(dev, buf, 2, 100);
    i2c_master_bus_rm_device(dev);
    return ret;
}

void audio_init(i2c_master_bus_handle_t i2c_bus) {
    // Enable PA (speaker output)
    gpio_set_direction(PA_ENABLE_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(PA_ENABLE_GPIO, 1);

    // ES8311 basic init (slave mode, mic in)
    es8311_write_reg(i2c_bus, 0x00, 0x1F); // Reset
    vTaskDelay(pdMS_TO_TICKS(10));
    es8311_write_reg(i2c_bus, 0x01, 0x30); // Set to slave mode
    es8311_write_reg(i2c_bus, 0x02, 0x10); // Enable mic bias
    es8311_write_reg(i2c_bus, 0x03, 0x00); // Power up ADC
    // ... (add more config as needed)

    ESP_LOGI(TAG, "ES8311 codec initialized");

    // I2S config
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    i2s_chan_handle_t rx_handle;
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, &rx_handle, NULL));

    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(16000),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg = {
            .mclk = GPIO_NUM_9,
            .bclk = GPIO_NUM_10,
            .ws = GPIO_NUM_11,
            .dout = GPIO_NUM_12,
            .din = GPIO_NUM_13,
        },
    };
    ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &std_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(rx_handle)); // Enable RX channel
    ESP_LOGI(TAG, "I2S RX channel enabled");
}
