
    this.render();
    this.bind();
  }










  update(state) {
    const { state: currentState, profile, intent, urgent } = state;

    // Update profile classes
    this.elements.shell.className = `phos-shell ${profile.bg} ${profile.text}`;





  renderIntent(intent) {
    const chips = intent?.chips || this.getDefaultChips();







  renderRouting(intent) {
    const label = intent?.label || 'destination';





    document.getElementById('phos-urgent-grounding')?.addEventListener('click', () => {
      window.location.href = '/layer0';
    });

























    .phos-chip--primary:hover {
      background: rgba(34, 211, 238, 0.25);
    }






    @keyframes phos-spin {
      to { transform: rotate(360deg); }
    }










    .phos-urgent-btn--primary:hover {
      background: rgba(34, 211, 238, 0.3);
    }











    .phos-content-mount:not([hidden]) {
      animation: phos-fade-in 0.5s ease-out;
    }










    // Expose for debugging
    window.p31PHOS = { phos, ui };

