


      // Dispatch event for quality settings dialog
      if (newLevel === 'low') {
        window.dispatchEvent(new CustomEvent('p31:perf:low'));

        // Check for critical (sustained low)
        if (this.lowFpsStartTime &&
