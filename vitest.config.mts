import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      // Production imports the Workers-only D1 binding module; tests substitute a stub.
      "cloudflare:workers": path.resolve(rootDir, "src/lib/ml/db/cloudflare-workers.test-stub.ts"),
    },
  },
  test: {
    // Git worktrees (.worktrees/<name>/) each have their own independent
    // node_modules with a separate React copy. Without this exclude, running
    // `npm test` from the repo root also picks up any worktree's test files
    // and runs them against a mismatched React/react-dom pair ("Invalid hook
    // call"), since Vitest's default excludes only cover node_modules itself.
    exclude: ["**/node_modules/**", "**/.worktrees/**", "**/dist/**", "**/.next/**"],
  },
});
