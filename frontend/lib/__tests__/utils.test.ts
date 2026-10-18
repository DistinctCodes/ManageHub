import { describe, expect, it } from "vitest";

import { formatCurrency, fromMinorUnits, minorUnitDecimals } from "../utils";

describe("formatCurrency", () => {
  it("formats a value using the requested locale", () => {
    expect(formatCurrency(1234.5, "EUR", "de-DE")).toBe(
      new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(1234.5),
    );
  });

  it("uses the runtime locale when no locale is provided", () => {
    expect(formatCurrency(12.5, "USD")).toBe(
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      }).format(12.5),
    );
  });
});

describe("minorUnitDecimals", () => {
  it("treats currency codes case-insensitively", () => {
    expect(minorUnitDecimals("jpy")).toBe(0);
    expect(minorUnitDecimals("bhd")).toBe(3);
  });

  it("falls back to 2 decimals for an unknown currency", () => {
    expect(minorUnitDecimals("ZZZ")).toBe(2);
  });

  it("falls back to 2 decimals for an invalid code", () => {
    expect(minorUnitDecimals("")).toBe(2);
  });
});

describe("fromMinorUnits", () => {
  it("converts a zero-decimal currency without dividing", () => {
    // With an exponent of 0 there is nothing to divide: 1000 minor units of
    // JPY are 1000 yen (the issue text's "=== 10" would imply a /100, which
    // contradicts the zero-decimal table and the JPY formatBalance contract).
    expect(fromMinorUnits(1000, "JPY")).toBe(1000);
  });

  it("converts a two-decimal currency (cents)", () => {
    expect(fromMinorUnits(1257, "USD")).toBe(12.57);
  });

  it("converts a seven-decimal Stellar asset (stroops)", () => {
    expect(fromMinorUnits(1234567, "XLM")).toBeCloseTo(0.1234567, 10);
  });

  it("uses the listed exponent with three-decimal currencies", () => {
    expect(fromMinorUnits(1234, "BHD")).toBeCloseTo(1.234, 10);
  });

  it("falls back to 2 decimals for an unknown currency", () => {
    expect(fromMinorUnits(1250, "ZZZ")).toBeCloseTo(12.5, 10);
  });

  it("maps non-finite input to 0", () => {
    expect(fromMinorUnits(Number.NaN, "USD")).toBe(0);
    expect(fromMinorUnits(Number.POSITIVE_INFINITY, "USD")).toBe(0);
  });

  it("stays consistent with formatCurrency for a zero-decimal currency", () => {
    const formatted = formatCurrency(
      fromMinorUnits(10, "JPY"),
      "JPY",
    );
    expect(formatted).toContain("10");
  });
});
