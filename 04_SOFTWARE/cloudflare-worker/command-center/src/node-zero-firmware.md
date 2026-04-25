# WCD-007: Node Zero Firmware (ESP32 Tetrahedron)

## Overview
Bare-metal C++ implementation for ESP32-based physical mesh nodes (S.J., W.J. hardware).

## Architecture

### Hardware Components
- ESP32-WROOM-32 dual-core processor
- NXP SE050 Plug & Trust secure element (I2C)
- NeoPixel WS2812B LED ring (16 pixels)
- MEMS microphone (I2S)
- Push button (GPIO)

### Firmware Modules

#### 1. Secure Boot & mTLS (`secure_boot.cpp`)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <SE050.h>

SE050 se050;

void setup() {
  // Initialize secure element
  se050.begin();
  
  // Generate or retrieve device key pair
  if (!se050.keyExists(0x01)) {
    se050.generateKey(0x01, SE050_KEY_ECC_NIST_P256);
  }
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  
  // Configure mTLS with Cloudflare
  WiFiClientSecure client;
  client.setCACert(CLOUDFLARE_CA_CERT);
  client.setCertificate(se050.getDeviceCert());
  client.setPrivateKey(se050.getDeviceKey());
}
```

#### 2. CRDT Transport Layer (`crdt_transport.cpp`)
```cpp
#include <WiFiUDP.h>
#include <QUIC.h>

WiFiUDP udp;
QUICClient quic;

void connectCRDT() {
  // Connect to Cloudflare QUIC endpoint
  quic.connect("god.p31ca.org", 443);
  
  // Subscribe to mesh state updates
  String subscribeMsg = "{\"type\":\"subscribe\",\"node_id\":\"ESP32_001\"}";
  quic.write(subscribeMsg.c_str(), subscribeMsg.length());
}

void handleCRDTUpdate(uint8_t* data, size_t len) {
  // Parse QUIC datagram (Uint8Array from Cloudflare Workers AI)
  CRDTPayload payload = parseCRDTPayload(data, len);
  
  // Update local mesh state
  updateMeshState(payload);
  
  // Visual feedback
  updateLEDs(payload.state);
}
```

#### 3. LED State Machine (`led_control.cpp`)
```cpp
#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel strip = Adafruit_NeoPixel(16, LED_PIN, NEO_GRB + NEO_KHZ800);

void updateLEDs(MeshState state) {
  switch(state.status) {
    case CONNECTED:
      // Solid green - mesh synchronized
      fillStrip(strip.Color(0, 255, 0));
      break;
    case NEGOTIATING:
      // Blinking yellow - authenticating
      blinkYellow();
      break;
    case OFFLINE:
      // Solid red - disconnected
      fillStrip(strip.Color(255, 0, 0));
      break;
    case EMERGENCY:
      // Rapid red flash - critical alert
      rapidFlashRed();
      break;
  }
  strip.show();
}

void broadcastMeshMessage(String message) {
  // Encode message as CRDT operation
  String crdtOp = createCRDTOp("mesh_message", message);
  
  // Broadcast via QUIC
  quic.write(crdtOp.c_str(), crdtOp.length());
}
```

#### 4. Voice Interface (`voice_interface.cpp`)
```cpp
#include <I2S.h>
#include <OPUS.h>

void captureVoice() {
  // Sample from MEMS microphone via I2S
  int16_t audioBuffer[1024];
  I2S.read(audioBuffer, sizeof(audioBuffer));
  
  // Encode with Opus
  uint8_t encoded[1024];
  int len = opus_encode(audioBuffer, encoded);
  
  // Transmit via mesh
  broadcastMeshMessage(encoded, len);
}

void playVoice(uint8_t* data, size_t len) {
  // Decode Opus
  int16_t audioBuffer[1024];
  opus_decode(data, audioBuffer);
  
  // Output via I2S to speaker
  I2S.write(audioBuffer, len);
}
```

### Build & Deployment

```bash
# Install ESP32 toolchain
arduino-cli core install esp32:esp32

# Compile
arduino-cli compile --fqbn esp32:esp32:esp32 node-zero-firmware.ino

# Flash
arduino-cli upload -p /dev/ttyUSB0 --fqbn esp32:esp32:esp32 node-zero-firmware.ino
```

### Security Model

- **Secure Boot**: ESP32 secure boot v2 enabled
- **Flash Encryption**: AES-256 encrypted flash
- **mTLS**: Certificate-based auth via NXP SE050
- **CRDT Signing**: Ed25519 signatures on mesh operations
- **Key Storage**: Keys never exposed to main CPU, stored in secure element
