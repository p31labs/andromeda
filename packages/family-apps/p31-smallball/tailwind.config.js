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
        dirt: "#c19a6b",
        grass: "#2d4c1e",
        bg: "#0a101a"
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
