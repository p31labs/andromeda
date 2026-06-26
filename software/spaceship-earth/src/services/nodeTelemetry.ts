/**
 * Node Zero Enhanced Telemetry System
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Comprehensive telemetry and monitoring system for Node Zero that provides
 * detailed performance metrics, error tracking, user behavior analytics,
 * and system health monitoring.
 */

import { trackEvent } from './telemetry';

export interface NodeTelemetryMetrics {
  // Performance metrics
  bootTime: number;
  stateUpdateLatency: number[];
  memoryUsage: number[];
  networkLatency: number[];
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Error tracking
  errorCount: number;
  errorTypes: Record<string, number>;
  errorStacks: string[];
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // User behavior
  sessionDuration: number;
  activeTime: number;
  interactionCount: number;
  featureUsage: Record<string, number>;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // System health
  subsystemHealth: Record<string, boolean>;
  resourceUsage: {
    cpu: number[];
    memory: number[];
    network: number[];
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Node Zero specific
  coherenceLevels: number[];
  spoonsLevels: number[];
  tierChanges: Array<{ from: string; to: string; timestamp: number }>;
  bondEvents: Array<{ type: string; peerId: string; timestamp: number }>;
}

export interface TelemetryConfig {
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  samplingRate: number;
  debugMode: boolean;
}

<<<<<<< HEAD
class NodeTelemetry {
  private metrics: NodeTelemetryMetrics;
  private config: TelemetryConfig;
  private batch: any[] = [];
  private flushTimer?: number;
=======
interface TelemetryEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

interface MemoryInfo extends Record<string, unknown> {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface TelemetrySummary {
  sessionDuration: number;
  activeTime: number;
  interactionCount: number;
  errorCount: number;
  bootTime: number;
  avgLatency: number;
  avgCoherence: number;
  memoryUsage: number;
  featureUsage: Record<string, number>;
  subsystemHealth: Record<string, number | boolean>;
}

class NodeTelemetry {
  private metrics: NodeTelemetryMetrics;
  private config: TelemetryConfig;
  private batch: TelemetryEvent[] = [];
  private flushTimer?: number;
  private resourceInterval?: number;
  private sessionInterval?: number;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  private startTime: number;
  private activeTimeStart: number;
  private interactionTimer?: number;
  private isTracking = false;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  constructor() {
    this.config = {
      enabled: true,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      samplingRate: 1.0, // 100% sampling
      debugMode: false,
    };
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.metrics = {
      bootTime: 0,
      stateUpdateLatency: [],
      memoryUsage: [],
      networkLatency: [],
      errorCount: 0,
      errorTypes: {},
      errorStacks: [],
      sessionDuration: 0,
      activeTime: 0,
      interactionCount: 0,
      featureUsage: {},
      subsystemHealth: {},
      resourceUsage: {
        cpu: [],
        memory: [],
        network: [],
      },
      coherenceLevels: [],
      spoonsLevels: [],
      tierChanges: [],
      bondEvents: [],
    };
<<<<<<< HEAD
    
    this.startTime = performance.now();
    this.activeTimeStart = Date.now();
    
    this.setupEventListeners();
    this.startTracking();
  }
  
=======

    this.startTime = performance.now();
    this.activeTimeStart = Date.now();

    this.setupEventListeners();
    this.startTracking();
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Configure telemetry settings
   */
  configure(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.config.debugMode) {
      console.log('[NodeTelemetry] Configuration updated:', this.config);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Start telemetry tracking
   */
  startTracking(): void {
    if (this.isTracking) return;
<<<<<<< HEAD
    
    this.isTracking = true;
    
=======

    this.isTracking = true;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Start periodic flushing
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
<<<<<<< HEAD
    
    // Track resource usage periodically
    setInterval(() => {
      this.trackResourceUsage();
    }, 10000); // Every 10 seconds
    
    // Track session duration
    setInterval(() => {
      this.metrics.sessionDuration = Date.now() - this.startTime;
    }, 1000);
    
=======

    // Track resource usage periodically
    this.resourceInterval = window.setInterval(() => {
      this.trackResourceUsage();
    }, 10000); // Every 10 seconds

    // Track session duration
    this.sessionInterval = window.setInterval(() => {
      this.metrics.sessionDuration = Date.now() - this.startTime;
    }, 1000);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.config.debugMode) {
      console.log('[NodeTelemetry] Tracking started');
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Stop telemetry tracking
   */
  stopTracking(): void {
    this.isTracking = false;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
<<<<<<< HEAD
    
    this.flush(); // Final flush
    
=======
    if (this.resourceInterval) {
      clearInterval(this.resourceInterval);
      this.resourceInterval = undefined;
    }
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
      this.sessionInterval = undefined;
    }

    this.flush(); // Final flush

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.config.debugMode) {
      console.log('[NodeTelemetry] Tracking stopped');
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Setup event listeners for user interactions
   */
  private setupEventListeners(): void {
    // Track user interactions
    ['click', 'keydown', 'scroll', 'mousemove'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.trackInteraction();
      }, { passive: true });
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.activeTimeStart = 0;
      } else {
        this.activeTimeStart = Date.now();
      }
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Track errors
    window.addEventListener('error', (event) => {
      this.trackError('unhandled_error', event.message, event.error?.stack);
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', event.reason?.message, event.reason?.stack);
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track Node Zero boot metrics
   */
  trackBoot(bootTime: number): void {
    this.metrics.bootTime = bootTime;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'boot',
      timestamp: Date.now(),
      data: {
        bootTime,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        connection: this.getConnectionInfo(),
      },
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.config.debugMode) {
      console.log(`[NodeTelemetry] Boot tracked: ${bootTime}ms`);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track state update performance
   */
  trackStateUpdate(latency: number): void {
    this.metrics.stateUpdateLatency.push(latency);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 100 measurements
    if (this.metrics.stateUpdateLatency.length > 100) {
      this.metrics.stateUpdateLatency.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'state_update',
      timestamp: Date.now(),
      data: {
        latency,
        avgLatency: this.getAverageLatency(),
      },
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    const memory = this.getMemoryInfo();
    if (memory) {
      this.metrics.memoryUsage.push(memory.usedJSHeapSize);
      this.metrics.resourceUsage.memory.push(memory.usedJSHeapSize);
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Keep only last 100 measurements
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }
      if (this.metrics.resourceUsage.memory.length > 100) {
        this.metrics.resourceUsage.memory.shift();
      }
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      this.addToBatch({
        type: 'memory_usage',
        timestamp: Date.now(),
        data: memory,
      });
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track network latency
   */
  trackNetworkLatency(latency: number, url?: string): void {
    this.metrics.networkLatency.push(latency);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 50 measurements
    if (this.metrics.networkLatency.length > 50) {
      this.metrics.networkLatency.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'network_latency',
      timestamp: Date.now(),
      data: {
        latency,
        url,
        connection: this.getConnectionInfo(),
      },
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track errors with context
   */
  trackError(type: string, message: string, stack?: string): void {
    this.metrics.errorCount++;
    this.metrics.errorTypes[type] = (this.metrics.errorTypes[type] || 0) + 1;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (stack) {
      this.metrics.errorStacks.push(stack);
      // Keep only last 20 stacks
      if (this.metrics.errorStacks.length > 20) {
        this.metrics.errorStacks.shift();
      }
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'error',
      timestamp: Date.now(),
      data: {
        type,
        message,
        stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.config.debugMode) {
      console.error(`[NodeTelemetry] Error tracked: ${type} - ${message}`);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string): void {
    this.metrics.featureUsage[feature] = (this.metrics.featureUsage[feature] || 0) + 1;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'feature_usage',
      timestamp: Date.now(),
      data: {
        feature,
        count: this.metrics.featureUsage[feature],
      },
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.config.debugMode) {
      console.log(`[NodeTelemetry] Feature usage: ${feature}`);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track subsystem health
   */
  trackSubsystemHealth(subsystem: string, healthy: boolean): void {
    this.metrics.subsystemHealth[subsystem] = healthy;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'subsystem_health',
      timestamp: Date.now(),
      data: {
        subsystem,
        healthy,
      },
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track Node Zero specific metrics
   */
  trackCoherenceLevel(level: number): void {
    this.metrics.coherenceLevels.push(level);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 200 measurements
    if (this.metrics.coherenceLevels.length > 200) {
      this.metrics.coherenceLevels.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'coherence_level',
      timestamp: Date.now(),
      data: {
        level,
        avgLevel: this.getAverageCoherence(),
      },
    });
  }
<<<<<<< HEAD
  
  trackSpoonsLevel(level: number): void {
    this.metrics.spoonsLevels.push(level);
    
=======

  trackSpoonsLevel(level: number): void {
    this.metrics.spoonsLevels.push(level);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 200 measurements
    if (this.metrics.spoonsLevels.length > 200) {
      this.metrics.spoonsLevels.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'spoons_level',
      timestamp: Date.now(),
      data: {
        level,
      },
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  trackTierChange(from: string, to: string): void {
    this.metrics.tierChanges.push({
      from,
      to,
      timestamp: Date.now(),
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 50 changes
    if (this.metrics.tierChanges.length > 50) {
      this.metrics.tierChanges.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'tier_change',
      timestamp: Date.now(),
      data: {
        from,
        to,
      },
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  trackBondEvent(type: string, peerId: string): void {
    this.metrics.bondEvents.push({
      type,
      peerId,
      timestamp: Date.now(),
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 100 events
    if (this.metrics.bondEvents.length > 100) {
      this.metrics.bondEvents.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    this.addToBatch({
      type: 'bond_event',
      timestamp: Date.now(),
      data: {
        type,
        peerId,
      },
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track user interaction
   */
  private trackInteraction(): void {
    this.metrics.interactionCount++;
<<<<<<< HEAD
    
    // Reset active time tracking
    this.activeTimeStart = Date.now();
    
=======

    // Reset active time tracking
    this.activeTimeStart = Date.now();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Clear existing timer
    if (this.interactionTimer) {
      clearTimeout(this.interactionTimer);
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Set new timer to track active time
    this.interactionTimer = window.setTimeout(() => {
      this.metrics.activeTime = Date.now() - this.startTime;
    }, 1000);
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Track resource usage
   */
  private trackResourceUsage(): void {
    // Track memory
    this.trackMemoryUsage();
<<<<<<< HEAD
    
    // Track CPU (approximation)
    const cpuUsage = this.getCpuUsage();
    this.metrics.resourceUsage.cpu.push(cpuUsage);
    
=======

    // Track CPU (approximation)
    const cpuUsage = this.getCpuUsage();
    this.metrics.resourceUsage.cpu.push(cpuUsage);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 100 measurements
    if (this.metrics.resourceUsage.cpu.length > 100) {
      this.metrics.resourceUsage.cpu.shift();
    }
  }
<<<<<<< HEAD
  
  /**
   * Add event to batch
   */
  private addToBatch(event: any): void {
=======

  /**
   * Add event to batch
   */
  private addToBatch(event: TelemetryEvent): void {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return;
    }
<<<<<<< HEAD
    
    this.batch.push(event);
    
=======

    this.batch.push(event);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.batch.length >= this.config.batchSize) {
      this.flush();
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Flush batch to telemetry endpoint
   */
  private async flush(): Promise<void> {
    if (this.batch.length === 0 || !this.config.enabled) {
      return;
    }
<<<<<<< HEAD
    
    const events = [...this.batch];
    this.batch = [];
    
    try {
      // Send to telemetry endpoint
      await this.sendToEndpoint(events);
      
=======

    const events = [...this.batch];
    this.batch = [];

    try {
      // Send to telemetry endpoint
      await this.sendToEndpoint(events);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      if (this.config.debugMode) {
        console.log(`[NodeTelemetry] Flushed ${events.length} events`);
      }
    } catch (error) {
      console.error('[NodeTelemetry] Failed to flush events:', error);
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Retry logic
      if (this.config.maxRetries > 0) {
        this.config.maxRetries--;
        this.batch.unshift(...events); // Re-add to batch
      }
    }
  }
<<<<<<< HEAD
  
  /**
   * Send events to telemetry endpoint
   */
  private async sendToEndpoint(events: any[]): Promise<void> {
=======

  /**
   * Send events to telemetry endpoint
   */
  private async sendToEndpoint(events: TelemetryEvent[]): Promise<void> {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // This would send to your actual telemetry endpoint
    // For now, we'll use the existing trackEvent function
    events.forEach(event => {
      trackEvent(event.type, event.data);
    });
  }
<<<<<<< HEAD
  
  /**
   * Get memory information
   */
  private getMemoryInfo(): any {
=======

  /**
   * Get memory information
   */
  private getMemoryInfo(): MemoryInfo | null {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const mem = (window.performance as any).memory;
      return {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      };
    }
    return null;
  }
<<<<<<< HEAD
  
  /**
   * Get connection information
   */
  private getConnectionInfo(): any {
=======

  /**
   * Get connection information
   */
  private getConnectionInfo(): ConnectionInfo | null {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return null;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get CPU usage approximation
   */
  private getCpuUsage(): number {
    // Simple CPU usage approximation
    const start = performance.now();
    let iterations = 0;
<<<<<<< HEAD
    
    while (performance.now() - start < 10) { // 10ms test
      iterations++;
    }
    
    return iterations;
  }
  
=======

    while (performance.now() - start < 10) { // 10ms test
      iterations++;
    }

    return iterations;
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get average state update latency
   */
  private getAverageLatency(): number {
    if (this.metrics.stateUpdateLatency.length === 0) return 0;
    const sum = this.metrics.stateUpdateLatency.reduce((a, b) => a + b, 0);
    return sum / this.metrics.stateUpdateLatency.length;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get average coherence level
   */
  private getAverageCoherence(): number {
    if (this.metrics.coherenceLevels.length === 0) return 0;
    const sum = this.metrics.coherenceLevels.reduce((a, b) => a + b, 0);
    return sum / this.metrics.coherenceLevels.length;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get current telemetry metrics
   */
  getMetrics(): NodeTelemetryMetrics {
    return { ...this.metrics };
  }
<<<<<<< HEAD
  
  /**
   * Get telemetry summary
   */
  getSummary(): any {
=======

  /**
   * Get telemetry summary
   */
  getSummary(): TelemetrySummary {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return {
      sessionDuration: this.metrics.sessionDuration,
      activeTime: this.metrics.activeTime,
      interactionCount: this.metrics.interactionCount,
      errorCount: this.metrics.errorCount,
      bootTime: this.metrics.bootTime,
      avgLatency: this.getAverageLatency(),
      avgCoherence: this.getAverageCoherence(),
      memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || 0,
      featureUsage: { ...this.metrics.featureUsage },
      subsystemHealth: { ...this.metrics.subsystemHealth },
    };
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Export telemetry data
   */
  exportData(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      config: this.config,
      metrics: this.metrics,
      summary: this.getSummary(),
    }, null, 2);
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Reset telemetry data
   */
  reset(): void {
    this.metrics = {
      bootTime: 0,
      stateUpdateLatency: [],
      memoryUsage: [],
      networkLatency: [],
      errorCount: 0,
      errorTypes: {},
      errorStacks: [],
      sessionDuration: 0,
      activeTime: 0,
      interactionCount: 0,
      featureUsage: {},
      subsystemHealth: {},
      resourceUsage: {
        cpu: [],
        memory: [],
        network: [],
      },
      coherenceLevels: [],
      spoonsLevels: [],
      tierChanges: [],
      bondEvents: [],
    };
    this.startTime = performance.now();
    this.activeTimeStart = Date.now();
    this.batch = [];
  }
}

// Singleton instance
export const nodeTelemetry = new NodeTelemetry();

<<<<<<< HEAD
export default nodeTelemetry;
=======
export default nodeTelemetry;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
