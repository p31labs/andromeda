// spaceship-earth/src/App.tsx
import { SovereignShell } from './components/rooms/sovereign/SovereignShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NodeProvider } from './contexts/NodeContext';
import { PwaUpdateToast } from './components/PwaUpdateToast';
import { DevOverlay } from './components/DevOverlay';
import { PerformanceMonitor, DevelopmentOverlay } from './components/PerformanceMonitor';
import { KeyboardShortcuts, FocusManager } from './components/KeyboardShortcuts';
import { FisherEscolaQDashboard } from './components/FisherEscolaQDashboard';
import { useAccessibility } from './hooks/useAccessibility';
import { useSkipNavigation, useLiveRegion } from './hooks/useAccessibility';

const STATS_MODE = new URLSearchParams(location.search).has('stats');

export default function App() {
  // Initialize accessibility features
  useSkipNavigation();
  useLiveRegion();
  
  // Get accessibility preferences for conditional rendering
  const { preferences } = useAccessibility();

  return (
    <ErrorBoundary>
      <NodeProvider>
        {/* Accessibility infrastructure */}
        <FocusManager />
        
        {/* Performance monitoring */}
        {import.meta.env.DEV && (
          <>
            <PerformanceMonitor 
              config={{
                showMonitor: true,
                showAlerts: true,
                showDetailed: true,
                autoHide: false,
                threshold: {
                  fps: 55,
                  memory: 80,
                  gpu: 16,
                  battery: 20,
                },
              }}
            />
            <FisherEscolaQDashboard />
            <DevelopmentOverlay />
          </>
        )}

        {/* Keyboard shortcuts */}
        <KeyboardShortcuts 
          config={{
            enabled: true,
            global: true,
            showHints: preferences.focusVisibleOnly || import.meta.env.DEV,
          }}
        />

        {/* Main application */}
        <SovereignShell />
        <PwaUpdateToast />
        
        {/* Development tools */}
        {STATS_MODE && <DevOverlay />}
      </NodeProvider>
    </ErrorBoundary>
  );
}
