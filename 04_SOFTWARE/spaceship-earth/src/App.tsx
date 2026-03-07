// spaceship-earth/src/App.tsx
import { SovereignShell } from './components/rooms/sovereign/SovereignShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NodeProvider } from './contexts/NodeContext';

export default function App() {
  return (
    <ErrorBoundary>
      <NodeProvider>
        <SovereignShell />
      </NodeProvider>
    </ErrorBoundary>
  );
}
