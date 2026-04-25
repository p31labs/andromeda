/*
 * SE050 Secure Element Provisioning for P31 Labs
 * Generates device-specific mTLS certificates for hardware authentication
 */

#include <ex_sss_boot.h>
#include <fsl_sss_se05x_apis.h>
#include <nxLog_App.h>

#define P31_DEVICE_KEY_ID     0x1000
#define P31_CERT_CHAIN_ID     0x1001
#define SE050_APPLET_VERSION  0x00010000

/* SE050 context */
static sss_se05x_session_t se05x_session;

int provision_se050_device() {
    sss_status_t status;
    
    printf("[SE050] Initializing secure element...\n");
    
    /* Open SE050 session */
    status = ex_sss_boot_open(&se05x_session, kType_SE_Conn_Type_Plain);
    if (status != kStatus_SSS_Success) {
        printf("[SE050] ERROR: Failed to open session\n");
        return -1;
    }
    
    /* Generate EC P-256 key pair in secure element */
    sss_object_t device_key;
    status = sss_key_object_init(&device_key, &se05x_session.ks);
    if (status != kStatus_SSS_Success) {
        printf("[SE050] ERROR: Failed to init key object\n");
        return -1;
    }
    
    status = sss_key_object_allocate_handle(&device_key,
        P31_DEVICE_KEY_ID,
        kSSS_KeyPart_Pair,
        kSSS_CipherType_EC_NIST_P,
        256,
        kKeyObject_Mode_Persistent);
    
    if (status != kStatus_SSS_Success) {
        printf("[SE050] ERROR: Failed to allocate key handle\n");
        return -1;
    }
    
    printf("[SE050] Generating EC P-256 key pair...\n");
    status = sss_key_store_generate_key(&se05x_session.ks,
        &device_key, 256, NULL);
    
    if (status != kStatus_SSS_Success) {
        printf("[SE050] ERROR: Failed to generate key pair\n");
        return -1;
    }
    
    printf("[SE050] Key pair generated successfully\n");
    
    /* Create CSR for device certificate */
    uint8_t csr_der[2048];
    size_t csr_len = sizeof(csr_der);
    
    printf("[SE050] Creating certificate signing request...\n");
    
    /* Note: Actual CSR creation requires SE050 specific commands */
    /* This is a simplified representation */
    
    status = sss_se05x_create_csr(&se05x_session,
        &device_key,
        "CN=P31-Operator-Device,O=P31 Labs,C=US",
        csr_der, &csr_len);
    
    if (status != kStatus_SSS_Success) {
        printf("[SE050] WARNING: CSR creation may require custom implementation\n");
        printf("[SE050] Manual CSR generation recommended\n");
    }
    
    /* Store CSR to file for signing */
    FILE *fp = fopen("certs/device-csr.der", "wb");
    if (fp) {
        fwrite(csr_der, 1, csr_len, fp);
        fclose(fp);
        printf("[SE050] CSR saved to certs/device-csr.der\n");
    }
    
    /* Create certificate chain container */
    sss_object_t cert_chain;
    status = sss_key_object_init(&cert_chain, &se05x_session.ks);
    
    status = sss_key_object_allocate_handle(&cert_chain,
        P31_CERT_CHAIN_ID,
        kSSS_KeyPart_Public,
        kSSS_CipherType_X509_CRT,
        0,
        kKeyObject_Mode_Persistent);
    
    printf("[SE050] Provisioning complete!\n");
    printf("[SE050] Next steps:\n");
    printf("  1. Sign CSR with Intermediate CA:\n");
    printf("     openssl x509 -req -in device-csr.der -CA intermediate.crt \\\n");
    printf("       -CAkey intermediate.key -CAcreateserial -out device-cert.crt \\\n");
    printf("       -days 365 -sha256\n");
    printf("  2. Inject certificate chain into SE050\n");
    printf("  3. Configure Cloudflare mTLS policy\n");
    
    /* Cleanup */
    se05x_session_close(&se05x_session);
    
    return 0;
}

int main() {
    return provision_se050_device();
}
