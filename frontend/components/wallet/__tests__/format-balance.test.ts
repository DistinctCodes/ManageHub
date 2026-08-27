import { describe, expect, it } from "vitest";
import { formatBalance } from "../wallet-status-card";

describe("formatBalance", () => {
  it("formats a USD balance using 2-decimal minor units (cents)", () => {
    // 1234 cents => $12.34
    expect(formatBalance(1234, "USD")).toBe("12.34 USD credit");
  });

  it("formats an XLM balance using 7-decimal minor units (stroops)", () => {
    // 50_000_000 stroops => 5 XLM
    expect(formatBalance(50_000_000, "XLM")).toBe("5.00 XLM credit");
  });

  it("falls back to 2-decimal minor units for an unlisted currency", () => {
    expect(formatBalance(500, "EUR")).toBe("5.00 EUR credit");
  });

  it("handles a zero-decimal currency (e.g. JPY)", () => {
    expect(formatBalance(500, "JPY")).toBe("500.00 JPY credit");
  });
});
