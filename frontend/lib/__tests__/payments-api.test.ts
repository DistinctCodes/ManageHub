import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { getPayments, initiatePayment } from "../payments-api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("payments-api retries", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("retries an idempotent GET once after a network failure", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce(jsonResponse(200, []));

    const resultPromise = getPayments("access-token");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/payments");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    });
  });

  it("retries a transient server response for an idempotent GET", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { message: "Unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, []));

    const resultPromise = getPayments("access-token");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a payment mutation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));

    await expect(
      initiatePayment(
        "access-token",
        {
          bookingId: "booking-1",
          amount: 100,
          currency: "USD",
          rail: "FIAT",
        },
        "idempotency-key",
      ),
    ).rejects.toThrow("Network unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
