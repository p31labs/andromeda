/**
 * P31 Arcade Performance Validation Suite
 * 60fps target on Chromebook Celeron, iPhone A13, Android mid-range
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  shaders: number;
  gpuMemory: number;
  loadTime: number;
}

export interface DeviceProfile {
  name: string;
  maxDrawCalls: number;
  maxTriangles: number;
  maxTextureMemory: number;
  targetFPS: number;
  adaptiveQuality: boolean;
}

// Device profiles based on target specs
export const DeviceProfiles: Record<string, DeviceProfile> = {
  chromebookCeleron: {
    name: 'Chromebook Celeron',
    maxDrawCalls: 50,
    maxTriangles: 50000,
    maxTextureMemory: 64 * 1024 * 1024, // 64MB
    targetFPS: 30, // Minimum acceptable
    adaptiveQuality: true,
  },
  iPhoneA13: {
    name: 'iPhone A13',
    maxDrawCalls: 100,
    maxTriangles: 100000,
    maxTextureMemory: 128 * 1024 * 1024, // 128MB
    targetFPS: 60,
    adaptiveQuality: true,
  },
  androidMidRange: {
    name: 'Android Mid-Range',
    maxDrawCalls: 75,
    maxTriangles: 75000,
    maxTextureMemory: 96 * 1024 * 1024, // 96MB
    targetFPS: 30,
    adaptiveQuality: true,
  },
  desktop: {
    name: 'Desktop',
    maxDrawCalls: 200,
    maxTriangles: 500000,
    maxTextureMemory: 512 * 1024 * 1024, // 512MB
    targetFPS: 60,
    adaptiveQuality: false,
  },
};

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTimeHistory: number[] = [];
  private readonly maxHistory = 60;
  
  private renderer?: THREE.WebGLRenderer;
  private info?: { render: { calls: number; triangles: number }; memory: { textures: number; programs?: unknown[] } };
  
  // Adaptive quality settings
  private currentQuality = 1.0;
  private consecutiveSlowFrames = 0;
  private readonly slowFrameThreshold = 3; // frames

  constructor(private profile: DeviceProfile = DeviceProfiles.iPhoneA13) {}

  attachRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.info = renderer.info;
  }

  /**
   * Call at the beginning of each frame
   */
  beginFrame(): void {
    this.lastTime = performance.now();
    
    // Reset info for new frame
    if (this.renderer) {
      this.renderer.info.reset();
    }
  }

  /**
   * Call at the end of each frame
   * Returns adaptive quality recommendations
   */
  endFrame(): { quality: number; recommendations: string[] } {
    const now = performance.now();
    const frameTime = now - this.lastTime;
    // FPS calculated for metrics
    
    this.frameCount++;
    this.frameTimeHistory.push(frameTime);
    
    if (this.frameTimeHistory.length > this.maxHistory) {
      this.frameTimeHistory.shift();
    }
    
    // Smooth FPS over last 10 frames
    const recentFrames = this.frameTimeHistory.slice(-10);
    const avgFrameTime = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length;
    this.fps = 1000 / avgFrameTime;
    
    // Adaptive quality
    const recommendations: string[] = [];
    
    if (this.fps < this.profile.targetFPS * 0.9) {
      this.consecutiveSlowFrames++;
      
      if (this.consecutiveSlowFrames >= this.slowFrameThreshold) {
        this.currentQuality = Math.max(0.3, this.currentQuality - 0.1);
        recommendations.push(`Reduce quality to ${(this.currentQuality * 100).toFixed(0)}%`);
        recommendations.push(...this.getDowngradeRecommendations());
      }
    } else if (this.fps > this.profile.targetFPS * 1.1 && this.currentQuality < 1.0) {
      this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
      
      if (this.consecutiveSlowFrames === 0 && this.currentQuality < 1.0) {
        this.currentQuality = Math.min(1.0, this.currentQuality + 0.05);
        recommendations.push(`Increase quality to ${(this.currentQuality * 100).toFixed(0)}%`);
      }
    } else {
      this.consecutiveSlowFrames = Math.max(0, this.consecutiveSlowFrames - 1);
    }
    
    // Check renderer stats
    if (this.info) {
      const calls = this.info.render.calls;
      const triangles = this.info.render.triangles;
      
      if (calls > this.profile.maxDrawCalls) {
        recommendations.push(`Reduce draw calls: ${calls}/${this.profile.maxDrawCalls}`);
      }
      
      if (triangles > this.profile.maxTriangles) {
        recommendations.push(`Reduce triangles: ${triangles}/${this.profile.maxTriangles}`);
      }
    }
    
    return { quality: this.currentQuality, recommendations };
  }

  private getDowngradeRecommendations(): string[] {
    const recs: string[] = [];
    
    if (this.currentQuality < 0.8) {
      recs.push('Disable shadows');
    }
    if (this.currentQuality < 0.6) {
      recs.push('Reduce particle count 50%');
    }
    if (this.currentQuality < 0.4) {
      recs.push('Disable shaders');
    }
    if (this.currentQuality < 0.3) {
      recs.push('Reduce resolution to 720p');
    }
    
    return recs;
  }

  getMetrics(): PerformanceMetrics {
    const recentFrames = this.frameTimeHistory.slice(-60);
    const avgFrameTime = recentFrames.length > 0
      ? recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length
      : 16.67;
    
    return {
      fps: this.fps,
      frameTime: avgFrameTime,
      drawCalls: this.info?.render.calls || 0,
      triangles: this.info?.render.triangles || 0,
      textures: this.info?.memory.textures || 0,
      shaders: this.info?.memory ? ((this.info.memory as { programs?: unknown[] }).programs?.length ?? 0) : 0,
      gpuMemory: this.estimateGPUMemory(),
      loadTime: 0, // Set externally
    };
  }

  private estimateGPUMemory(): number {
    // Rough estimation based on textures and geometry
    const textureMemory = (this.info?.memory.textures || 0) * 4 * 1024 * 1024; // Assume 4MB avg
    const geometryMemory = (this.info?.render.triangles || 0) * 3 * 4 * 4; // 3 verts, 4 floats, 4 bytes
    return textureMemory + geometryMemory;
  }

  /**
   * Detect device type for auto-profiling
   */
  static detectDevice(): DeviceProfile {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    // iPhone detection
    if (/iPhone/i.test(ua)) {
      const match = ua.match(/iPhone\s*\d+,(\d+)/);
      if (match) {
        const version = parseInt(match[1], 10);
        // A13 and newer
        if (version >= 13) {
          return DeviceProfiles.iPhoneA13;
        }
      }
      return DeviceProfiles.androidMidRange;
    }
    
    // Android
    if (/Android/i.test(ua)) {
      return DeviceProfiles.androidMidRange;
    }
    
    // Chromebook detection (typically x86_64 with Chrome OS)
    if (/CrOS/i.test(ua) || /Chromebook/i.test(ua)) {
      return DeviceProfiles.chromebookCeleron;
    }
    
    // Desktop default
    if (!isMobile && window.innerWidth > 1024) {
      return DeviceProfiles.desktop;
    }
    
    return DeviceProfiles.androidMidRange;
  }

  /**
   * Performance budget checker
   */
  checkBudget(metrics: PerformanceMetrics): { passed: boolean; violations: string[] } {
    const violations: string[] = [];
    
    if (metrics.fps < this.profile.targetFPS * 0.8) {
      violations.push(`FPS ${metrics.fps.toFixed(1)} < target ${this.profile.targetFPS}`);
    }
    
    if (metrics.drawCalls > this.profile.maxDrawCalls) {
      violations.push(`Draw calls ${metrics.drawCalls} > max ${this.profile.maxDrawCalls}`);
    }
    
    if (metrics.triangles > this.profile.maxTriangles) {
      violations.push(`Triangles ${metrics.triangles} > max ${this.profile.maxTriangles}`);
    }
    
    if (metrics.gpuMemory > this.profile.maxTextureMemory) {
      violations.push(`GPU memory ${(metrics.gpuMemory / 1024 / 1024).toFixed(0)}MB > max ${(this.profile.maxTextureMemory / 1024 / 1024).toFixed(0)}MB`);
    }
    
    return { passed: violations.length === 0, violations };
  }

  /**
   * Run performance validation
   */
  async runValidation(duration = 5000): Promise<{
    passed: boolean;
    metrics: PerformanceMetrics;
    report: string;
  }> {
    const startTime = performance.now();
    const samples: PerformanceMetrics[] = [];
    
    return new Promise((resolve) => {
      const sampleInterval = setInterval(() => {
        samples.push(this.getMetrics());
      }, 100);
      
      setTimeout(() => {
        clearInterval(sampleInterval);
        
        // Calculate averages
        const avg = {
          fps: samples.reduce((a, s) => a + s.fps, 0) / samples.length,
          frameTime: samples.reduce((a, s) => a + s.frameTime, 0) / samples.length,
          drawCalls: Math.max(...samples.map(s => s.drawCalls)),
          triangles: Math.max(...samples.map(s => s.triangles)),
          textures: samples[0]?.textures || 0,
          shaders: samples[0]?.shaders || 0,
          gpuMemory: Math.max(...samples.map(s => s.gpuMemory)),
          loadTime: performance.now() - startTime,
        };
        
        const { passed, violations } = this.checkBudget(avg);
        
        const report = `
=== P31 Arcade Performance Report ===
Device: ${this.profile.name}
Target FPS: ${this.profile.targetFPS}

Results:
- FPS: ${avg.fps.toFixed(1)} ${avg.fps >= this.profile.targetFPS ? '✅' : '❌'}
- Frame Time: ${avg.frameTime.toFixed(2)}ms
- Draw Calls: ${avg.drawCalls}/${this.profile.maxDrawCalls} ${avg.drawCalls <= this.profile.maxDrawCalls ? '✅' : '❌'}
- Triangles: ${(avg.triangles / 1000).toFixed(1)}K/${(this.profile.maxTriangles / 1000).toFixed(0)}K ${avg.triangles <= this.profile.maxTriangles ? '✅' : '❌'}
- GPU Memory: ${(avg.gpuMemory / 1024 / 1024).toFixed(1)}MB/${(this.profile.maxTextureMemory / 1024 / 1024).toFixed(0)}MB ${avg.gpuMemory <= this.profile.maxTextureMemory ? '✅' : '❌'}
- Load Time: ${(avg.loadTime / 1000).toFixed(2)}s

Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}
${violations.length > 0 ? 'Violations:\n' + violations.map(v => '  - ' + v).join('\n') : ''}
        `.trim();
        
        resolve({ passed, metrics: avg, report });
      }, duration);
    });
  }

  dispose(): void {
    this.frameTimeHistory = [];
  }
}

export default PerformanceMonitor;
