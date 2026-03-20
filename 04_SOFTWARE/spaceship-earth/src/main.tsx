import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { initTheme } from './sovereign/useSovereignStore';

// ── Dev-only stats overlay (never ships in prod bundle) ──────────────────────
// Run: import.meta.env.DEV is false in `vite build`, so this branch is
// tree-shaken entirely. The dynamic import avoids adding stats.js to prod chunks.
// Usage: toggle via ?stats=1 query param when running dev server.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('stats')) {
  import('stats.js').then(({ default: Stats }) => {
    // Stack all three panels (FPS / ms / MB) vertically at top-left
    [0, 1, 2].forEach((panel, i) => {
      const s = new Stats();
      s.showPanel(panel);
      s.dom.style.cssText = `position:fixed;top:${i * 48}px;left:0;z-index:9999;opacity:0.8;cursor:default`;
      document.body.appendChild(s.dom);
      const raf = () => { s.update(); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    });
  }).catch(() => {
    console.warn('[P31] stats.js not installed — run: npm i -D stats.js');
  });
}

// Apply persisted skin + accent before first paint
initTheme();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
