            type ScanDevice = { id: string; rssi: number; manufacturerData?: number[] };
            this.callback(data.devices.map((d: ScanDevice) => ({
