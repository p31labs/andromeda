/**
 * qFactorEngine — Fisher-Escolà coherence scoring with WebGPU acceleration.
 */

import { getQFactorEngine, type QFactorComputeResult } from './webgpuCompute';

const CONFIG = {
  HRV_WEIGHT:       0.40,
  BREATH_WEIGHT:    0.45,
  EDA_WEIGHT:       0.15,
  MIN_QFI:          0.01,
  MAX_QFI:          0.99,
} as const;

export interface BiometricInput {
  spoons: number;
  hrv:      number;
  breathCoherence: number;
  eda?:     number;
}

export interface QFactorResult {
  qfactor:    number;
  spoons:     number;
  qfi:        number;
  latencyMs:  number;
  transport:  'gpu' | 'cpu';
}

function estimateQFI(input: BiometricInput): number {
  const hrvNorm = Math.min(1, Math.max(0, (input.hrv - 20) / 180));
  const breath = Math.min(1, Math.max(0, input.breathCoherence));
  const eda = input.eda !== undefined
    ? Math.min(1, Math.max(0, input.eda))
    : breath * 0.8;

  const qfi = CONFIG.HRV_WEIGHT * hrvNorm
            + CONFIG.BREATH_WEIGHT * breath
            + CONFIG.EDA_WEIGHT * eda;

  return Math.min(CONFIG.MAX_QFI, Math.max(CONFIG.MIN_QFI, qfi));
}

function computeQFCPU(spoons: number, qfi: number): number {
  if (spoons < 3.0) return Math.exp(-spoons) * qfi;
  return spoons * Math.log(qfi + 1e-6);
}

export async function computeQFactorFromBiometrics(input: BiometricInput): Promise<QFactorResult> {
  const qfi = estimateQFI(input);
  const t0 = performance.now();

  // Try WebGPU path
  try {
    const engine = getQFactorEngine();
    if (!engine.isReady()) {
      const status = await engine.init();
      if (status !== 'supported') throw new Error('WebGPU unavailable');
    }

    const gpuResult: number | null = await engine.computeSingle(input.spoons, qfi);
    const latency = performance.now() - t0;

    if (gpuResult !== null) {
      return {
        qfactor:   gpuResult,
        spoons:    input.spoons,
        qfi,
        latencyMs: latency,
        transport: 'gpu',
      };
    }
  } catch {
    // GPU failed — fall through to CPU
  }

  // CPU fallback
  const qfactor = computeQFCPU(input.spoons, qfi);
  return {
    qfactor,
    spoons:  input.spoons,
    qfi,
    latencyMs: performance.now() - t0,
    transport: 'cpu',
  };
}

export async function computeBatchQFactor(samples: BiometricInput[]): Promise<QFactorResult[]> {
  if (samples.length === 0) return [];

  const t0 = performance.now();
  const qfis = samples.map(s => estimateQFI(s));
  const spoonsArr = new Float32Array(samples.map(s => s.spoons));
  const qfiArr   = new Float32Array(qfis);

  try {
    const engine = getQFactorEngine();
    if (!engine.isReady()) {
      const status = await engine.init();
      if (status !== 'supported') throw new Error('WebGPU unavailable');
    }

    const gpuResult: QFactorComputeResult | null = await engine.compute(spoonsArr, qfiArr);
    const latency  = performance.now() - t0;

    if (gpuResult) {
      const qArr = gpuResult.qfactor as unknown as Float32Array;
      return Array.from(qArr).map((q: number, i: number) => ({
        qfactor:   q,
        spoons:    samples[i].spoons,
        qfi:       qfis[i],
        latencyMs: latency / samples.length,
        transport: 'gpu' as const,
      }));
    }
  } catch {
    // fall back
  }

  // CPU batch
  return samples.map(s => ({
    qfactor:   computeQFCPU(s.spoons, estimateQFI(s)),
    spoons:    s.spoons,
    qfi:       estimateQFI(s),
    latencyMs: (performance.now() - t0) / samples.length,
    transport: 'cpu' as const,
  }));
}

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.gpu) return false;
  return true;
}

export async function warmupWebGPU(): Promise<boolean> {
  try {
    const engine = getQFactorEngine();
    const status = await engine.init();
    return status === 'supported';
  } catch {
    return false;
  }
}
