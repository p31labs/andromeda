import { useState, useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  memoryLimit: number;
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    memoryLimit: 0,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / elapsed);
        
        // Memory usage (Chrome only)
        const memory = (performance as any).memory;
        const memoryUsage = memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0;
        const memoryLimit = memory ? Math.round(memory.jsHeapSizeLimit / 1048576) : 0;

        setMetrics({ fps, memoryUsage, memoryLimit });
        
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return metrics;
}