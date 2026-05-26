// main/ws_server.c — ESP-IDF WebSocket server
#include "esp_http_server.h"

static esp_err_t ws_handler(httpd_req_t *req) {
    httpd_ws_frame_t ws_pkt;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.type = HTTPD_WS_TYPE_BINARY;

    // Receive CRDT sync message
    esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, 0);
    if (ret != ESP_OK) return ret;

    uint8_t *buf = calloc(1, ws_pkt.len);
    ws_pkt.payload = buf;
    ret = httpd_ws_recv_frame(req, &ws_pkt, ws_pkt.len);

    // Pass to automerge-c sync engine
    // automerge_receive_sync_message(am_doc, buf, ws_pkt.len);

    // Generate response
    // size_t resp_len;
    // uint8_t *resp = automerge_generate_sync_message(am_doc, &resp_len);
    // if (resp) {
    //     ws_pkt.payload = resp;
    //     ws_pkt.len = resp_len;
    //     httpd_ws_send_frame(req, &ws_pkt);
    //     free(resp);
    // }

    free(buf);
    return ESP_OK;
}
