// shaders/qfactor.wgsl
// Fisher-Escolà Cognitive Coherence Score (qFactor) Calculator
// Computes biological/neurological state for operator awareness

@group(0) @binding(0) var<storage, read> inputBuffer: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputBuffer: array<f32>;
@group(0) @binding(2) var<uniform> params: QFactorParams;

struct QFactorParams {
  calcium: f32,      // Serum calcium level (mg/dL) - normal: 8.5-10.5
  coherence: f32,    // Neural coherence metric (0-1)
  stress: f32,       // Cortisol proxy / stress level (0-1)
  time_of_day: f32,  // Hours since midnight (0-24)
  array_size: u32,   // Size of input array
  padding: vec2<f32>
};

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= params.array_size) {
    return;
  }
  
  // Fisher-Escolà cognitive coherence calculation
  // qFactor represents phase coherence in biological neural networks
  // Higher values indicate better cognitive integration
  
  let calcium_term = params.calcium * params.calcium;
  let stress_term = max(params.stress, 0.001); // Avoid division by zero
  let circadian_term = 1.0 + sin(params.time_of_day * 3.14159 / 12.0);
  
  // Raw qFactor calculation
  let q_raw = (calcium_term * params.coherence) / 
              (stress_term * circadian_term);
  
  // Sigmoid normalization to [0, 1] range
  // Alpha = 5.0 provides stable error rates per Q Fisher-Escolà distribution
  let q_normalized = 1.0 / (1.0 + exp(-q_raw + 5.0));
  
  // Store result
  outputBuffer[idx] = q_normalized;
}

// Additional utility: Calculate cognitive load from qFactor
@compute @workgroup_size(64)
fn calculate_load(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= params.array_size) {
    return;
  }
  
  let q = outputBuffer[idx];
  // Invert: lower qFactor = higher cognitive load
  let load = 1.0 - q;
  
  // Encode in output (using alpha channel concept)
  outputBuffer[idx] = load;
}
