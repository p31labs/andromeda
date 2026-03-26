// spaceship-earth/src/components/PerformanceMonitor.tsx
// Real-time performance monitoring component with development tools
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { performanceMonitor } from '../services/performanceMonitor';

interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  gpu: {
    time: number;
    available: boolean;
  };
  network: {
    requests: number;
    errors: number;
    avgLatency: number;
  };
  battery: {
    level: number;
    charging: boolean;
    status: string;
  };
}

export interface PerformanceAlert {
  type: 'fps' | 'memory' | 'gpu' | 'battery' | 'network';
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: number;
}

export interface PerformanceConfig {
  showMonitor: boolean;
  showAlerts: boolean;
  showDetailed: boolean;
  autoHide: boolean;
  threshold: {
    fps: number;
    memory: number;
    gpu: number;
    battery: number;
  };
}

/**
 * Performance monitoring component with real-time metrics and alerts
 */
export function PerformanceMonitor({ config }: { config: PerformanceConfig }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isVisible, setIsVisible] = useState(config.showMonitor);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const monitorRef = useRef<HTMLDivElement>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use the existing performance monitor service
  const [fps, setFps] = useState(0);
  const [gpuMs, setGpuMs] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState<{ used: number; total: number; percentage: number } | null>(null);

  // Initialize performance monitoring
  useEffect(() => {
    const updateMetrics = () => {
      const metrics = performanceMonitor.getMetrics();
      if (metrics) {
        setFps(metrics.fps);
        setGpuMs(metrics.gpuTime || 0);
        if (metrics.memory) {
          // Convert bytes to MB and calculate percentage
          const usedMB = Math.round(metrics.memory / 1048576);
          const totalMB = 512; // Approximate total for display
          const percentage = Math.round((usedMB / totalMB) * 100);
          setMemoryUsage({ used: usedMB, total: totalMB, percentage });
        }
      }
    };

    const interval = setInterval(updateMetrics, 500);
    updateMetrics(); // Initial call
    return () => clearInterval(interval);
  }, []);

  // Collect detailed metrics
  const collectMetrics = useCallback(() => {
    const newMetrics: PerformanceMetrics = {
      fps: Math.round(fps),
      memory: memoryUsage || { used: 0, total: 0, percentage: 0 },
      gpu: {
        time: gpuMs,
        available: !!gpuMs && gpuMs > 0,
      },
      network: {
        requests: 0, // Would be tracked via service worker or fetch interceptor
        errors: 0,
        avgLatency: 0,
      },
      battery: {
        level: 0,
        charging: false,
        status: 'unknown',
      },
    };

    // Check battery status if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        newMetrics.battery = {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          status: battery.charging ? 'charging' : 'discharging',
        };
      }).catch(() => {
        newMetrics.battery.status = 'unavailable';
      });
    }

    setMetrics(newMetrics);
    checkThresholds(newMetrics);
  }, [fps, gpuMs, memoryUsage]);

  // Check performance thresholds and generate alerts
  const checkThresholds = useCallback((metrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // FPS threshold
    if (metrics.fps < config.threshold.fps) {
      newAlerts.push({
        type: 'fps',
        message: `Low FPS: ${metrics.fps} (threshold: ${config.threshold.fps})`,
        severity: metrics.fps < 30 ? 'error' : 'warning',
        timestamp: Date.now(),
      });
    }

    // Memory threshold
    if (metrics.memory.percentage > config.threshold.memory) {
      newAlerts.push({
        type: 'memory',
        message: `High memory usage: ${metrics.memory.percentage.toFixed(1)}% (threshold: ${config.threshold.memory}%)`,
        severity: metrics.memory.percentage > 90 ? 'error' : 'warning',
        timestamp: Date.now(),
      });
    }

    // GPU threshold
    if (metrics.gpu.time > config.threshold.gpu) {
      newAlerts.push({
        type: 'gpu',
        message: `High GPU time: ${metrics.gpu.time.toFixed(1)}ms (threshold: ${config.threshold.gpu}ms)`,
        severity: metrics.gpu.time > 32 ? 'error' : 'warning',
        timestamp: Date.now(),
      });
    }

    // Battery threshold
    if (metrics.battery.level > 0 && metrics.battery.level < config.threshold.battery) {
      newAlerts.push({
        type: 'battery',
        message: `Low battery: ${metrics.battery.level}% (threshold: ${config.threshold.battery}%)`,
        severity: metrics.battery.level < 20 ? 'error' : 'warning',
        timestamp: Date.now(),
      });
    }

    // Add new alerts
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
      
      // Auto-hide alerts after 5 seconds
      if (config.autoHide) {
        if (alertTimeoutRef.current) {
          clearTimeout(alertTimeoutRef.current);
        }
        alertTimeoutRef.current = setTimeout(() => {
          setAlerts([]);
        }, 5000);
      }
    }
  }, [config.threshold, config.autoHide]);

  // Network monitoring
  useEffect(() => {
    let requestCount = 0;
    let errorCount = 0;
    const latencies: number[] = [];

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      requestCount++;
      
      try {
        const response = await originalFetch(...args);
        const end = performance.now();
        latencies.push(end - start);
        
        // Keep only last 100 latencies
        if (latencies.length > 100) {
          latencies.shift();
        }
        
        return response;
      } catch (error) {
        errorCount++;
        throw error;
      }
    };

    const interval = setInterval(() => {
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      setMetrics(prev => prev ? {
        ...prev,
        network: {
          requests: requestCount,
          errors: errorCount,
          avgLatency: Math.round(avgLatency),
        },
      } : null);
    }, 1000);

    return () => {
      window.fetch = originalFetch;
      clearInterval(interval);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Update metrics every 500ms
  useEffect(() => {
    const interval = setInterval(collectMetrics, 500);
    return () => clearInterval(interval);
  }, [collectMetrics]);

  // Toggle visibility
  useEffect(() => {
    setIsVisible(config.showMonitor);
  }, [config.showMonitor]);

  // Auto-hide when not in development
  useEffect(() => {
    if (!import.meta.env.DEV && config.autoHide) {
      const timeout = setTimeout(() => setIsVisible(false), 10000);
      return () => clearTimeout(timeout);
    }
  }, [config.autoHide]);

  if (!isVisible || !metrics) {
    return null;
  }

  return (
    <div 
      ref={monitorRef}
      className="performance-monitor"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid var(--neon-faint)',
        borderRadius: '8px',
        padding: isMinimized ? '8px' : '12px',
        minWidth: isMinimized ? 'auto' : '280px',
        maxWidth: '320px',
        fontFamily: 'var(--font-data)',
        fontSize: '11px',
        color: 'var(--cyan)',
        boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMinimized ? 0 : '8px',
        cursor: 'pointer',
      }} onClick={() => setIsMinimized(!isMinimized)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: metrics.fps >= config.threshold.fps ? '#00FF88' : '#FF4444',
            boxShadow: metrics.fps >= config.threshold.fps ? '0 0 8px #00FF88' : '0 0 8px #FF4444',
          }} />
          <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>
            P31 MONITOR
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--dim)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ×
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginBottom: '8px',
          }}>
            <MetricItem label="FPS" value={metrics.fps} threshold={config.threshold.fps} />
            <MetricItem label="GPU" value={`${metrics.gpu.time.toFixed(1)}ms`} threshold={config.threshold.gpu} />
            <MetricItem label="MEM" value={`${metrics.memory.percentage.toFixed(1)}%`} threshold={config.threshold.memory} />
            <MetricItem label="BAT" value={`${metrics.battery.level}%`} threshold={config.threshold.battery} />
          </div>

          {/* Detailed Stats */}
          {config.showDetailed && (
            <div style={{
              background: 'rgba(0, 255, 255, 0.05)',
              padding: '8px',
              borderRadius: '4px',
              marginBottom: '8px',
            }}>
              <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>DETAILED</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px' }}>
                <div>Network: {metrics.network.requests}</div>
                <div>Errors: {metrics.network.errors}</div>
                <div>Avg Lat: {metrics.network.avgLatency}ms</div>
                <div>Status: {metrics.battery.status}</div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {config.showAlerts && alerts.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {alerts.map((alert, index) => (
                <AlertItem key={index} alert={alert} />
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{
            display: 'flex',
            gap: '4px',
            fontSize: '10px',
            opacity: 0.7,
          }}>
            <button
              onClick={() => console.log('Performance metrics:', metrics)}
              style={{
                background: 'transparent',
                border: '1px solid var(--neon-faint)',
                color: 'var(--cyan)',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              LOG
            </button>
            <button
              onClick={() => setAlerts([])}
              style={{
                background: 'transparent',
                border: '1px solid var(--neon-faint)',
                color: 'var(--cyan)',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
            <button
              onClick={() => {
                // Force garbage collection if available
                if ('gc' in window) {
                  (window as any).gc();
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--neon-faint)',
                color: 'var(--cyan)',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              GC
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Individual metric display component
 */
function MetricItem({ label, value, threshold }: { label: string; value: string | number; threshold: number }) {
  const isGood = typeof value === 'number' ? value >= threshold : true;
  const color = isGood ? '#00FF88' : '#FF4444';
  const glow = isGood ? '0 0 6px #00FF88' : '0 0 6px #FF4444';

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '6px',
      borderRadius: '4px',
      border: `1px solid ${isGood ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ 
        color, 
        fontWeight: 'bold',
        textShadow: glow,
        fontFamily: 'var(--font-data)',
      }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Alert item component
 */
function AlertItem({ alert }: { alert: PerformanceAlert }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#FF4444';
      case 'warning': return '#FFD700';
      case 'info': return '#00FFFF';
      default: return '#888888';
    }
  };

  const color = getSeverityColor(alert.severity);
  const glow = `0 0 6px ${color}`;

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.7)',
      border: `1px solid ${color}44`,
      borderRadius: '4px',
      padding: '6px',
      marginBottom: '4px',
      fontSize: '10px',
      color,
      textShadow: glow,
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
        {alert.type.toUpperCase()}: {alert.message}
      </div>
      <div style={{ opacity: 0.7, fontSize: '9px' }}>
        {new Date(alert.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

/**
 * Hook for performance monitoring with throttling
 */
export function usePerformanceMonitoring() {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState({ used: 0, total: 0, percentage: 0 });
  const [gpuTime, setGpuTime] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const measure = () => {
      frameCount++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        // Memory measurement
        if ('memory' in performance) {
          const mem = (performance as any).memory;
          setMemory({
            used: Math.round(mem.usedJSHeapSize / 1048576), // MB
            total: Math.round(mem.totalJSHeapSize / 1048576), // MB
            percentage: Math.round((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100),
          });
        }
      }

      requestAnimationFrame(measure);
    };

    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, []);

  return { fps, memory, gpuTime, setGpuTime };
}

/**
 * Performance overlay for development
 */
export function DevelopmentOverlay() {
  const { fps, memory } = usePerformanceMonitoring();

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid var(--neon-faint)',
      borderRadius: '8px',
      padding: '8px',
      fontSize: '10px',
      color: 'var(--cyan)',
      fontFamily: 'var(--font-data)',
      zIndex: 9998,
      boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)',
    }}>
      <div>FPS: {fps}</div>
      <div>MEM: {memory.used}MB / {memory.total}MB ({memory.percentage}%)</div>
      <div style={{ opacity: 0.5, fontSize: '9px', marginTop: '4px' }}>
        Dev tools - press F12 for full dev tools
      </div>
    </div>
  );
}