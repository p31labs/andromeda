/**
 * Procedural Texture Generator for P31 Card Table
 * Creates all card textures in-memory via HTML5 Canvas API
 * ZERO external image assets loaded
 */

import { CanvasTexture } from 'three';

// P31 Canon Colors
const COLORS = {
  phos: '#39ff14',
  cyan: '#00f5ff',
  orchid: '#da70d6',
  gold: '#feca57',
  white: '#ffffff',
  black: '#0a0a0a',
  darkGrey: '#1a1a2e',
  tableDark: '#111522',
};

// Card dimensions (in texture pixels)
const CARD_WIDTH = 512;
const CARD_HEIGHT = 768;

// Suit symbols as Unicode
const SUITS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// Suit colors
const SUIT_COLORS: Record<string, string> = {
  hearts: '#ff4444',
  diamonds: '#ff4444',
  clubs: '#333333',
  spades: '#333333',
};

// Card values
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Generate front face texture for a playing card
 */
export function generateCardFrontTexture(value: string, suit: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Card background - slight off-white for realism
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Inner border (beveled edge effect)
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16);

  // Corner radius cleanup
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, 20, 20);
  ctx.fillRect(CARD_WIDTH - 20, 0, 20, 20);
  ctx.fillRect(0, CARD_HEIGHT - 20, 20, 20);
  ctx.fillRect(CARD_WIDTH - 20, CARD_HEIGHT - 20, 20, 20);

  const suitColor = SUIT_COLORS[suit] || '#333333';

  // Top-left value
  ctx.fillStyle = suitColor;
  ctx.font = 'bold 72px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, 30, 25);

  // Top-left suit
  ctx.font = '64px serif';
  ctx.fillText(SUITS[suit as keyof typeof SUITS] || suit, 30, 95);

  // Bottom-right value (rotated)
  ctx.save();
  ctx.translate(CARD_WIDTH - 30, CARD_HEIGHT - 25);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 72px "Courier New", monospace';
  ctx.fillText(value, 0, 0);
  ctx.restore();

  // Bottom-right suit (rotated)
  ctx.save();
  ctx.translate(CARD_WIDTH - 30, CARD_HEIGHT - 95);
  ctx.rotate(Math.PI);
  ctx.font = '64px serif';
  ctx.fillText(SUITS[suit as keyof typeof SUITS] || suit, 0, 0);
  ctx.restore();

  // Center design based on face card or number
  ctx.font = '200px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (['J', 'Q', 'K'].includes(value)) {
    // Face card - draw geometric portrait placeholder
    drawGeometricPortrait(ctx, value, suit, CARD_WIDTH / 2, CARD_HEIGHT / 2);
  } else if (value === 'A') {
    // Ace - large centered suit
    ctx.font = '280px serif';
    ctx.fillStyle = suitColor;
    ctx.fillText(SUITS[suit as keyof typeof SUITS] || suit, CARD_WIDTH / 2, CARD_HEIGHT / 2);

    // Inner glow ring
    ctx.strokeStyle = suitColor + '40';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(CARD_WIDTH / 2, CARD_HEIGHT / 2, 140, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Number card - multiple pips
    drawNumberCardPips(ctx, value, suit, suitColor);
  }

  // Subtle noise texture overlay
  addNoiseOverlay(ctx, 0.02);

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generate card back texture (P31 branded)
 */
export function generateCardBackTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Dark base
  ctx.fillStyle = COLORS.tableDark;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Border
  ctx.strokeStyle = COLORS.phos;
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, CARD_WIDTH - 24, CARD_HEIGHT - 24);

  // Inner border
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_WIDTH - 48, CARD_HEIGHT - 48);

  // Geometric P31 pattern
  const centerX = CARD_WIDTH / 2;
  const centerY = CARD_HEIGHT / 2;

  // Phos triangle
  ctx.fillStyle = COLORS.phos + '30';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 80);
  ctx.lineTo(centerX - 70, centerY + 40);
  ctx.lineTo(centerX + 70, centerY + 40);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.phos;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cyan circle
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Orchid center dot
  ctx.fillStyle = COLORS.orchid;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
  ctx.fill();

  // Background pattern lines
  ctx.strokeStyle = COLORS.phos + '15';
  ctx.lineWidth = 1;
  for (let i = 0; i < CARD_WIDTH; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - 60, CARD_HEIGHT);
    ctx.stroke();
  }

  // Noise
  addNoiseOverlay(ctx, 0.03);

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

/**
 * Generate chip texture
 */
export function generateChipTexture(color: string, value: number): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Outer ring
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fill();

  // Color ring
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2);
  ctx.fill();

  // Dotted edge pattern
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = size / 2 + Math.cos(angle) * (size / 2 - 18);
    const y = size / 2 + Math.sin(angle) * (size / 2 - 18);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.fill();

  // Value text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), size / 2, size / 2);

  const texture = new CanvasTexture(canvas);
  return texture;
}

/**
 * Generate table felt texture
 */
export function generateTableTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base dark
  ctx.fillStyle = COLORS.tableDark;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle radial gradient
  const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 800);
  gradient.addColorStop(0, '#1a1f2e');
  gradient.addColorStop(1, COLORS.tableDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // Felt grain
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#0d1118' : '#151925';
    ctx.fillRect(
      Math.random() * 1024,
      Math.random() * 1024,
      2,
      2
    );
  }

  // Vignette
  const vignette = ctx.createRadialGradient(512, 512, 400, 512, 512, 700);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1024, 1024);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Draw geometric portrait for face cards
 */
function drawGeometricPortrait(ctx: CanvasRenderingContext2D, value: string, suit: string, x: number, y: number) {
  const suitColor = SUIT_COLORS[suit] || '#333333';
  const isRed = suitColor === '#ff4444';

  // Outer frame
  ctx.strokeStyle = suitColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 70, y - 100, 140, 200);

  // Geometric face representation
  ctx.fillStyle = isRed ? '#ffcccc' : '#cccccc';

  // Crown/head shape
  ctx.beginPath();
  ctx.moveTo(x, y - 60);
  ctx.lineTo(x - 30, y - 20);
  ctx.lineTo(x - 25, y + 20);
  ctx.lineTo(x, y + 40);
  ctx.lineTo(x + 25, y + 20);
  ctx.lineTo(x + 30, y - 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(x - 10, y - 10, 4, 0, Math.PI * 2);
  ctx.arc(x + 10, y - 10, 4, 0, Math.PI * 2);
  ctx.fill();

  // Value at bottom
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = suitColor;
  ctx.fillText(value, x, y + 75);
}

/**
 * Draw pips for number cards
 */
function drawNumberCardPips(ctx: CanvasRenderingContext2D, value: string, suit: string, color: string) {
  const suitChar = SUITS[suit as keyof typeof SUITS] || suit;
  const num = value === '10' ? 10 : parseInt(value);

  ctx.fillStyle = color;
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Standard pip arrangements
  const pipPositions: Record<number, Array<[number, number]>> = {
    2: [[0.5, 0.3], [0.5, 0.7]],
    3: [[0.5, 0.25], [0.5, 0.5], [0.5, 0.75]],
    4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
    5: [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
    6: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.5], [0.7, 0.5], [0.3, 0.75], [0.7, 0.75]],
    7: [[0.3, 0.25], [0.7, 0.25], [0.5, 0.4], [0.3, 0.55], [0.7, 0.55], [0.3, 0.75], [0.7, 0.75]],
    8: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.42], [0.7, 0.42], [0.3, 0.58], [0.7, 0.58], [0.3, 0.75], [0.7, 0.75]],
    9: [[0.3, 0.22], [0.7, 0.22], [0.3, 0.4], [0.7, 0.4], [0.5, 0.5], [0.3, 0.6], [0.7, 0.6], [0.3, 0.78], [0.7, 0.78]],
    10: [[0.3, 0.22], [0.7, 0.22], [0.5, 0.32], [0.3, 0.42], [0.7, 0.42], [0.3, 0.58], [0.7, 0.58], [0.5, 0.68], [0.3, 0.78], [0.7, 0.78]],
  };

  const positions = pipPositions[num] || [[0.5, 0.5]];

  positions.forEach(([px, py]) => {
    ctx.fillText(suitChar, CARD_WIDTH * px, CARD_HEIGHT * py);
  });
}

/**
 * Add noise overlay for realism
 */
function addNoiseOverlay(ctx: CanvasRenderingContext2D, intensity: number) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 255;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

// Import THREE for wrapping
import * as THREE from 'three';

// Pre-generate standard deck for performance
export function generateStandardDeck(): Array<{ value: string; suit: string; texture: CanvasTexture; backTexture: CanvasTexture }> {
  const deck = [];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const backTexture = generateCardBackTexture();

  for (const suit of suits) {
    for (const value of VALUES) {
      deck.push({
        value,
        suit,
        texture: generateCardFrontTexture(value, suit),
        backTexture,
      });
    }
  }

  return deck;
}

// Cache for textures
const textureCache = new Map<string, CanvasTexture>();

export function getCachedCardTexture(value: string, suit: string): CanvasTexture {
  const key = `${value}-${suit}`;
  if (!textureCache.has(key)) {
    textureCache.set(key, generateCardFrontTexture(value, suit));
  }
  return textureCache.get(key)!;
}

export function getCachedCardBack(): CanvasTexture {
  if (!textureCache.has('back')) {
    textureCache.set('back', generateCardBackTexture());
  }
  return textureCache.get('back')!;
}
