import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure workspace packages are transpiled correctly
  transpilePackages: ["@oneatlas/backend", "@oneatlas/database", "@oneatlas/shared"],
};

export default nextConfig;
