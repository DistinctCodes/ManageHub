import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { securityHeaders } from "./lib/csp";

const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? bundleAnalyzer({ enabled: true })
    : (config: NextConfig) => config;

const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  // Baseline Content-Security-Policy and related hardening headers on every
  // route (issue #1868). See lib/csp.ts for how the policy is built.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  async rewrites() {
    if (!apiProxyTarget) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiProxyTarget}/socket.io/:path*`,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
