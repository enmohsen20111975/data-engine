import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Exclude mini-services from the build
  experimental: {
    outputFileTracingExcludes: {
      '*': ['mini-services/**/*', 'venv/**/*'],
    },
  },
};

export default nextConfig;
