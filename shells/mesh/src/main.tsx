import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize P31 QMU
(window as any).P31_QMU = {
  state: 'normal',
  config: {
    grayRockThreshold: 7.5,
    motionFloor: 0.1,
    perceptualChroma: 0.14
  },
  updateTheme: function(spoons: number, calcium: number) {
    const isGrayRock = calcium <= this.config.grayRockThreshold;
    const html = document.documentElement;

    if (isGrayRock) {
      html.classList.add('p31-gray-rock');
      html.setAttribute('data-qmu-state', 'critical');
      this.state = 'critical';
    } else if (spoons <= 0.2) {
      html.setAttribute('data-qmu-state', 'low');
      this.state = 'low';
    } else {
      html.classList.remove('p31-gray-rock');
      html.setAttribute('data-qmu-state', 'normal');
      this.state = 'normal';
    }

    window.dispatchEvent(new CustomEvent('p31:qmu:update', {
      detail: { spoons, calcium, state: this.state }
    }));
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
