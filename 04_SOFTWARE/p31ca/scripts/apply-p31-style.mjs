#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { buildStyleArtifacts } from "./lib/p31-style-generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tokenPath = path.join(root, "..", "design-tokens", "p31-universal-canon.json");
const pub = path.join(root, "public");

if (!fs.existsSync(tokenPath)) {
  console.error("apply-p31-style: missing", tokenPath);
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
const { css, js } = buildStyleArtifacts(doc);
fs.writeFileSync(path.join(pub, "p31-style.css"), css, "utf8");
fs.writeFileSync(path.join(pub, "p31-tailwind-extend.js"), js, "utf8");
console.log("apply-p31-style: wrote public/p31-style.css, public/p31-tailwind-extend.js");

execSync("node scripts/sync-tailwind-cdn-pages.mjs", { cwd: root, stdio: "inherit" });
