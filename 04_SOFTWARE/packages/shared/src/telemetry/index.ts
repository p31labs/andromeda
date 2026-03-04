export {
  telemetryAddEvent,
  telemetrySeal,
  telemetryRecoverOrphans,
  telemetryInit,
  telemetryAttachLifecycleHandlers,
  telemetryCleanup,
  telemetryGetBuffer,
  telemetryGetSessionId,
} from './telemetryStore';
export type { TelemetryEvent, TelemetryConfig } from './telemetryStore';
