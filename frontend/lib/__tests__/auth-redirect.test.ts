import { describe, expect, it } from "vitest";
import {
  buildReturnTo,
  defaultLandingRoute,
  getSafeReturnTo,
} from "../auth-redirect";

describe("auth redirects", () => {
  it("builds a return path with the current query string", () => {
    expect(buildReturnTo("/admin/accounts", "tab=frozen&page=2")).toBe(
      "/admin/accounts?tab=frozen&page=2",
    );
  });

  it("uses /admin as the fallback landing route for admins", () => {
    expect(defaultLandingRoute("admin")).toBe("/admin");
    expect(defaultLandingRoute("user")).toBe("/wallet");
    expect(getSafeReturnTo(null, defaultLandingRoute("admin"))).toBe("/admin");
    expect(getSafeReturnTo(null, undefined, "admin")).toBe("/admin");
  });

  it("preserves safe internal paths", () => {
    expect(getSafeReturnTo("/admin/accounts?tab=frozen#row-1")).toBe(
      "/admin/accounts?tab=frozen#row-1",
    );
  });

  it("rejects external and auth-route destinations", () => {
    expect(getSafeReturnTo("https://example.com/admin")).toBe("/wallet");
    expect(getSafeReturnTo("//example.com/admin")).toBe("/wallet");
    expect(getSafeReturnTo("/login?returnTo=/admin")).toBe("/wallet");
    expect(getSafeReturnTo("/\\example.com/admin")).toBe("/wallet");
  });
});
