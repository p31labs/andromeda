// src/qfactor-gpu.js
// WebGPU-based Fisher-Escolà qFactor calculator

export class QFactorGPU {
  constructor() {
    this.device = null;
    this.pipeline = null;
    this.bindGroup = null;
    this.initialized = false;
  }

  async initialize() {
    if (!navigator.gpu) {
      console.warn('[QFactor] WebGPU not available, using CPU fallback');
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('[QFactor] No GPU adapter found');
        return false;
      }
      
      this.device = await adapter.requestDevice();
      
      // Load WGSL shader
      const shaderCode = await fetch('/shaders/qfactor.wgsl').then(r => r.text());
      const shaderModule = this.device.createShaderModule({
        code: shaderCode
      });
      
      // Create compute pipeline
      this.pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main'
        }
      });
      
      this.initialized = true;
      console.log('[QFactor] WebGPU initialized successfully');
      return true;
      
    } catch (err) {
      console.error('[QFactor] WebGPU initialization failed:', err);
      return false;
    }
  }

  async calculateQFactor(biologicalMetrics) {
    // CPU fallback if WebGPU not available
    if (!this.initialized || !this.device) {
      return this.calculateQFactorCPU(biologicalMetrics);
    }
    
    try {
      // Create GPU buffers
      const inputBuffer = this.device.createBuffer({
        size: 1024 * 4, // 1024 f32 values
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });
      
      const outputBuffer = this.device.createBuffer({
        size: 1024 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      
      const paramsBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
      
      // Upload biological metrics
      const metricsArray = new Float32Array([
        biologicalMetrics.calcium,      // Current: ~7.5 mg/dL
        biologicalMetrics.coherence,    // From EEG/HRV (0-1)
        biologicalMetrics.stress,       // Cortisol proxy (0-1)
        biologicalMetrics.time_of_day,  // Hours since midnight
        1024,                           // Array size
        0, 0                            // Padding
      ]);
      
      this.device.queue.writeBuffer(paramsBuffer, 0, metricsArray);
      
      // Create bind group
      this.bindGroup = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: inputBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } },
          { binding: 2, resource: { buffer: paramsBuffer } }
        ]
      });
      
      // Execute compute shader
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, this.bindGroup);
      passEncoder.dispatchWorkgroups(16); // 16 * 64 = 1024 threads
      passEncoder.end();
      
      // Read back result
      const resultBuffer = this.device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });
      
      commandEncoder.copyBufferToBuffer(outputBuffer, 0, resultBuffer, 0, 4);
      
      this.device.queue.submit([commandEncoder.finish()]);
      
      await resultBuffer.mapAsync(GPUMapMode.READ);
      const result = new Float32Array(resultBuffer.getMappedRange())[0];
      resultBuffer.unmap();
      
      // Cleanup
      inputBuffer.destroy();
      outputBuffer.destroy();
      paramsBuffer.destroy();
      resultBuffer.destroy();
      
      return Math.max(0, Math.min(1, result)); // Clamp to [0, 1]
      
    } catch (err) {
      console.error('[QFactor] GPU calculation failed:', err);
      return this.calculateQFactorCPU(biologicalMetrics);
    }
  }

  calculateQFactorCPU(biologicalMetrics) {
    // CPU fallback implementation
    const { calcium, coherence, stress, time_of_day } = biologicalMetrics;
    
    const calcium_term = calcium * calcium;
    const stress_term = Math.max(stress, 0.001);
    const circadian_term = 1.0 + Math.sin(time_of_day * Math.PI / 12.0);
    
    const q_raw = (calcium_term * coherence) / (stress_term * circadian_term);
    const q_normalized = 1.0 / (1.0 + Math.exp(-q_raw + 5.0));
    
    return Math.max(0, Math.min(1, q_normalized));
  }

  async streamToCRDT(qFactor) {
    // Send qFactor to CRDT via WebSocket or WebTransport
    if (window.crdtTransport) {
      await window.crdtTransport.sendDatagram(
        { qfactor: Date.now() },
        { type: 'qfactor_update', value: qFactor }
      );
    }
  }
}
