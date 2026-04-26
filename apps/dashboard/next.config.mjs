import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@codex-tv/shared"],
  experimental: {
    optimizePackageImports: ["@codex-tv/shared"]
  }
};

export default nextConfig;
