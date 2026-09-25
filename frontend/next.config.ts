import type { NextConfig } from "next";

const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? require("@next/bundle-analyzer")({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withBundleAnalyzer(nextConfig);
