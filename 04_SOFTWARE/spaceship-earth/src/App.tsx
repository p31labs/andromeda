import { ImmersiveCockpitUI } from './components/rooms/sovereign/ImmersiveCockpit';
import { P31Portal } from './components/P31Portal';
import { PwaUpdateToast } from './components/PwaUpdateToast';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ImmersiveCockpitUI />
      <P31Portal />
      <PwaUpdateToast />
    </ErrorBoundary>
  );
}
