/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        p31: {
          void: '#0a0b0d',
          cloud: '#e8e8e8',
          teal: '#5DCAA5',
          cyan: '#00d4ff',
          purple: '#a78bfa',
          gold: '#ffd700',
          gray: {
            100: '#1a1a1a',
            200: '#2a2a2a',
            300: '#3a3a3a',
            400: '#6b7280',
            500: '#9ca3af'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
