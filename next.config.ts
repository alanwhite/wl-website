import type { NextConfig } from "next";
// Env validation runs at app startup via lib imports; removed from config
// to avoid module resolution issues during next build in Docker.

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
