import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(
    "paymentId=pay_123&status=cancelled&error=user_cancelled",
  ),
  push: vi.fn(),
  verifyPaymentReturn: vi.fn(),
  getPayment: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/lib/stores/session-store", () => ({
  useSessionStore: (selector: (state: { accessToken: string }) => unknown) =>
    selector({ accessToken: "token" }),
}));

vi.mock("@/lib/payments-api", () => ({
  verifyPaymentReturn: mocks.verifyPaymentReturn,
  getPayment: mocks.getPayment,
}));

import PaymentReturnPage from "@/app/payments/return/page";

describe("PaymentReturnPage provider errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the provider error and does not start verification", () => {
    render(<PaymentReturnPage />);

    expect(
      screen.getByRole("heading", { name: "Payment could not be completed" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The payment was cancelled. No payment was completed.",
    );
    expect(mocks.verifyPaymentReturn).not.toHaveBeenCalled();
    expect(mocks.getPayment).not.toHaveBeenCalled();
  });
});
