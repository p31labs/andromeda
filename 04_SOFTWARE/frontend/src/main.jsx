import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Service Worker registration for offline-first operation
if ('serviceWorker' in navigator && import.meta.env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('P31 Service Worker registered:', registration.scope);
        
        // Handle mesh status updates from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'mesh-status-update') {
            window.dispatchEvent(new CustomEvent('mesh-status', {
              detail: event.data.status
            }));
          }
        });
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
