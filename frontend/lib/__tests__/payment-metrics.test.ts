import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchPaymentMetrics,
  PAYMENT_METRICS_REFETCH_INTERVAL,
} from "../payment-metrics";

const metrics = {
  totalVolume: 1234.5,
  successfulTransactions: 42,
  failedTransactions: 3,
  dailyRevenue: [{ date: "2026-09-25", revenue: 987.5, volume: 20 }],
  statusDistribution: [{ status: "SUCCESS", count: 42 }],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("payment-metrics", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("configures a 30-second refresh interval", () => {
    expect(PAYMENT_METRICS_REFETCH_INTERVAL).toBe(30_000);
  });

  it("fetches payment metrics", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, metrics));
    const controller = new AbortController();

    await expect(fetchPaymentMetrics(controller.signal)).resolves.toEqual(metrics);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/payments/admin/metrics");
    expect(init).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
  });

  it("throws the server error message for an unsuccessful response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { message: "Metrics are temporarily unavailable" }));

    await expect(fetchPaymentMetrics()).rejects.toThrow("Metrics are temporarily unavailable");
  });
});
