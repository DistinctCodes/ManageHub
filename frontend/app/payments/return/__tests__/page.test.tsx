import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentReturnPage from "../page";
import { useSessionStore } from "@/lib/stores/session-store";

const mocks = vi.hoisted(() => ({ searchParams: new URLSearchParams("paymentId=pay-123"), push: vi.fn(), verify: vi.fn(), getPayment: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => mocks.searchParams }));
vi.mock("@/lib/stores/use-session-bootstrap", () => ({ useSessionBootstrap: () => {} }));
vi.mock("@/lib/payments-api", () => ({ verifyPaymentReturn: mocks.verify, getPayment: mocks.getPayment }));
const payment = { id: "pay-123", amount: 1250, currency: "USD", status: "CONFIRMED", provider: null, providerReference: null };

describe("PaymentReturnPage", () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams("paymentId=pay-123");
    mocks.verify.mockReset();
    mocks.getPayment.mockReset();
    useSessionStore.setState({ user: { id: "u1", email: "a@example.com", role: "user" }, accessToken: "token", status: "authenticated" }, false);
  });

  it("shows its fast-path loading state", () => {
    mocks.verify.mockReturnValue(new Promise(() => {}));
    render(<PaymentReturnPage />);
    expect(screen.getByText(/Contacting your payment provider/)).toBeInTheDocument();
  });

  it("renders a verified payment", async () => {
    mocks.verify.mockResolvedValue({ payment, verified: true });
    render(<PaymentReturnPage />);
    expect(await screen.findByText("Payment verified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View payment details" })).toHaveAttribute("href", "/payments/pay-123");
  });

  it("falls back to polling after verification fails and shows the terminal result", async () => {
    mocks.verify.mockRejectedValue(new Error("Webhook not ready"));
    mocks.getPayment.mockResolvedValue(payment);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PaymentReturnPage />);
    await waitFor(() => expect(mocks.getPayment).toHaveBeenCalledWith("pay-123"));
    expect(await screen.findByText("Payment verified")).toBeInTheDocument();
    warn.mockRestore();
  });
});
