import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { initTheme } from './sovereign/useSovereignStore';
import { K4MeshProvider } from '@p31/shared/net/k4MeshProvider';

// Apply persisted skin + accent before first paint
initTheme();

// Generate a persistent node ID from localStorage (survives reloads)
const getNodeId = () => {
  const stored = localStorage.getItem('p31-node-id');
  if (stored) return stored;
  const id = `node-${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem('p31-node-id', id);
  return id;
};

const nodeId = getNodeId();
const relayUrl = import.meta.env.VITE_K4_RELAY_URL || 'https://k4-cage.trimtab-signal.workers.dev';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <K4MeshProvider
        nodeId={nodeId}
        room="family-mesh"
        endpoint={relayUrl}
        autoConnect={true}
      >
        <App />
      </K4MeshProvider>
    </React.StrictMode>
  );
}
