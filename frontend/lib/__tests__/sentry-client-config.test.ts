import { describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
}));

vi.mock("@sentry/nextjs", () => sentryMocks);

import { getSampleRate } from "../../sentry.client.config";

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
