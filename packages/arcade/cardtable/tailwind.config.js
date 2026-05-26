/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        phos: "#39ff14",
        cyan: "#00f5ff",
        orchid: "#da70d6",
        gold: "#feca57",
        sentinel: "#54a0ff",
        tableDark: "#111522",
        bg: "#0a101a"
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
