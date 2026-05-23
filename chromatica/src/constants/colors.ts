/**
 * Color Constants
 * Arthritis-optimized color palette
 */

// Primary brand colors
export const BRAND_COLORS = {
  primary: '#5DCAA5',
  secondary: '#6B8DD6',
  accent: '#FFD93D',
  danger: '#dc2626',
  success: '#5DCAA5',
  warning: '#FFD93D',
  info: '#6B8DD6'
} as const;

// Accessibility-optimized grays (high contrast)
export const GRAYSCALE = {
  50: '#F8F9FA',
  100: '#F1F3F5',
  200: '#E9ECEF',
  300: '#DEE2E6',
  400: '#CED4DA',
  500: '#ADB5BD',
  600: '#868E96',
  700: '#495057',
  800: '#343A40',
  900: '#212529'
} as const;

// Arthritis-friendly creative colors (soothing, low eye strain)
export const CREATIVE_PALETTE = [
  { hex: '#FF6B6B', name: 'Coral', category: 'warm' },
  { hex: '#4ECDC4', name: 'Turquoise', category: 'cool' },
  { hex: '#45B7D1', name: 'Sky Blue', category: 'cool' },
  { hex: '#96CEB4', name: 'Sage', category: 'nature' },
  { hex: '#FFEAA7', name: 'Butter', category: 'warm' },
  { hex: '#DDA0DD', name: 'Plum', category: 'cool' },
  { hex: '#98D8C8', name: 'Mint', category: 'nature' },
  { hex: '#F7DC6F', name: 'Honey', category: 'warm' },
  { hex: '#BB8FCE', name: 'Lavender', category: 'cool' },
  { hex: '#85C1E9', name: 'Periwinkle', category: 'cool' },
  { hex: '#F8B500', name: 'Marigold', category: 'warm' },
  { hex: '#82E0AA', name: 'Celadon', category: 'nature' },
  { hex: '#F1948A', name: 'Salmon', category: 'warm' },
  { hex: '#D5A6BD', name: 'Rose', category: 'warm' },
  { hex: '#AED6F1', name: 'Powder Blue', category: 'cool' }
];

// Contrast ratios (minimum 18:1 for accessibility)
export const CONTRAST_RATIOS = {
  textOnLight: 18,
  textOnDark: 18,
  uiElements: 12
} as const;

// High contrast mode colors
export const HIGH_CONTRAST = {
  background: '#000000',
  foreground: '#FFFFFF',
  primary: '#00FF00',
  secondary: '#00FFFF',
  accent: '#FFFF00',
  danger: '#FF0000'
} as const;

// Pain level colors (for pain log)
export const PAIN_LEVEL_COLORS = [
  '#5DCAA5', // 0 - No pain
  '#82E0AA', // 1
  '#82E0AA', // 2
  '#FFEAA7', // 3
  '#FFEAA7', // 4
  '#FFD93D', // 5
  '#F1948A', // 6
  '#F1948A', // 7
  '#cc6247', // 8
  '#cc6247', // 9
  '#dc2626'  // 10 - Extreme
];
