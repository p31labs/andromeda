// spaceship-earth/src/App.tsx
import { SovereignShell } from './components/rooms/sovereign/SovereignShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NodeProvider } from './contexts/NodeContext';
import { PwaUpdateToast } from './components/PwaUpdateToast';
import { DevOverlay } from './components/DevOverlay';

const STATS_MODE = new URLSearchParams(location.search).has('stats');

export default function App() {
  return (
    <ErrorBoundary>
      <NodeProvider>
        <SovereignShell />
        <PwaUpdateToast />
        {STATS_MODE && <DevOverlay />}
      </NodeProvider>
    </ErrorBoundary>
  );
}
