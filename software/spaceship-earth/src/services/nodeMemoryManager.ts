 *
  private _onVisibilityChange?: () => void;
  private _onBeforeUnload?: () => void;


    this.setupGCObserver();
  }


    this.isMonitoring = true;
    this.recordMemoryStats();


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



    if (this._onVisibilityChange) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      this._onVisibilityChange = undefined;
    }

    if (this._onBeforeUnload) {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
      this._onBeforeUnload = undefined;
    }














    // Trigger moderate cleanup
    this.performModerateCleanup();



    // Trigger aggressive cleanup
    this.performAggressiveCleanup();



    // Trigger emergency cleanup
    this.performEmergencyCleanup();





    const recent = this.memoryHistory.slice(-5);
    const growth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;

    return growth > 10 * 1024 * 1024; // 10MB growth
  }






      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;







      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;







      const after = this.getCurrentMemoryStats();
      const actualFreed = before.heapUsed - after.heapUsed;



















    return recommendations;
  }


export default nodeMemoryManager;
