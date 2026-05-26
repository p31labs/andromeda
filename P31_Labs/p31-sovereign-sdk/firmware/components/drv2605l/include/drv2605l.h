// components/drv2605l/include/drv2605l.h
#pragma once

#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t drv2605l_init(void);
esp_err_t drv2605l_play_effect(uint8_t effect, uint8_t intensity);

#ifdef __cplusplus
}
#endif
