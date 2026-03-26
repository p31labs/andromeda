/**
 * WebGPU BLE Data Processor - Real-time Spatial Analysis
 * 
 * Processes BLE beacon data using WebGPU compute shaders for real-time spatial analysis,
 * trilateration, and zone detection. Integrates with the existing BLE scanner module.
 */

import {
  GPUBufferUsage,
  GPUShaderStage,
  GPUMapMode,
} from '../../types/webgpu';

export interface BeaconData {
  position: [number, number, number];
  rssi: number;
  txPower: number;
  timestamp: number;
}

export interface ProcessingResults {
  userPosition: [number, number, number];
  confidence: number;
  zoneId: string;
  transitionDetected: boolean;
  proximity: 'IMMEDIATE' | 'NEAR' | 'APPROACHING' | 'FAR';
}

export interface ZoneConfig {
  id: string;
  name: string;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  rules: string[];
}

export class WebGPUBLEProcessor {
  // Use any for device to avoid type conflicts between custom and native WebGPU types
  private device: any = null;
  private beaconBuffer: GPUBuffer | null = null;
  private positionBuffer: GPUBuffer | null = null;
  private resultBuffer: GPUBuffer | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;
  
  private zones: ZoneConfig[] = [];
  private lastProcessedTime = 0;
  private processingInterval = 100; // ms

  constructor() {}

  /**
   * Initialize WebGPU for BLE processing
   */
  async initialize(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported for BLE processing, using CPU fallback');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('Failed to get WebGPU adapter for BLE processing');
        return false;
      }

      this.device = await adapter.requestDevice();
      this.createBuffers();
      this.createPipeline();
      console.log('WebGPU BLE Processor initialized successfully');
      return true;
    } catch (error) {
      console.error('WebGPU BLE processor initialization failed:', error);
      return false;
    }
  }

  private createBuffers() {
    if (!this.device) return;

    const MAX_BEACONS = 10;
    const BEACON_SIZE = 4 * 4; // 4 floats: x, y, z, rssi
    const RESULT_SIZE = 8 * 4; // 8 floats: position(3), confidence(1), zoneId(1), transition(1), proximity(1), padding(1)

    this.beaconBuffer = this.device.createBuffer({
      size: MAX_BEACONS * BEACON_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.positionBuffer = this.device.createBuffer({
      size: MAX_BEACONS * 3 * 4, // 3 floats per position
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.resultBuffer = this.device.createBuffer({
      size: RESULT_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
  }

  private createPipeline() {
    if (!this.device) return;

    const computeShader = `
      @group(0) @binding(0) var<storage, read> beacons: array<vec4<f32>>;
      @group(0) @binding(1) var<storage, read_write> positions: array<vec3<f32>>;
      @group(0) @binding(2) var<storage, read_write> results: array<f32>;

      @compute @workgroup_size(16)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let beacon_idx = global_id.x;
        let max_beacons = ${MAX_BEACONS};
        
        if (beacon_idx >= max_beacons) {
          return;
        }

        let beacon = beacons[beacon_idx];
        
        // Skip if beacon data is invalid (rssi = 0)
        if (beacon.w == 0.0) {
          return;
        }

        // Calculate distance from RSSI using Log-Distance Path Loss Model
        let tx_power = beacon.w; // Store tx_power in w component
        let rssi = beacon.w;
        let path_loss = tx_power - rssi;
        let distance = pow(10.0, path_loss / (10.0 * 2.5));

        // Calculate position from beacon position and distance
        let beacon_pos = vec3<f32>(beacon.x, beacon.y, beacon.z);
        positions[beacon_idx] = beacon_pos + vec3<f32>(distance, 0.0, 0.0);

        // Update confidence
        atomicAdd(&results[4], 1.0);
      }
    `;

    const module = this.device.createShaderModule({
      code: computeShader,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.beaconBuffer! } },
        { binding: 1, resource: { buffer: this.positionBuffer! } },
        { binding: 2, resource: { buffer: this.resultBuffer! } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module,
        entryPoint: 'main',
      },
    });
  }

  /**
   * Process beacon data and return spatial analysis results
   */
  async processBeaconData(beacons: BeaconData[]): Promise<ProcessingResults> {
    if (!this.device || !this.pipeline || !this.bindGroup) {
      return this.processBeaconDataCPU(beacons);
    }

    try {
      // Prepare beacon data for GPU
      const beaconData = this.prepareBeaconData(beacons);
      
      // Upload to GPU
      this.device.queue.writeBuffer(this.beaconBuffer!, 0, beaconData);

      // Execute compute shader
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.dispatchWorkgroups(Math.ceil(MAX_BEACONS / 16));
      pass.end();

      this.device.queue.submit([encoder.finish()]);

      // Read results
      const resultBuffer = this.device.createBuffer({
        size: 8 * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(
        this.resultBuffer!,
        0,
        resultBuffer,
        0,
        8 * 4
      );

      this.device.queue.submit([copyEncoder.finish()]);

      await resultBuffer.mapAsync(GPUMapMode.READ);
      const resultData = resultBuffer.getMappedRange();
      const results = new Float32Array(resultData);

      resultBuffer.unmap();

      // Process and return results
      return this.processResults(results, beacons);

    } catch (error) {
      console.error('WebGPU BLE processing failed:', error);
      return this.processBeaconDataCPU(beacons);
    }
  }

  private prepareBeaconData(beacons: BeaconData[]): ArrayBuffer {
    const MAX_BEACONS = 10;
    const buffer = new ArrayBuffer(MAX_BEACONS * 4 * 4); // 4 floats per beacon
    const view = new Float32Array(buffer);

    for (let i = 0; i < MAX_BEACONS; i++) {
      const beacon = beacons[i];
      const baseIndex = i * 4;

      if (beacon) {
        view[baseIndex] = beacon.position[0];     // x
        view[baseIndex + 1] = beacon.position[1]; // y
        view[baseIndex + 2] = beacon.position[2]; // z
        view[baseIndex + 3] = beacon.rssi;        // rssi (stored in w)
      } else {
        // Clear unused slots
        view[baseIndex] = 0;
        view[baseIndex + 1] = 0;
        view[baseIndex + 2] = 0;
        view[baseIndex + 3] = 0;
      }
    }

    return buffer;
  }

  private processResults(results: Float32Array, beacons: BeaconData[]): ProcessingResults {
    const userPosition: [number, number, number] = [0, 0, 0];
    const confidence = results[4];
    const zoneId = this.determineZone(userPosition);
    const transitionDetected = this.checkTransition(beacons);
    const proximity = this.calculateProximity(beacons);

    return {
      userPosition,
      confidence,
      zoneId,
      transitionDetected,
      proximity
    };
  }

  private determineZone(position: [number, number, number]): string {
    for (const zone of this.zones) {
      const [minX, minY, minZ] = zone.bounds.min;
      const [maxX, maxY, maxZ] = zone.bounds.max;
      const [x, y, z] = position;

      if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ) {
        return zone.id;
      }
    }
    return 'unknown';
  }

  private checkTransition(beacons: BeaconData[]): boolean {
    // Simple transition detection based on beacon proximity changes
    const now = Date.now();
    if (now - this.lastProcessedTime < this.processingInterval) {
      return false;
    }
    this.lastProcessedTime = now;

    // Check if any beacon is in IMMEDIATE proximity
    return beacons.some(beacon => {
      const distance = this.calculateDistanceFromRSSI(beacon.rssi, beacon.txPower);
      return distance < 0.5; // Within 0.5 meters
    });
  }

  private calculateProximity(beacons: BeaconData[]): 'IMMEDIATE' | 'NEAR' | 'APPROACHING' | 'FAR' {
    if (beacons.length === 0) return 'FAR';

    const distances = beacons.map(beacon => 
      this.calculateDistanceFromRSSI(beacon.rssi, beacon.txPower)
    );
    
    const minDistance = Math.min(...distances);

    if (minDistance < 0.5) return 'IMMEDIATE';
    if (minDistance < 2.0) return 'NEAR';
    if (minDistance < 5.0) return 'APPROACHING';
    return 'FAR';
  }

  private calculateDistanceFromRSSI(rssi: number, txPower: number): number {
    const pathLoss = txPower - rssi;
    return Math.pow(10, pathLoss / (10 * 2.5));
  }

  /**
   * CPU fallback for BLE processing
   */
  private processBeaconDataCPU(beacons: BeaconData[]): ProcessingResults {
    const userPosition: [number, number, number] = [0, 0, 0];
    let confidence = 0;
    let zoneId = 'unknown';
    let transitionDetected = false;
    let proximity: 'IMMEDIATE' | 'NEAR' | 'APPROACHING' | 'FAR' = 'FAR';

    if (beacons.length > 0) {
      // Simple trilateration using weighted average
      let totalWeight = 0;
      
      for (const beacon of beacons) {
        const distance = this.calculateDistanceFromRSSI(beacon.rssi, beacon.txPower);
        const weight = 1 / (distance + 0.1); // Avoid division by zero
        
        userPosition[0] += beacon.position[0] * weight;
        userPosition[1] += beacon.position[1] * weight;
        userPosition[2] += beacon.position[2] * weight;
        totalWeight += weight;
        confidence++;
      }

      if (totalWeight > 0) {
        userPosition[0] /= totalWeight;
        userPosition[1] /= totalWeight;
        userPosition[2] /= totalWeight;
      }

      zoneId = this.determineZone(userPosition);
      transitionDetected = this.checkTransition(beacons);
      proximity = this.calculateProximity(beacons);
    }

    return {
      userPosition,
      confidence,
      zoneId,
      transitionDetected,
      proximity
    };
  }

  /**
   * Add zone configuration
   */
  addZone(zone: ZoneConfig) {
    this.zones.push(zone);
  }

  /**
   * Set zones configuration
   */
  setZones(zones: ZoneConfig[]) {
    this.zones = zones;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    if (this.beaconBuffer) this.beaconBuffer.destroy();
    if (this.positionBuffer) this.positionBuffer.destroy();
    if (this.resultBuffer) this.resultBuffer.destroy();
    
    this.device = null;
    this.beaconBuffer = null;
    this.positionBuffer = null;
    this.resultBuffer = null;
    this.pipeline = null;
    this.bindGroup = null;
  }

  /**
   * Check if WebGPU is available
   */
  isAvailable(): boolean {
    return this.device !== null;
  }
}

// Constants
const MAX_BEACONS = 10;