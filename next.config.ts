import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: [] },
  // Sandbox preview is served through a proxied *.e2b.app host.
  allowedDevOrigins: ["*.e2b.app"],
};

export default config;
