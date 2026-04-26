/** @type {import('tailwindcss').Config} */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildAstroTailwindThemeExtend } from "./scripts/lib/p31-style-generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokenPath = path.join(__dirname, "..", "design-tokens", "p31-universal-canon.json");
const doc = JSON.parse(fs.readFileSync(tokenPath, "utf8"));

export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: buildAstroTailwindThemeExtend(doc),
  },
  plugins: [],
};
