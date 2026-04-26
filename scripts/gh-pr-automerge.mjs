#!/usr/bin/env node
/**
 * Andromeda monorepo: push → open PR if needed → enable auto-merge.
 *   pnpm run gh:pr:automerge -- --base main --title "…" [--body "…"]
 * pnpm may pass a literal "--" — we strip it. Do not use --dir andromeda when cwd is
 * already the andromeda repo (that path is for P31 home only).
 *
 * If `unknown command "gitci" for "gh auth"` appears: your Git credential helper is wrong.
 *   git config --global credential.helper '!gh auth git-credential'   (note: git-credential, not gitci)
 * Dry run: P31_DRY_RUN=1 pnpm run gh:pr:automerge -- …
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureCleanCredential } from "./git-scrub-bad-gh-credential.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.join(__dirname, "..");

const argv = process.argv.slice(2).filter((x) => x !== "--");
const dry = process.env.P31_DRY_RUN === "1";
let base = "main";
let title = "";
let body = "";
let workdir = defaultRoot;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--base" && argv[i + 1]) {
    base = argv[++i];
  } else if (a === "--title" && argv[i + 1]) {
    title = argv[++i];
  } else if (a === "--body" && argv[i + 1]) {
    body = argv[++i];
  } else if (a === "--dir" && argv[i + 1]) {
    workdir = path.resolve(defaultRoot, argv[++i]);
  } else if (a === "--help" || a === "-h") {
    console.log("Usage: pnpm run gh:pr:automerge -- --base main --title '…' [--body '…'] [--dir <path-from-root>]");
    process.exit(0);
  }
}

function ghAuthed() {
  try {
    execSync("gh api user --jq .login", { stdio: "pipe", encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

function prNumberIfExists(cwd) {
  try {
    return execSync("gh pr view --json number -q .number", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function run() {
  ensureCleanCredential({ cwd: workdir });

  if (!ghAuthed()) {
    console.error("gh-pr-automerge: not logged in — run: gh auth login");
    process.exit(1);
  }

  const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: workdir, encoding: "utf8" }).trim();
  if (branch === "main" || branch === "master") {
    console.error("gh-pr-automerge: switch to a feature branch first (on " + branch + ")");
    process.exit(1);
  }

  if (!title) {
    title = execSync("git log -1 --pretty=%s", { cwd: workdir, encoding: "utf8" }).trim() || `PR: ${branch}`;
  }
  if (!body) {
    body = "Automated PR (pnpm run gh:pr:automerge).";
  }

  if (dry) {
    console.log(`[DRY] cd ${workdir} && git push -u origin ${branch}`);
    console.log("[DRY] gh pr view|create; gh pr merge --auto");
    return;
  }

  execSync(`git push -u origin ${branch}`, { cwd: workdir, stdio: "inherit" });

  let num = prNumberIfExists(workdir);
  if (num) {
    console.log(`gh-pr-automerge: found existing PR #${num} — skip create`);
  } else {
    const createOut = execSync(
      `gh pr create --base ${base} --head ${branch} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}`,
      { cwd: workdir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
    );
    if ((createOut + "").trim()) {
      console.log((createOut + "").trim());
    }
    num = prNumberIfExists(workdir) || "";
    if (!num) {
      console.error("gh-pr-automerge: could not get PR number after create");
      process.exit(1);
    }
  }

  execSync(`gh pr merge ${num} --auto --merge`, { cwd: workdir, stdio: "inherit" });
  console.log(`gh-pr-automerge: PR #${num} — auto-merge enabled (merge commit)`);
}

run();
