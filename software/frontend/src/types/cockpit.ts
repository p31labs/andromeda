 *
 * TypeScript type definitions for the Z-Index Cockpit frontend state management.
 * These types define the complete state structure for the cockpit interface.
 *


  // Fawn Guard
  fawnGuard: FawnGuardState;

  // Catcher's Mitt
  catchersMitt: CatchersMittState;

  // System Status
  systemStatus: SystemStatus;




  // Catcher's Mitt Actions
  processVoltageSignal: (signal: CatchersMittSignal) => void;
  setProcessing: (isProcessing: boolean) => void;



export type LockoutReason =
