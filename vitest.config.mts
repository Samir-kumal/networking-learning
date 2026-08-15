import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    // Git worktrees (.worktrees/<name>/) each have their own independent
    // node_modules with a separate React copy. Without this exclude, running
    // `npm test` from the repo root also picks up any worktree's test files
    // and runs them against a mismatched React/react-dom pair ("Invalid hook
    // call"), since Vitest's default excludes only cover node_modules itself.
    exclude: ["**/node_modules/**", "**/.worktrees/**", "**/dist/**", "**/.next/**"],
    // The CI deploy runner is memory-constrained and shares the box with the
    // subsequent `docker compose up --build` deploy step. Vitest's default
    // forks pool spawns one worker per core, which has twice caused the
    // runner to OOM-kill a worker mid-suite (exit 137 / "Worker exited
    // unexpectedly") even though the full suite passes locally. Cap
    // parallelism instead of trusting default core-count sizing.
    pool: "forks",
    maxWorkers: 2,
  },
});
