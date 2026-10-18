import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentDetailPage from "../page";
import { useSessionStore } from "@/lib/stores/session-store";

const mocks = vi.hoisted(() => ({ getPayment: vi.fn(), usePaymentStatus: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "pay-123" }) }));
vi.mock("@/lib/payments-api", () => ({ getPayment: mocks.getPayment }));
vi.mock("@/lib/use-payment-status", () => ({ usePaymentStatus: mocks.usePaymentStatus }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PaymentDetailPage /></QueryClientProvider>);
}
const payment = { id: "pay-123", bookingId: "booking-1", amount: 1250, currency: "USD", rail: "FIAT", status: "CONFIRMED", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", provider: null, providerReference: null, failureReason: null, manualReviewReason: null };

describe("PaymentDetailPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ user: { id: "u1", email: "a@example.com", role: "user" }, accessToken: "token", status: "authenticated" }, false);
    mocks.getPayment.mockReset();
  });
  afterEach(() => useSessionStore.setState({ user: null, accessToken: null, status: "unknown" }, false));

  it("shows loading while the payment is fetched", () => {
    mocks.getPayment.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading payment...")).toBeInTheDocument();
  });
  it("shows an API error", async () => {
    mocks.getPayment.mockRejectedValue(new Error("Payment not found"));
    renderPage();
    expect(await screen.findByText("Payment not found")).toBeInTheDocument();
  });
  it("renders payment details on success", async () => {
    mocks.getPayment.mockResolvedValue(payment);
    renderPage();
    expect(await screen.findByText("CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("booking-1")).toBeInTheDocument();
  });
});
