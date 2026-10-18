import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import MetricsPage from "../page";

const mocks = vi.hoisted(() => ({ fetchPaymentMetrics: vi.fn() }));
vi.mock("@/lib/payment-metrics", () => ({ fetchPaymentMetrics: mocks.fetchPaymentMetrics, PAYMENT_METRICS_REFETCH_INTERVAL: 30_000 }));
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MetricsPage /></QueryClientProvider>);
}
const metrics = { totalVolume: 1234, successfulTransactions: 8, failedTransactions: 2, dailyRevenue: [], statusDistribution: [] };
describe("Payment metrics page", () => {
  it("shows a loading indicator", () => { mocks.fetchPaymentMetrics.mockReturnValue(new Promise(() => {})); renderPage(); expect(document.querySelector(".animate-spin")).toBeInTheDocument(); });
  it("shows a request error", async () => { mocks.fetchPaymentMetrics.mockRejectedValue(new Error("Metrics unavailable")); renderPage(); expect(await screen.findByRole("alert")).toHaveTextContent("Metrics unavailable"); });
  it("renders summary metrics", async () => { mocks.fetchPaymentMetrics.mockResolvedValue(metrics); renderPage(); expect(await screen.findByText("Payment Metrics Dashboard")).toBeInTheDocument(); expect(screen.getByText("$1,234")).toBeInTheDocument(); });
});
