 *








    this.startTime = performance.now();
    this.startMonitoring();
  }



    // Generate recommendations based on boot performance
    this.generateBootRecommendations(bootTime, success);
  }




      // Update min/max
      this.metrics.stateUpdateMinLatency = Math.min(this.metrics.stateUpdateMinLatency, latency);
      this.metrics.stateUpdateMaxLatency = Math.max(this.metrics.stateUpdateMaxLatency, latency);





      this.metrics.networkLatency.min = Math.min(this.metrics.networkLatency.min, latency);
      this.metrics.networkLatency.max = Math.max(this.metrics.networkLatency.max, latency);




  /**
   * Record errors with context
   */
  recordError(message: string, type: string, context?: string | number | Record<string, unknown>) {





    // Generate recommendations based on error patterns
    this.generateErrorRecommendations(type, message);
  }










    this.metrics.recommendations = recommendations;
  }





    this.metrics.recommendations = [...this.metrics.recommendations, ...recommendations];
  }






    this.metrics.recommendations = recommendations;
  }


    // Performance health check every 10 seconds
    this.performanceCheckInterval = window.setInterval(() => {
      this.generatePerformanceRecommendations();





export default nodePerformanceMonitor;
