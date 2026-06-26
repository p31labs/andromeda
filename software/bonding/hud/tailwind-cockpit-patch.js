/**
 * WCD-08 Phase A: Tailwind Config Patch
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Sonnet: MERGE these additions into the existing tailwind.config.js.
 * Do NOT replace the entire config. Add to theme.extend.
 */

// Add to theme.extend.colors:
const colors = {
  void: '#050505',
<<<<<<< HEAD
  phosphor: '#00FF88',
=======
  phosphor: 'var(--color-phosphor)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  amber: '#FFD700',
  cyan: '#06B6D4',
};

// Add to theme.extend.fontFamily:
const fontFamily = {
  mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
};

// Add to theme.extend.keyframes:
const keyframes = {
  'toast-slide': {
    '0%':   { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
    '10%':  { transform: 'translateY(0) scale(1)', opacity: '1' },
    '85%':  { transform: 'translateY(0) scale(1)', opacity: '1' },
    '100%': { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
  },
};

// Add to theme.extend.animation:
const animation = {
  'toast-slide': 'toast-slide 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
};

/**
 * Example merged config:
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * export default {
 *   content: ['./src/** /*.{ts,tsx}'],
 *   theme: {
 *     extend: {
 *       colors: {
 *         ...existingColors,
 *         void: '#050505',
<<<<<<< HEAD
 *         phosphor: '#00FF88',
=======
 *         phosphor: 'var(--color-phosphor)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 *         amber: '#FFD700',
 *         cyan: '#06B6D4',
 *       },
 *       fontFamily: {
 *         mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
 *         sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
 *       },
 *       keyframes: {
 *         'toast-slide': { ... },
 *       },
 *       animation: {
 *         'toast-slide': 'toast-slide 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
 *       },
 *     },
 *   },
 *   plugins: [],
 * };
 */
