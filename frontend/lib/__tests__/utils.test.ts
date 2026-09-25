import { describe, expect, it } from "vitest";

import { formatCurrency } from "../utils";

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
