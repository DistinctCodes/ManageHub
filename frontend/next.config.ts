import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { securityHeaders } from "./lib/csp";

const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? bundleAnalyzer({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  // Baseline Content-Security-Policy and related hardening headers on every
  // route (issue #1868). See lib/csp.ts for how the policy is built.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default withBundleAnalyzer(nextConfig);
