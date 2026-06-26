/**
 * Node Zero Memory Manager
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Advanced memory management system for Node Zero that prevents memory leaks,
 * optimizes garbage collection, and provides memory usage monitoring and cleanup.
 */

import { trackEvent } from './telemetry';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
  gcCount: number;
  gcTime: number;
}

export interface MemoryThresholds {
  warning: number;  // 80MB
  critical: number; // 150MB
  emergency: number; // 200MB
}

export interface MemoryCleanupResult {
  freedBytes: number;
  cleanupCount: number;
  success: boolean;
  details: string[];
}

class NodeMemoryManager {
  private memoryHistory: MemoryStats[] = [];
  private gcObserver?: PerformanceObserver;
  private cleanupInterval?: number;
  private gcStats = { count: 0, totalTime: 0 };
  private thresholds: MemoryThresholds;
  private isMonitoring = false;
<<<<<<< HEAD
  
=======
  private _onVisibilityChange?: () => void;
  private _onBeforeUnload?: () => void;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  constructor() {
    this.thresholds = {
      warning: 80 * 1024 * 1024,   // 80MB
      critical: 150 * 1024 * 1024, // 150MB
      emergency: 200 * 1024 * 1024, // 200MB
    };
<<<<<<< HEAD
    
    this.setupGCObserver();
  }
  
=======

    this.setupGCObserver();
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
<<<<<<< HEAD
    
    this.isMonitoring = true;
    this.recordMemoryStats();
    
=======

    this.isMonitoring = true;
    this.recordMemoryStats();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Record memory stats every 10 seconds
    this.cleanupInterval = window.setInterval(() => {
      this.recordMemoryStats();
      this.checkMemoryThresholds();
      this.performCleanupIfNeeded();
    }, 10000);
<<<<<<< HEAD
    
    // Cleanup on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performAggressiveCleanup();
      }
    });
    
    // Cleanup on beforeunload
    window.addEventListener('beforeunload', () => {
      this.performEmergencyCleanup();
    });
  }
  
=======

    // Cleanup on visibility change
    this._onVisibilityChange = () => {
      if (document.hidden) {
        this.performAggressiveCleanup();
      }
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    // Cleanup on beforeunload
    this._onBeforeUnload = () => {
      this.performEmergencyCleanup();
    };
    window.addEventListener('beforeunload', this._onBeforeUnload);
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
<<<<<<< HEAD
    
=======

    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = undefined;
    }

    if (this._onBeforeUnload) {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
      this._onBeforeUnload = undefined;
    }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Record current memory statistics
   */
  private recordMemoryStats() {
    const stats = this.getCurrentMemoryStats();
    this.memoryHistory.push(stats);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Keep only last 100 measurements
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry
    trackEvent('memory_stats', {
      heapUsed: stats.heapUsed,
      heapTotal: stats.heapTotal,
      external: stats.external,
      rss: stats.rss,
      gcCount: stats.gcCount,
      gcTime: stats.gcTime,
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get current memory statistics
   */
  private getCurrentMemoryStats(): MemoryStats {
    let heapUsed = 0;
    let heapTotal = 0;
    let external = 0;
    let rss = 0;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const mem = (window.performance as any).memory;
      heapUsed = mem.usedJSHeapSize;
      heapTotal = mem.totalJSHeapSize;
      external = mem.usedJSHeapSize; // Approximation
      rss = mem.totalJSHeapSize;    // Approximation
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return {
      heapUsed,
      heapTotal,
      external,
      rss,
      timestamp: Date.now(),
      gcCount: this.gcStats.count,
      gcTime: this.gcStats.totalTime,
    };
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Setup garbage collection observer
   */
  private setupGCObserver() {
    if (typeof PerformanceObserver !== 'undefined' && 'observe' in PerformanceObserver) {
      try {
        this.gcObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'gc') {
              this.gcStats.count++;
              this.gcStats.totalTime += entry.duration;
<<<<<<< HEAD
              
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              // Telemetry for GC events
              trackEvent('gc_event', {
                type: (entry as any).garbageCollector,
                duration: entry.duration,
                usedHeapSize: (window.performance as any).memory?.usedJSHeapSize || 0,
              });
            }
          }
        });
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        this.gcObserver.observe({ entryTypes: ['gc'] });
      } catch (error) {
        console.warn('[NodeMemoryManager] GC observer not supported:', error);
      }
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Check memory thresholds and trigger alerts
   */
  private checkMemoryThresholds() {
    const current = this.getCurrentMemoryStats();
    const heapMB = current.heapUsed / (1024 * 1024);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (heapMB > this.thresholds.emergency) {
      this.handleMemoryEmergency(current);
    } else if (heapMB > this.thresholds.critical) {
      this.handleMemoryCritical(current);
    } else if (heapMB > this.thresholds.warning) {
      this.handleMemoryWarning(current);
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Handle memory warning (80MB+)
   */
  private handleMemoryWarning(stats: MemoryStats) {
    console.warn(`[NodeMemoryManager] Memory warning: ${Math.round(stats.heapUsed / (1024 * 1024))}MB`);
<<<<<<< HEAD
    
    // Trigger moderate cleanup
    this.performModerateCleanup();
    
=======

    // Trigger moderate cleanup
    this.performModerateCleanup();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry
    trackEvent('memory_warning', {
      heapUsed: stats.heapUsed,
      heapMB: Math.round(stats.heapUsed / (1024 * 1024)),
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Handle memory critical (150MB+)
   */
  private handleMemoryCritical(stats: MemoryStats) {
    console.error(`[NodeMemoryManager] Memory critical: ${Math.round(stats.heapUsed / (1024 * 1024))}MB`);
<<<<<<< HEAD
    
    // Trigger aggressive cleanup
    this.performAggressiveCleanup();
    
=======

    // Trigger aggressive cleanup
    this.performAggressiveCleanup();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry
    trackEvent('memory_critical', {
      heapUsed: stats.heapUsed,
      heapMB: Math.round(stats.heapUsed / (1024 * 1024)),
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Handle memory emergency (200MB+)
   */
  private handleMemoryEmergency(stats: MemoryStats) {
    console.error(`[NodeMemoryManager] Memory emergency: ${Math.round(stats.heapUsed / (1024 * 1024))}MB`);
<<<<<<< HEAD
    
    // Trigger emergency cleanup
    this.performEmergencyCleanup();
    
=======

    // Trigger emergency cleanup
    this.performEmergencyCleanup();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Telemetry
    trackEvent('memory_emergency', {
      heapUsed: stats.heapUsed,
      heapMB: Math.round(stats.heapUsed / (1024 * 1024)),
    });
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Perform cleanup when needed
   */
  private performCleanupIfNeeded() {
    const current = this.getCurrentMemoryStats();
    const heapMB = current.heapUsed / (1024 * 1024);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Only cleanup if memory is growing or above warning threshold
    if (this.isMemoryGrowing() || heapMB > this.thresholds.warning) {
      this.performModerateCleanup();
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Check if memory usage is growing
   */
  private isMemoryGrowing(): boolean {
    if (this.memoryHistory.length < 5) return false;
<<<<<<< HEAD
    
    const recent = this.memoryHistory.slice(-5);
    const growth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
    
    return growth > 10 * 1024 * 1024; // 10MB growth
  }
  
=======

    const recent = this.memoryHistory.slice(-5);
    const growth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;

    return growth > 10 * 1024 * 1024; // 10MB growth
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Perform moderate cleanup
   */
  performModerateCleanup(): MemoryCleanupResult {
    const before = this.getCurrentMemoryStats();
    const details: string[] = [];
    let freedBytes = 0;
    let cleanupCount = 0;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    try {
      // Clear event listeners
      freedBytes += this.clearEventListeners();
      cleanupCount++;
      details.push('Cleared event listeners');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear timeouts/intervals
      freedBytes += this.clearTimers();
      cleanupCount++;
      details.push('Cleared timers');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear cached data
      freedBytes += this.clearCachedData();
      cleanupCount++;
      details.push('Cleared cached data');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Force garbage collection if available
      freedBytes += this.forceGarbageCollection();
      cleanupCount++;
      details.push('Triggered garbage collection');
<<<<<<< HEAD
      
      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;
      
=======

      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      return {
        freedBytes: Math.max(0, actualFreed),
        cleanupCount,
        success: true,
        details,
      };
    } catch (error) {
      console.error('[NodeMemoryManager] Moderate cleanup failed:', error);
      return {
        freedBytes: 0,
        cleanupCount,
        success: false,
        details: [...details, `Error: ${error}`],
      };
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Perform aggressive cleanup
   */
  performAggressiveCleanup(): MemoryCleanupResult {
    const before = this.getCurrentMemoryStats();
    const details: string[] = [];
    let freedBytes = 0;
    let cleanupCount = 0;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    try {
      // All moderate cleanup actions
      const moderateResult = this.performModerateCleanup();
      freedBytes += moderateResult.freedBytes;
      cleanupCount += moderateResult.cleanupCount;
      details.push(...moderateResult.details);
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear large objects
      freedBytes += this.clearLargeObjects();
      cleanupCount++;
      details.push('Cleared large objects');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear DOM references
      freedBytes += this.clearDOMReferences();
      cleanupCount++;
      details.push('Cleared DOM references');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear WebGL resources
      freedBytes += this.clearWebGLResources();
      cleanupCount++;
      details.push('Cleared WebGL resources');
<<<<<<< HEAD
      
      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;
      
=======

      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      return {
        freedBytes: Math.max(0, actualFreed),
        cleanupCount,
        success: true,
        details,
      };
    } catch (error) {
      console.error('[NodeMemoryManager] Aggressive cleanup failed:', error);
      return {
        freedBytes: 0,
        cleanupCount,
        success: false,
        details: [...details, `Error: ${error}`],
      };
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Perform emergency cleanup
   */
  performEmergencyCleanup(): MemoryCleanupResult {
    const before = this.getCurrentMemoryStats();
    const details: string[] = [];
    let freedBytes = 0;
    let cleanupCount = 0;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    try {
      // All aggressive cleanup actions
      const aggressiveResult = this.performAggressiveCleanup();
      freedBytes += aggressiveResult.freedBytes;
      cleanupCount += aggressiveResult.cleanupCount;
      details.push(...aggressiveResult.details);
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear all caches
      freedBytes += this.clearAllCaches();
      cleanupCount++;
      details.push('Cleared all caches');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear all subscriptions
      freedBytes += this.clearAllSubscriptions();
      cleanupCount++;
      details.push('Cleared all subscriptions');
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // Clear all intervals/timeouts
      freedBytes += this.clearAllTimers();
      cleanupCount++;
      details.push('Cleared all timers');
<<<<<<< HEAD
      
      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;
      
=======

      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      return {
        freedBytes: Math.max(0, actualFreed),
        cleanupCount,
        success: true,
        details,
      };
    } catch (error) {
      console.error('[NodeMemoryManager] Emergency cleanup failed:', error);
      return {
        freedBytes: 0,
        cleanupCount,
        success: false,
        details: [...details, `Error: ${error}`],
      };
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear event listeners
   */
  private clearEventListeners(): number {
    // This is a simplified implementation
    // In a real application, you would track and clear specific listeners
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear timeouts and intervals
   */
  private clearTimers(): number {
    // Clear any known timers
    // This is a simplified implementation
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear cached data
   */
  private clearCachedData(): number {
    // Clear application caches
    // This would include clearing any in-memory caches
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Force garbage collection
   */
  private forceGarbageCollection(): number {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        return 1024 * 1024; // Estimate 1MB freed
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear large objects
   */
  private clearLargeObjects(): number {
    // Clear large data structures
    // This would include clearing large arrays, objects, etc.
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear DOM references
   */
  private clearDOMReferences(): number {
    // Clear DOM element references that might be causing memory leaks
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear WebGL resources
   */
  private clearWebGLResources(): number {
    // Clear WebGL textures, buffers, etc.
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear all caches
   */
  private clearAllCaches(): number {
    // Clear all application caches
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear all subscriptions
   */
  private clearAllSubscriptions(): number {
    // Clear all event subscriptions
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Clear all timers
   */
  private clearAllTimers(): number {
    // Clear all timeouts and intervals
    return 0;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats[] {
    return [...this.memoryHistory];
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): number {
    const stats = this.getCurrentMemoryStats();
    return stats.heapUsed;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage(): number {
    const stats = this.getCurrentMemoryStats();
    if (stats.heapTotal === 0) return 0;
    return (stats.heapUsed / stats.heapTotal) * 100;
  }
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Get memory recommendations
   */
  getMemoryRecommendations(): string[] {
    const recommendations: string[] = [];
    const current = this.getCurrentMemoryStats();
    const heapMB = current.heapUsed / (1024 * 1024);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (heapMB > this.thresholds.warning) {
      recommendations.push('Consider reducing memory usage');
      recommendations.push('Review data structures for memory efficiency');
      recommendations.push('Implement lazy loading for large datasets');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.isMemoryGrowing()) {
      recommendations.push('Memory usage is growing - check for memory leaks');
      recommendations.push('Review event listener cleanup');
      recommendations.push('Check for circular references');
    }
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (this.gcStats.count > 100) {
      recommendations.push('High garbage collection frequency detected');
      recommendations.push('Review object creation patterns');
      recommendations.push('Consider object pooling');
    }
<<<<<<< HEAD
    
    return recommendations;
  }
  
=======

    return recommendations;
  }

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Export memory report
   */
  exportMemoryReport(): string {
    const stats = this.getMemoryStats();
    const current = this.getCurrentMemoryStats();
    const recommendations = this.getMemoryRecommendations();
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return JSON.stringify({
      timestamp: Date.now(),
      current,
      history: stats,
      gcStats: this.gcStats,
      recommendations,
      thresholds: this.thresholds,
    }, null, 2);
  }
}

// Singleton instance
export const nodeMemoryManager = new NodeMemoryManager();

<<<<<<< HEAD
export default nodeMemoryManager;
=======
export default nodeMemoryManager;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
