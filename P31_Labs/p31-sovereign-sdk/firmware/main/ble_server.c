// main/ble_server.c
#include "host/ble_hs.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"

// Nordic UART Service UUIDs
static const ble_uuid128_t nus_svc_uuid = BLE_UUID128_INIT(
    0x9e, 0xca, 0xdc, 0x24, 0x0e, 0xe5, 0xa9, 0xe0,
    0x93, 0xf3, 0xa3, 0xb5, 0x01, 0x00, 0x40, 0x6e);

// Request 247-byte MTU from peripheral side
static void on_connect(struct ble_gap_event *event) {
    ble_att_set_preferred_mtu(247);
    ble_gattc_exchange_mtu(event->connect.conn_handle, NULL, NULL);
}

// Handle incoming commands from browser
static int rx_access_cb(uint16_t conn_handle, uint16_t attr_handle,
                        struct ble_gatt_access_ctxt *ctxt, void *arg) {
    struct os_mbuf *om = ctxt->om;
    uint8_t cmd = om->om_data[0];

    switch (cmd) {
        case 0x01: // HAPTIC
            // drv2605_play_effect(om->om_data[3], om->om_data[4]);
            break;
        case 0x02: // SE050_SIGN
            // se050_sign(om->om_data + 3, om->om_len - 3, sig_buf, &sig_len);
            // Send signature back via TX characteristic (notify)
            // ble_gattc_notify_custom(conn_handle, tx_attr_handle, sig_buf, sig_len);
            break;
        case 0x03: // LORA_SEND
            // bridge_crdt_to_lora(om->om_data + 5, om->om_len - 5);
            break;
    }
    return 0;
}
