 *
// Minimal ambient stubs for WebGPU types missing from lib when @webgpu/types is not auto-included
declare type GPUQueryType = 'occlusion' | 'timestamp';
declare type GPUAddressMode = 'clamp-to-edge' | 'repeat' | 'mirror-repeat';
declare type GPUFilterMode = 'nearest' | 'linear';
declare type GPUMipmapFilterMode = 'nearest' | 'linear';
declare type GPUCompareFunction = 'never' | 'less' | 'equal' | 'less-equal' | 'greater' | 'not-equal' | 'greater-equal' | 'always';
declare type GPUTextureDimension = '1d' | '2d' | '3d';
declare type GPUTextureUsageFlags = number;

// Stub types for newer WebGPU APIs not in default lib
export declare interface GPUDeviceLostInfo {
  reason: string;
  message: string;
}

export declare interface GPUUncapturedErrorEvent {
  error: GPUError;
  timestamp: number;
}

export declare interface GPUQuerySetDescriptor {
  type: GPUQueryType;
  count: number;
}

export declare interface GPURenderBundleEncoderDescriptor {
  colorFormats: GPUTextureFormat[];
  depthStencilFormat?: GPUTextureFormat;
  sampleCount: number;
}

export declare interface GPUSamplerDescriptor {
  addressModeU: GPUAddressMode;
  addressModeV: GPUAddressMode;
  addressModeW: GPUAddressMode;
  magFilter: GPUFilterMode;
  minFilter: GPUFilterMode;
  mipmapFilter: GPUMipmapFilterMode;
  lodMinClamp: number;
  lodMaxClamp: number;
  compare?: GPUCompareFunction;
}

export declare interface GPUTextureDescriptor {
  size: number | [number, number, number];
  dimension: GPUTextureDimension;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
}

declare type GPUTextureFormat =
export type GPUFeatureName =
export type GPUBindableResource =
// WebGPU Texture
export interface GPUTexture {
  // Empty interface - used for type checking
}

// WebGPU Query Set
export interface GPUQuerySet {
  // Empty interface - used for type checking
}

// WebGPU Render Bundle Encoder
export interface GPURenderBundleEncoder {
  // Empty interface - used for type checking
}

export type GPUAdapterType =
export type GPUBackendType =
      requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
    };
  }
}
