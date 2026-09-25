import { describe, expect, it } from "vitest";

import { getProviderReturnErrorMessage } from "../payment-return-errors";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("getProviderReturnErrorMessage", () => {
  it("returns null when the provider return has no error signal", () => {
    expect(getProviderReturnErrorMessage(params("paymentId=pay_123&status=confirmed"))).toBeNull();
  });

  it("uses and normalizes a provider error description", () => {
    expect(
      getProviderReturnErrorMessage(
        params("paymentId=pay_123&error=declined&error_description=Card%20was%20%20declined"),
      ),
    ).toBe("Card was declined");
  });

  it("recognizes cancelled status without an error description", () => {
    expect(getProviderReturnErrorMessage(params("status=CANCELLED"))).toBe(
      "The payment was cancelled. No payment was completed.",
    );
  });

  it("recognizes a cancelled boolean parameter", () => {
    expect(getProviderReturnErrorMessage(params("canceled=true"))).toBe(
      "The payment was cancelled. No payment was completed.",
    );
  });

  it("provides a safe fallback for a provider error code", () => {
    expect(getProviderReturnErrorMessage(params("error=provider_unavailable"))).toBe(
      "The payment provider reported an error (provider_unavailable). Please try again.",
    );
  });

  it("limits a provider-supplied description", () => {
    const message = getProviderReturnErrorMessage(
      params(`error_description=${"x".repeat(300)}`),
    );

    expect(message).toHaveLength(240);
    expect(message?.endsWith("…")).toBe(true);
  });
});
