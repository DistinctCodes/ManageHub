import { describe, expect, it } from "vitest";
import { buildReturnTo, getSafeReturnTo } from "../auth-redirect";

describe("auth redirects", () => {
  it("builds a return path with the current query string", () => {
    expect(buildReturnTo("/admin/accounts", "tab=frozen&page=2")).toBe(
      "/admin/accounts?tab=frozen&page=2",
    );
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
