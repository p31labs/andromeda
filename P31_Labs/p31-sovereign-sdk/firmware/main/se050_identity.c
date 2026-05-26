// main/se050_identity.c
#include "fsl_sss_api.h"

// Key ID inside SE050 (provisioned at first boot)
#define SE050_DEVICE_KEY_ID 0x10000001

esp_err_t se050_sign(const uint8_t *hash, size_t hash_len,
                     uint8_t *sig_out, size_t *sig_len) {
    sss_asymmetric_t ctx;
    sss_status_t status;

    status = sss_asymmetric_context_init(
        &ctx, &se050_session, &device_key_object,
        kAlgorithm_SSS_Ed25519, kMode_SSS_Sign
    );
    if (status != kStatus_SSS_Success) return ESP_FAIL;

    status = sss_asymmetric_sign_digest(
        &ctx, hash, hash_len, sig_out, sig_len
    );
    sss_asymmetric_context_free(&ctx);

    return (status == kStatus_SSS_Success) ? ESP_OK : ESP_FAIL;
}

// Export public key for did:key generation
esp_err_t se050_get_public_key(uint8_t *pub_out, size_t *pub_len) {
    return sss_key_store_get_key(
        &se050_keystore, &device_key_object,
        pub_out, pub_len, NULL, NULL
    );
}
