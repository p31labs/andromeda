import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Attempt portrait lock (fails silently on desktop / unsupported)
try {
  const orientation = screen.orientation as { lock?: (o: string) => Promise<void> };
  orientation.lock?.('portrait')?.catch(() => {});
} catch { /* unsupported */ }

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
