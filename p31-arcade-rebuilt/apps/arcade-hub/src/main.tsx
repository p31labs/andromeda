import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeSpoonStore } from '@p31/core';
import { generateCSSVariables } from '@p31/design-system';

// Inject design tokens
const style = document.createElement('style');
style.textContent = generateCSSVariables();
document.head.appendChild(style);

// Initialize stores
initializeSpoonStore();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
