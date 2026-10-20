import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppBaseUrl, getApiBaseUrl } from "../env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiBaseUrl", () => {
  it("falls back to the backend's port 6100 in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(getApiBaseUrl()).toBe("http://localhost:6100");
  });

  it("honours an explicit value and strips the trailing slash", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.managehub.io/");

    expect(getApiBaseUrl()).toBe("https://api.managehub.io");
  });

  it("throws a descriptive error when unset in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(() => getApiBaseUrl()).toThrow(/NEXT_PUBLIC_API_URL is not configured/);
  });

  it("keeps the legacy relative base outside development and production", () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(getApiBaseUrl()).toBe("");
  });
});

describe("getAppBaseUrl", () => {
  it("falls back to https://managehub.app when unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppBaseUrl()).toBe("https://managehub.app");
  });

  it("honours an explicit value and strips the trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.managehub.app//");

    expect(getAppBaseUrl()).toBe("https://staging.managehub.app");
  });

  it("falls back instead of throwing on a malformed value", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");

    expect(getAppBaseUrl()).toBe("https://managehub.app");
  });
});
