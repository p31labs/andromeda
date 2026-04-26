#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildStyleArtifacts } from "./lib/p31-style-generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tokenPath = path.join(root, "..", "design-tokens", "p31-universal-canon.json");
const cssPath = path.join(root, "public", "p31-style.css");
const jsPath = path.join(root, "public", "p31-tailwind-extend.js");

if (!fs.existsSync(tokenPath)) {
  console.error("verify-p31-style: missing tokens", tokenPath);
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
const { css, js } = buildStyleArtifacts(doc);

let failed = 0;
if (!fs.existsSync(cssPath) || fs.readFileSync(cssPath, "utf8") !== css) {
  console.error("verify-p31-style: public/p31-style.css out of sync — run npm run apply:p31-style");
  failed = 1;
}
if (!fs.existsSync(jsPath) || fs.readFileSync(jsPath, "utf8") !== js) {
  console.error("verify-p31-style: public/p31-tailwind-extend.js out of sync — run npm run apply:p31-style");
  failed = 1;
}

if (!failed) console.log("verify-p31-style: OK");
process.exit(failed);
