    if (typeof globalThis === 'undefined') return;

    // Use Visual Viewport API when available (modern browsers)
    if ('visualViewport' in globalThis) {
      this.visualViewport = (globalThis as Window & typeof globalThis).visualViewport;
      if (this.visualViewport) {
        this.visualViewport.addEventListener('resize', this.handleVisualViewportChange);
        this.visualViewport.addEventListener('scroll', this.handleVisualViewportChange);
      }
    }

    // Track focus/blur on inputs
    if (typeof document !== 'undefined') {
      document.addEventListener('focusin', this.handleFocusIn);
      document.addEventListener('focusout', this.handleFocusOut);
    }
