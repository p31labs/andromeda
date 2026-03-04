// src/engine/confetti.ts
// Lightweight CSS confetti — no canvas, no dependencies.

import { CONFETTI } from '../config/easterEggs';

let styleInjected = false;

function injectStyle(): void {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

export function spawnConfetti(count: number = CONFETTI.normalCount): void {
  injectStyle();

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    const color = CONFETTI.colors[Math.floor(Math.random() * CONFETTI.colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 8;
    piece.style.cssText = `
      position:absolute;top:-20px;left:${left}%;
      width:${size}px;height:${size * 1.5}px;
      background:${color};border-radius:1px;
      animation:confetti-fall ${1.5 + Math.random()}s ease-in ${delay}s forwards;
    `;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), CONFETTI.duration + 500);
}
