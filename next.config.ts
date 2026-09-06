import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // Standalone output is for the self-hosted Docker runner; on Vercel it causes .nft.json ENOENT tracing failures.
  output: isVercel ? undefined : "standalone",
  allowedDevOrigins: ["127.0.0.1", "*.ngrok-free.app"],
  // Native/dynamic-require modules used by the ML Foundations Lab DB layer must
  // stay outside the Server Components bundle so `next build`'s file tracer picks
  // up their native addons for the standalone Docker output.
  serverExternalPackages: ["better-sqlite3", "pg"],
};

export default nextConfig;
