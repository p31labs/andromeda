/**
 * Node Zero Performance Monitor
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Comprehensive performance monitoring system for Node Zero initialization,
 * state updates, and subsystem health. Provides real-time metrics, alerting,
 * and performance optimization recommendations.
 */

import { trackEvent } from './telemetry';

export interface NodePerformanceMetrics {
  // Boot performance
  bootTime: number;
  bootAttempts: number;
  bootSuccess: boolean;
  bootError?: string;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // State update performance
  stateUpdateCount: number;
  stateUpdateAvgLatency: number;
  stateUpdateMaxLatency: number;
  stateUpdateMinLatency: number;
  stateUpdateThrottleCount: number;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Memory usage
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Subsystem health
  subsystemHealth: {
    ledger: boolean;
    game: boolean;
    vault: boolean;
    bridge: boolean;
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Network performance
  networkLatency: {
    average: number;
    min: number;
    max: number;
    timeouts: number;
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Error tracking
  errorCount: number;
  errorRate: number;
  lastError?: {
    timestamp: number;
    message: string;
    type: string;
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Optimization recommendations
  recommendations: string[];
}

class NodePerformanceMonitor {
  private metrics: NodePerformanceMetrics;
  private startTime: number;
  private stateUpdateLatencies: number[] = [];
  private networkLatencies: number[] = [];
  private errorHistory: Array<{ timestamp: number; message: string; type: string }> = [];
  private memoryCheckInterval?: number;
  private performanceCheckInterval?: number;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  constructor() {
    this.metrics = {
      bootTime: 0,
      bootAttempts: 0,
      bootSuccess: false,
      stateUpdateCount: 0,
      stateUpdateAvgLatency: 0,
      stateUpdateMaxLatency: 0,
      stateUpdateMinLatency: Infinity,
      stateUpdateThrottleCount: 0,
      memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      subsystemHealth: { ledger: false, game: false, vault: false, bridge: false },
      networkLatency: { average: 0, min: Infinity, max: 0, timeouts: 0 },
      errorCount: 0,
      errorRate: 0,
      recommendations: [],
    };
<<<<<<< HEAD
    
    this.startTime = performance.now();
    this.startMonitoring();
  }
  
=======

    this.startTime = performance.now();
    this.startMonitoring();
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Record Node Zero boot metrics
   */
  recordBoot(bootTime: number, success: boolean, error?: string) {
    this.metrics.bootTime = bootTime;
    this.metrics.bootAttempts++;
    this.metrics.bootSuccess = success;
    this.metrics.bootError = error;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry
    trackEvent('node_boot_metrics', {
      bootTime,
      success,
      attempts: this.metrics.bootAttempts,
      error,
    });
<<<<<<< HEAD
    
    // Generate recommendations based on boot performance
    this.generateBootRecommendations(bootTime, success);
  }
  
=======

    // Generate recommendations based on boot performance
    this.generateBootRecommendations(bootTime, success);
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Record state update performance
   */
  recordStateUpdate(latency: number, throttled: boolean = false) {
    this.metrics.stateUpdateCount++;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (throttled) {
      this.metrics.stateUpdateThrottleCount++;
    } else {
      this.stateUpdateLatencies.push(latency);
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Keep only last 100 measurements for performance
      if (this.stateUpdateLatencies.length > 100) {
        this.stateUpdateLatencies.shift();
      }
<<<<<<< HEAD
      
      // Update min/max
      this.metrics.stateUpdateMinLatency = Math.min(this.metrics.stateUpdateMinLatency, latency);
      this.metrics.stateUpdateMaxLatency = Math.max(this.metrics.stateUpdateMaxLatency, latency);
      
=======

      // Update min/max
      this.metrics.stateUpdateMinLatency = Math.min(this.metrics.stateUpdateMinLatency, latency);
      this.metrics.stateUpdateMaxLatency = Math.max(this.metrics.stateUpdateMaxLatency, latency);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Calculate average
      const sum = this.stateUpdateLatencies.reduce((a, b) => a + b, 0);
      this.metrics.stateUpdateAvgLatency = sum / this.stateUpdateLatencies.length;
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Alert on high latency
    if (latency > 100) {
      this.recordError('High state update latency', 'performance', latency);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Record network operation latency
   */
  recordNetworkLatency(latency: number, timeout: boolean = false) {
    if (timeout) {
      this.metrics.networkLatency.timeouts++;
    } else {
      this.networkLatencies.push(latency);
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Keep only last 50 measurements
      if (this.networkLatencies.length > 50) {
        this.networkLatencies.shift();
      }
<<<<<<< HEAD
      
      this.metrics.networkLatency.min = Math.min(this.metrics.networkLatency.min, latency);
      this.metrics.networkLatency.max = Math.max(this.metrics.networkLatency.max, latency);
      
=======

      this.metrics.networkLatency.min = Math.min(this.metrics.networkLatency.min, latency);
      this.metrics.networkLatency.max = Math.max(this.metrics.networkLatency.max, latency);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      const sum = this.networkLatencies.reduce((a, b) => a + b, 0);
      this.metrics.networkLatency.average = sum / this.networkLatencies.length;
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Update subsystem health status
   */
  updateSubsystemHealth(subsystem: keyof NodePerformanceMetrics['subsystemHealth'], healthy: boolean) {
    this.metrics.subsystemHealth[subsystem] = healthy;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Alert on subsystem failure
    if (!healthy) {
      this.recordError(`Subsystem ${subsystem} failed`, 'system', subsystem);
    }
  }
<<<<<<< HEAD
  
  /**
   * Record errors with context
   */
  recordError(message: string, type: string, context?: any) {
=======

  /**
   * Record errors with context
   */
  recordError(message: string, type: string, context?: string | number | Record<string, unknown>) {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.metrics.errorCount++;
    this.errorHistory.push({
      timestamp: Date.now(),
      message,
      type,
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 20 errors
    if (this.errorHistory.length > 20) {
      this.errorHistory.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Calculate error rate (errors per minute)
    const timeWindow = 60000; // 1 minute
    const recentErrors = this.errorHistory.filter(e => Date.now() - e.timestamp < timeWindow);
    this.metrics.errorRate = (recentErrors.length / timeWindow) * 60000;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Update last error
    this.metrics.lastError = {
      timestamp: Date.now(),
      message,
      type,
    };
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry
    trackEvent('node_error', {
      message,
      type,
      context,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.errorRate,
    });
<<<<<<< HEAD
    
    // Generate recommendations based on error patterns
    this.generateErrorRecommendations(type, message);
  }
  
=======

    // Generate recommendations based on error patterns
    this.generateErrorRecommendations(type, message);
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Update memory usage metrics
   */
  updateMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const mem = (window.performance as any).memory;
      this.metrics.memoryUsage = {
        heapUsed: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        external: mem.usedJSHeapSize, // Approximation for external memory
        rss: mem.totalJSHeapSize,    // Approximation for RSS
      };
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Alert on high memory usage
      if (mem.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
        this.recordError('High memory usage detected', 'memory', mem.usedJSHeapSize);
      }
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get current performance metrics
   */
  getMetrics(): NodePerformanceMetrics {
    // Update recommendations
    this.generatePerformanceRecommendations();
    return { ...this.metrics };
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get performance summary for display
   */
  getPerformanceSummary() {
    const uptime = performance.now() - this.startTime;
    const avgStateUpdate = this.metrics.stateUpdateAvgLatency;
    const errorRate = this.metrics.errorRate;
    const memoryMB = this.metrics.memoryUsage.heapUsed / (1024 * 1024);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return {
      uptime: Math.round(uptime / 1000),
      bootTime: Math.round(this.metrics.bootTime),
      stateUpdateLatency: Math.round(avgStateUpdate),
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: Math.round(memoryMB * 100) / 100,
      subsystemHealth: Object.values(this.metrics.subsystemHealth).filter(Boolean).length,
      totalSubsystems: Object.keys(this.metrics.subsystemHealth).length,
      recommendations: this.metrics.recommendations.slice(0, 3), // Top 3 recommendations
    };
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Generate boot performance recommendations
   */
  private generateBootRecommendations(bootTime: number, success: boolean) {
    const recommendations: string[] = [];
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (!success) {
      recommendations.push('Investigate Node Zero initialization failures');
      recommendations.push('Check IndexedDB and crypto API availability');
      recommendations.push('Verify network connectivity for remote dependencies');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (bootTime > 5000) {
      recommendations.push('Optimize Node Zero boot sequence');
      recommendations.push('Consider lazy loading non-critical subsystems');
      recommendations.push('Review dependency initialization order');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.metrics.bootAttempts > 1) {
      recommendations.push('Improve retry logic for failed boot attempts');
      recommendations.push('Add circuit breaker for unreliable dependencies');
    }
<<<<<<< HEAD
    
    this.metrics.recommendations = recommendations;
  }
  
=======

    this.metrics.recommendations = recommendations;
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Generate error-based recommendations
   */
  private generateErrorRecommendations(errorType: string, message: string) {
    const recommendations: string[] = [];
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (errorType === 'performance') {
      recommendations.push('Optimize state update frequency');
      recommendations.push('Review throttling configuration');
      recommendations.push('Consider debouncing rapid state changes');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (errorType === 'system') {
      recommendations.push('Check subsystem dependencies');
      recommendations.push('Verify resource availability');
      recommendations.push('Review error handling in failed subsystem');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (errorType === 'memory') {
      recommendations.push('Review memory leaks in Node Zero');
      recommendations.push('Implement garbage collection optimization');
      recommendations.push('Monitor for circular references');
    }
<<<<<<< HEAD
    
    this.metrics.recommendations = [...this.metrics.recommendations, ...recommendations];
  }
  
=======

    this.metrics.recommendations = [...this.metrics.recommendations, ...recommendations];
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Generate overall performance recommendations
   */
  private generatePerformanceRecommendations() {
    const recommendations: string[] = [];
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // State update performance
    if (this.metrics.stateUpdateAvgLatency > 50) {
      recommendations.push('Consider reducing state update frequency');
      recommendations.push('Review state update throttling configuration');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Memory usage
    const memoryMB = this.metrics.memoryUsage.heapUsed / (1024 * 1024);
    if (memoryMB > 50) {
      recommendations.push('Monitor for memory leaks in Node Zero');
      recommendations.push('Consider implementing memory cleanup');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Error rate
    if (this.metrics.errorRate > 10) {
      recommendations.push('Investigate high error rate');
      recommendations.push('Review error handling and recovery');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Network performance
    if (this.metrics.networkLatency.average > 1000) {
      recommendations.push('Optimize network operations');
      recommendations.push('Consider implementing request caching');
    }
<<<<<<< HEAD
    
    this.metrics.recommendations = recommendations;
  }
  
=======

    this.metrics.recommendations = recommendations;
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Start monitoring intervals
   */
  private startMonitoring() {
    // Memory monitoring every 30 seconds
    this.memoryCheckInterval = window.setInterval(() => {
      this.updateMemoryUsage();
    }, 30000);
<<<<<<< HEAD
    
    // Performance health check every 10 seconds
    this.performanceCheckInterval = window.setInterval(() => {
      this.generatePerformanceRecommendations();
      
=======

    // Performance health check every 10 seconds
    this.performanceCheckInterval = window.setInterval(() => {
      this.generatePerformanceRecommendations();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Log performance summary periodically
      const summary = this.getPerformanceSummary();
      console.debug('[NodePerformanceMonitor] Performance Summary:', summary);
    }, 10000);
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Stop monitoring
   */
  stop() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      bootTime: 0,
      bootAttempts: 0,
      bootSuccess: false,
      stateUpdateCount: 0,
      stateUpdateAvgLatency: 0,
      stateUpdateMaxLatency: 0,
      stateUpdateMinLatency: Infinity,
      stateUpdateThrottleCount: 0,
      memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      subsystemHealth: { ledger: false, game: false, vault: false, bridge: false },
      networkLatency: { average: 0, min: Infinity, max: 0, timeouts: 0 },
      errorCount: 0,
      errorRate: 0,
      recommendations: [],
    };
    this.stateUpdateLatencies = [];
    this.networkLatencies = [];
    this.errorHistory = [];
    this.startTime = performance.now();
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Export metrics for debugging
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      errorHistory: this.errorHistory.slice(-5), // Last 5 errors
    }, null, 2);
  }
}

// Singleton instance
export const nodePerformanceMonitor = new NodePerformanceMonitor();

// Global error handler integration
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    nodePerformanceMonitor.recordError(
      event.message || 'Unknown error',
      'unhandled',
      { filename: event.filename, lineno: event.lineno, colno: event.colno }
    );
  });
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  window.addEventListener('unhandledrejection', (event) => {
    nodePerformanceMonitor.recordError(
      event.reason?.message || 'Unhandled promise rejection',
      'promise',
      event.reason
    );
  });
}

<<<<<<< HEAD
export default nodePerformanceMonitor;
=======
export default nodePerformanceMonitor;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
