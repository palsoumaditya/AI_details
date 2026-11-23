import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load root monorepo environment variables
const projectDir = process.cwd();
loadEnvConfig(path.resolve(projectDir, ".."));
loadEnvConfig(projectDir);

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return [];
    }

    const cleanBackendUrl = backendUrl.trim().replace(/\/$/, "");

    return {
      beforeFiles: [
        {
          source: "/api/v1/:path*",
          destination: `${cleanBackendUrl}/api/v1/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
