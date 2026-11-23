import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load root monorepo environment variables
const projectDir = process.cwd();
loadEnvConfig(path.resolve(projectDir, ".."));
loadEnvConfig(projectDir);

const nextConfig: NextConfig = {};

export default nextConfig;
