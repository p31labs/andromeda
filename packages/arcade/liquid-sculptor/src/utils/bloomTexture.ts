/**
 * Procedural Bloom Texture Generator
 * Creates soft radial gradients for particle glow WITHOUT post-processing
 * Uses HTML5 Canvas API - zero external image assets
 */

import { CanvasTexture } from 'three';

// Cache for generated textures
const textureCache = new Map<string, CanvasTexture>();

/**
 * Generate a soft radial bloom texture for particle glow
 * This avoids expensive WebGL post-processing (HDR bloom, FBO ping-pong)
 * and maintains 60fps on Chromebook Celerons
 */
export function generateBloomTexture(
  size: number = 128,
  intensity: number = 1.0
): CanvasTexture {
  const cacheKey = `bloom-${size}-${intensity}`;

  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2;

  // Create radial gradient for soft bloom
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, maxRadius
  );

  // Core: bright white
  gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
  // Middle: soft glow
  gradient.addColorStop(0.2, `rgba(255, 255, 255, ${intensity * 0.8})`);
  // Outer: fade to transparent
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.3})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  // Fill with gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add subtle noise for texture
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 10;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generate color-tinted bloom for specific particle types
 */
export function generateTintedBloomTexture(
  color: { r: number; g: number; b: number },
  size: number = 128
): CanvasTexture {
  const cacheKey = `bloom-tinted-${color.r}-${color.g}-${color.b}-${size}`;

  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2;

  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, maxRadius
  );

  // Core: tinted color
  gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 1.0)`);
  // Middle
  gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
  // Outer fade
  gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);
  gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Pre-generate bloom textures for P31 canon colors
 */
export function getCanonBloomTextures(): {
  phos: CanvasTexture;
  cyan: CanvasTexture;
  orchid: CanvasTexture;
  white: CanvasTexture;
} {
  return {
    phos: generateTintedBloomTexture({ r: 57, g: 255, b: 20 }, 128),
    cyan: generateTintedBloomTexture({ r: 0, g: 245, b: 255 }, 128),
    orchid: generateTintedBloomTexture({ r: 218, g: 112, b: 214 }, 128),
    white: generateBloomTexture(128, 1.0),
  };
}

/**
 * Clear texture cache (useful for memory management)
 */
export function clearBloomCache(): void {
  textureCache.forEach(texture => texture.dispose());
  textureCache.clear();
}

// Default export for single texture use
export default generateBloomTexture;
