import { afterEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
}));

vi.mock("@sentry/nextjs", () => sentryMocks);

import {
  defaultTracesSampleRate,
  describeException,
  getSampleRate,
} from "../../sentry.client.config";

describe("getSampleRate", () => {
  it("uses a configured rate within the valid range", () => {
    expect(getSampleRate("0.25", 0.1)).toBe(0.25);
  });

  it("uses the fallback when the value is missing or invalid", () => {
    expect(getSampleRate(undefined, 0.1)).toBe(0.1);
    expect(getSampleRate("not-a-number", 0.1)).toBe(0.1);
    expect(getSampleRate("-0.1", 0.1)).toBe(0.1);
    expect(getSampleRate("1.1", 0.1)).toBe(0.1);
  });
});

describe("defaultTracesSampleRate (issue #1987)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("samples 100 percent in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(defaultTracesSampleRate()).toBe(1.0);
  });

  it("samples at a production-safe 10 percent by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(defaultTracesSampleRate()).toBe(0.1);
  });
});

describe("describeException (issue #1987)", () => {
  it("passes real Errors through with their identity", () => {
    const error = new RangeError("boom");
    expect(describeException(error)).toMatchObject({
      name: "RangeError",
      message: "boom",
    });
    expect(describeException(error).stack).toContain("RangeError: boom");
  });

  it("labels thrown strings as NonError instead of crashing", () => {
    expect(describeException("plain string failure")).toEqual({
      name: "NonError",
      message: "plain string failure",
    });
  });

  it("handles undefined and null rejections without throwing", () => {
    expect(describeException(undefined)).toEqual({
      name: "NonError",
      message: JSON.stringify(undefined) ?? "",
    });
    expect(describeException(null).name).toBe("NonError");
  });

  it("stringifies plain objects and never throws on circular ones", () => {
    expect(
      describeException({ reason: "websocket closed" }),
    ).toMatchObject({
      name: "NonError",
      message: JSON.stringify({ reason: "websocket closed" }),
    });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeException(circular)).toEqual({
      name: "NonError",
      message: String(circular),
    });
  });
});
