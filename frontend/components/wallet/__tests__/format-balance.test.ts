import { describe, expect, it } from "vitest";
import { formatBalance } from "../wallet-status-card";

describe("formatBalance", () => {
  it("formats a USD balance using 2-decimal minor units (cents)", () => {
    expect(formatBalance(1234, "USD")).toBe("12.34 USD credit");
  });

  it("formats an XLM balance using 7-decimal minor units (stroops)", () => {
    expect(formatBalance(50_000_000, "XLM")).toBe("5.0000000 XLM credit");
  });

  it("renders a single stroop without dropping precision", () => {
    expect(formatBalance(1, "XLM")).toBe("0.0000001 XLM credit");
  });

  it("falls back to 2-decimal minor units for an unlisted currency", () => {
    expect(formatBalance(500, "EUR")).toBe("5.00 EUR credit");
  });

  it("handles a zero-decimal currency (e.g. JPY)", () => {
    expect(formatBalance(500, "JPY")).toBe("500 JPY credit");
  });

  it("prefers a server-provided exponent when present", () => {
    expect(formatBalance(1257, "USDC", 7)).toBe("0.0001257 USDC credit");
    expect(formatBalance(500, "JPY", 0)).toBe("500 JPY credit");
  });
});
