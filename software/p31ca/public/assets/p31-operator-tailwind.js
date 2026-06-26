/**
 * P31 operator lane — Tailwind CDN preset for p31ca.org static HTML.
 * Matches Astro tailwind.config.mjs (Inter + Space Mono, void/phosphor).
 * Loaded after https://cdn.tailwindcss.com
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        void: '#050505',
        surface: '#161920',
<<<<<<< HEAD
        phosphor: '#00FF88',
        phosphorus: '#00FF88',
        coral: '#cc6247',
        amber: '#FFD700',
        teal: '#25897d',
        cyan: '#4db8a8',
        cloud: '#d8d6d0',
        butter: '#cda852',
        lavender: '#8b7cc9',
=======
        phosphor: 'var(--color-phosphor)',
        phosphorus: 'var(--color-phosphor)',
        coral: 'var(--color-coral)',
        amber: '#FFD700',
        teal: '#25897d',
        cyan: 'var(--color-cyan)',
        cloud: 'var(--color-cloud)',
        butter: 'var(--color-amber)',
        lavender: 'var(--color-lavender)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        paper: '#f4f4f5',
        ink: '#1e293b',
        glass: {
          border: 'rgba(255, 255, 255, 0.08)',
          surface: 'rgba(255, 255, 255, 0.04)',
        },
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
};
