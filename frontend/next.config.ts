import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? bundleAnalyzer({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withBundleAnalyzer(nextConfig);
