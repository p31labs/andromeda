/** @type {import(\'tailwindcss\').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        phos: "#39ff14",     // Dust color / WJ
        cyan: "#00f5ff",     // Heavy bodies / SJ
        orchid: "#da70d6",   // Collision / Fusion events
        void: "#05050A"      // Deep space
      }
    },
  },
  plugins: [],
}
