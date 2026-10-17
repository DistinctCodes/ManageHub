import { describe, expect, it } from "vitest";

import { isAuthError } from "../providers/providers";

// Rendering is deliberately skipped: Providers owns a QueryClientProvider, and
// these checks only cover the exported isAuthError helper.
describe("isAuthError", () => {
  it("detects a 401 status", () => {
    const error = Object.assign(new Error("Request failed"), {
      status: 401,
    });
    expect(isAuthError(error)).toBe(true);
  });

  it("detects a 403 status", () => {
    const error = Object.assign(new Error("Forbidden"), { status: 403 });
    expect(isAuthError(error)).toBe(true);
  });

  it("matches auth-related error messages", () => {
    expect(isAuthError(new Error("Unauthorized"))).toBe(true);
    expect(isAuthError(new Error("Access forbidden for this resource"))).toBe(
      true,
    );
  });

  it("returns false for ordinary errors", () => {
    expect(isAuthError(new Error("Network offline"))).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError("401")).toBe(false);
  });
});
