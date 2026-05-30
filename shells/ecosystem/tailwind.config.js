/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        p31: {
          void: '#0a0b0d',
          cloud: '#e8e8e8',
          muted: '#6b7280',
          teal: '#5DCAA5',
          cyan: '#00d4ff',
          purple: '#a78bfa',
          gold: '#fbbf24',
          red: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Atkinson Hyperlegible', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
