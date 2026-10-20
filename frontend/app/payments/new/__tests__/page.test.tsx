import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewPaymentPage from "../page";

const mocks = vi.hoisted(() => ({
  initiatePayment: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  randomUUID: vi.fn(() => "idem-key-123"),
}));

vi.mock("@/lib/payments-api", () => ({ initiatePayment: mocks.initiatePayment }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

describe("NewPaymentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", { ...crypto, randomUUID: mocks.randomUUID });
  });

  it("renders the payment form", () => {
    render(<NewPaymentPage />);
    expect(screen.getByRole("heading", { name: "Initiate payment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Booking ID")).toBeInTheDocument();
  });

  it("shows the created payment on success and passes an idempotency key", async () => {
    mocks.initiatePayment.mockResolvedValue({ id: "pay-123" });
    render(<NewPaymentPage />);
    fireEvent.change(screen.getByLabelText("Booking ID"), { target: { value: "booking-1" } });
    fireEvent.change(screen.getByLabelText("Amount (minor units)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Initiate payment" }));

    await waitFor(() => expect(screen.getByText("pay-123")).toBeInTheDocument());
    expect(mocks.initiatePayment).toHaveBeenCalledWith(
      { bookingId: "booking-1", amount: 5000, currency: "USD", rail: "FIAT", provider: undefined },
      "idem-key-123",
    );
    expect(mocks.success).toHaveBeenCalledWith("Payment initiated");
  });

  it("disables the submit button while the request is pending", async () => {
    mocks.initiatePayment.mockReturnValue(new Promise(() => {}));
    render(<NewPaymentPage />);
    fireEvent.change(screen.getByLabelText("Booking ID"), { target: { value: "booking-1" } });
    fireEvent.change(screen.getByLabelText("Amount (minor units)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Initiate payment" }));
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
  });

  it("reports request errors", async () => {
    mocks.initiatePayment.mockRejectedValue(new Error("Payment service unavailable"));
    render(<NewPaymentPage />);
    fireEvent.change(screen.getByLabelText("Booking ID"), { target: { value: "booking-1" } });
    fireEvent.change(screen.getByLabelText("Amount (minor units)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Initiate payment" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Payment service unavailable"));
    expect(screen.queryByText(/Payment created:/)).not.toBeInTheDocument();
  });
});
