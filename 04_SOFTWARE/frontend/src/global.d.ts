// Global WebGPU type definitions for Navigator.gpu
// Fixes the TypeScript typecheck issue for WebGPU experimental interfaces

declare global {
  interface Navigator {
    gpu?: GPU;
  }
}

export {};

