 *
 * Zustand-based state management for the Z-Index Cockpit frontend.
 * Manages all cockpit state including voltage monitoring, Fawn Guard,
 * and communication with the backend via WebSocket bridge.
 *









  // Voltage Management
  updateVoltage: (level: number) => {
    const newVoltage = Math.max(0, Math.min(100, level));








  // Catcher's Mitt Actions
  processVoltageSignal: (signal: CatchersMittSignal) => {
    const state = get();


    // Determine if Fawn Guard should activate
    const shouldActivate = signal.tier === 'HIGH' &&
                          state.fawnGuard.interventionMode === 'active';

      fawnGuard: shouldActivate














