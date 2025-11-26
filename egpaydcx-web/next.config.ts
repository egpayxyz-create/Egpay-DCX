import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Turbopack ko enable karne ke liye blank config
  turbopack: {},

  // Turbopack ko force use karne ke liye experimental flag
  experimental: {
    webpackBuildWorker: true,
  },
};

export default nextConfig;