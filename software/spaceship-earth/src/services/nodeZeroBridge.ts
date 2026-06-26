 *
 * P31 Labs - Spaceship Earth - Node Zero Bridge
 * WCD-FW16: Spaceship Earth Client Bridge
 *


  private onStateChange: StateChangeCallback | null = null;
  private onIMUData: IMUCallback | null = null;
  private _notifyHandlers = new Map<BluetoothRemoteGATTCharacteristic, EventListener>();
  private _disconnectHandler?: EventListener;


        return {
          success: false,
          error: 'Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop, or Chrome on Android.'
        };
      }


      // Handle disconnect
      const onDisconnect = () => {
        this._connected = false;
        this.onStateChange?.({ connected: false });
      };
      this._disconnectHandler = onDisconnect;
      this.device.addEventListener('gattserverdisconnected', onDisconnect);


      // Get service
      this.service = await this.server.getPrimaryService(P31_SERVICE_UUID);

      // Get all characteristics
      await this.setupCharacteristics();

      // Subscribe to notifications
      await this.subscribeToNotifications();



      return { success: false, error: userMessage };
    }
  }

  private async setupCharacteristics(): Promise<void> {
    if (!this.service) return;


      const handler = (e: Event) => {
        const view = (e.target as BluetoothRemoteGATTCharacteristic).value!;
        const coherence = view.getFloat32(0, true);
        this.onStateChange?.({ coherence });
      };
      this.coherenceChar.addEventListener('characteristicvaluechanged', handler);
      this._notifyHandlers.set(this.coherenceChar, handler);
    }

    // Subscribe to spoons notifications
    if (this.spoonsChar) {
      await this.spoonsChar.startNotifications();
      const handler = (e: Event) => {
        const view = (e.target as BluetoothRemoteGATTCharacteristic).value!;
        const spoons = view.getUint8(0);
        this.onStateChange?.({ spoons });
      };
      this.spoonsChar.addEventListener('characteristicvaluechanged', handler);
      this._notifyHandlers.set(this.spoonsChar, handler);
    }

    // Subscribe to room notifications
    if (this.roomChar) {
      await this.roomChar.startNotifications();
      const handler = (e: Event) => {
      };
      this.roomChar.addEventListener('characteristicvaluechanged', handler);
      this._notifyHandlers.set(this.roomChar, handler);
    }

    // Subscribe to theme notifications
    if (this.themeChar) {
      await this.themeChar.startNotifications();
      const handler = (e: Event) => {
      };
      this.themeChar.addEventListener('characteristicvaluechanged', handler);
      this._notifyHandlers.set(this.themeChar, handler);
    }

    // Subscribe to IMU notifications
    if (this.imuChar) {
      await this.imuChar.startNotifications();
      const handler = (e: Event) => {
      };
      this.imuChar.addEventListener('characteristicvaluechanged', handler);
      this._notifyHandlers.set(this.imuChar, handler);
    }

    // Subscribe to battery notifications
    if (this.batteryChar) {
      await this.batteryChar.startNotifications();
      const handler = (e: Event) => {
        const view = (e.target as BluetoothRemoteGATTCharacteristic).value!;
        const battery = view.getUint8(0);
        this.onStateChange?.({ battery });
      };
      this.batteryChar.addEventListener('characteristicvaluechanged', handler);
      this._notifyHandlers.set(this.batteryChar, handler);
    }
  }







  onIMU(callback: IMUCallback): void {
    this.onIMUData = callback;
  }

  // Disconnect
  async disconnect(): Promise<void> {
    // Remove all notification listeners
    for (const [target, handler] of this._notifyHandlers) {
      target.removeEventListener('characteristicvaluechanged', handler);
    }
    this._notifyHandlers.clear();

    if (this.device && this._disconnectHandler) {
      this.device.removeEventListener('gattserverdisconnected', this._disconnectHandler);
      this._disconnectHandler = undefined;
    }

