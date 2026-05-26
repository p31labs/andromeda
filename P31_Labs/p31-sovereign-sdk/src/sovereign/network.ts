/// <reference types="web-bluetooth" />

import { EventEmitter } from "eventemitter3";
import type {
  NetworkAdapterInterface,
  NetworkAdapterEvents as OriginalNetworkAdapterEvents,
  PeerMetadata,
  PeerCandidatePayload,
  Message,
  PeerId,
} from "@automerge/automerge-repo";

interface NetworkAdapterEvents extends OriginalNetworkAdapterEvents {
  ready: () => void;
}

// Custom BLE adapter — implements NetworkAdapterInterface
export class BLENetworkAdapter
  extends EventEmitter<NetworkAdapterEvents>
  implements NetworkAdapterInterface
{
  peerId?: PeerId;
  peerMetadata?: PeerMetadata;
  private device: BluetoothDevice | null = null;
  private txChar: BluetoothRemoteGATTCharacteristic | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristic | null = null;

  // Nordic UART Service UUIDs
  static NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  static NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify
  static NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write

  isReady(): boolean {
    return this.txChar !== null && this.rxChar !== null;
  }

  async whenReady(): Promise<void> {
    if (this.isReady()) {
      return;
    }
    return new Promise((resolve) => {
      this.once("ready", () => resolve());
    });
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata) {
    this.peerId = peerId;
    this.peerMetadata = peerMetadata;
    this.connectDevice();
  }

  send(message: Message): void {
    if (!this.rxChar) throw new Error("Not connected");
    // Implementation of message sending over BLE
    console.log(message);
  }

  disconnect(): void {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.txChar = null;
    this.rxChar = null;
  }

  async connectDevice() {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [BLENetworkAdapter.NUS_SERVICE] }],
    });
    const server = await this.device.gatt!.connect();
    const service = await server.getPrimaryService(
      BLENetworkAdapter.NUS_SERVICE
    );
    this.txChar = await service.getCharacteristic(BLENetworkAdapter.NUS_TX);
    this.rxChar = await service.getCharacteristic(BLENetworkAdapter.NUS_RX);

    // Start notifications (ESP32 → Browser)
    await this.txChar.startNotifications();
    this.txChar.addEventListener(
      "characteristicvaluechanged",
      (event: Event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (value) this.onReceive(new Uint8Array(value.buffer));
      }
    );

    // Announce our presence
    const peerCandidate: PeerCandidatePayload = {
      peerId: "ble-peripheral" as PeerId, // The device is the other peer
      peerMetadata: this.peerMetadata!,
    };
    this.emit("peer-candidate", peerCandidate);
    this.emit("ready");
  }

  onReceive(data: Uint8Array) {
    // Reassemble fragments, pass to automerge-repo adapter
    // Implementation: accumulate chunks until CBOR message is complete
    // For now, assume a single message
    this.emit("message", data as unknown as Message);
  }
}
