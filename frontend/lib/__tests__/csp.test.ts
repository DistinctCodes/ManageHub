import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, securityHeaders, toOrigin } from "../csp";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );
}

describe("toOrigin", () => {
  it("reduces a URL to its origin", () => {
    expect(toOrigin("https://api.example.com/v1/")).toBe(
      "https://api.example.com",
    );
    expect(toOrigin("https://key@o1.ingest.sentry.io/42")).toBe(
      "https://o1.ingest.sentry.io",
    );
  });

  it("returns null for empty, malformed or non-http values", () => {
    expect(toOrigin(undefined)).toBeNull();
    expect(toOrigin("  ")).toBeNull();
    expect(toOrigin("not a url")).toBeNull();
    expect(toOrigin("javascript:alert(1)")).toBeNull();
  });
});

describe("buildContentSecurityPolicy", () => {
  it("builds a locked-down production policy", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "https://api.managehub.app/v1",
        NEXT_PUBLIC_SENTRY_DSN: "https://abc@o123.ingest.sentry.io/456",
      }),
    );

    expect(policy.get("default-src")).toEqual(["'self'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("base-uri")).toEqual(["'self'"]);
    expect(policy.get("script-src")).not.toContain("'unsafe-eval'");
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "https://api.managehub.app",
      "https://o123.ingest.sentry.io",
    ]);
    expect(policy.has("upgrade-insecure-requests")).toBe(true);
  });

  it("omits unset origins instead of emitting empty sources", () => {
    const policy = directives(
      buildContentSecurityPolicy({ NODE_ENV: "production" }),
    );
    expect(policy.get("connect-src")).toEqual(["'self'"]);
  });

  it("relaxes only what the dev server needs in development", () => {
    const policy = directives(
      buildContentSecurityPolicy({ NODE_ENV: "development" }),
    );
    expect(policy.get("script-src")).toContain("'unsafe-eval'");
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "http://localhost:6000",
      "ws:",
      "wss:",
    ]);
    expect(policy.has("upgrade-insecure-requests")).toBe(false);
  });
});

describe("securityHeaders", () => {
  it("includes the CSP alongside the baseline hardening headers", () => {
    const keys = securityHeaders({ NODE_ENV: "production" }).map((h) => h.key);
    expect(keys).toEqual([
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
    ]);
  });
});
