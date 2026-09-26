#!/usr/bin/env node
/**
 * Deploy guard for Cloudflare Workers Builds / local wrangler.
 *
 *   main  → wrangler deploy           (production Worker `bot-my-meals`)
 *   other → wrangler versions upload  (preview URL; never promote)
 *
 * Cloudflare Workers Builds injects WORKERS_CI_BRANCH. GitHub Actions
 * injects GITHUB_REF_NAME. Local runs default to the current git branch.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function wranglerCommand(branch) {
  if (branch === "main") {
    return { args: ["deploy"], mode: "production" };
  }
  return { args: ["versions", "upload"], mode: "preview" };
}

export function detectBranch(env = process.env) {
  if (env.WORKERS_CI_BRANCH) return env.WORKERS_CI_BRANCH.trim();
  if (env.GITHUB_REF_NAME) return env.GITHUB_REF_NAME.trim();
  if (env.CF_PAGES_BRANCH) return env.CF_PAGES_BRANCH.trim();

  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

export function main() {
  const branch = detectBranch();

  if (!branch) {
    console.error(
      "[cf-deploy] Could not detect git branch. Refusing to deploy to production.",
    );
    console.error(
      "[cf-deploy] Set WORKERS_CI_BRANCH=main (or run from the main branch) to deploy live.",
    );
    process.exit(1);
  }

  const { args: wranglerArgs, mode } = wranglerCommand(branch);

  console.log(`[cf-deploy] branch=${branch} mode=${mode}`);
  console.log(`[cf-deploy] running: npx wrangler ${wranglerArgs.join(" ")}`);

  const result = spawnSync("npx", ["wrangler", ...wranglerArgs], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
