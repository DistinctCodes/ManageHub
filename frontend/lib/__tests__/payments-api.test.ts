import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { getPaymentsPage, initiatePayment } from "../payments-api";

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
      .mockResolvedValueOnce(jsonResponse(200, { data: [], nextCursor: null }));

    const resultPromise = getPaymentsPage();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toEqual({
      data: [],
      nextCursor: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/payments/page");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it("retries a transient server response for an idempotent GET", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { message: "Unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [], nextCursor: null }));

    const resultPromise = getPaymentsPage();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toEqual({
      data: [],
      nextCursor: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("forwards cursor, limit, status and date filters to the paginated endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { data: [], nextCursor: null }),
    );

    await getPaymentsPage({
      cursor: "next-page",
      limit: 10,
      status: "CONFIRMED",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z",
    });

    const [url] = fetchMock.mock.calls[0];
    const params = new URLSearchParams(String(url).split("?")[1] ?? "");
    expect(Object.fromEntries(params.entries())).toEqual({
      cursor: "next-page",
      limit: "10",
      status: "CONFIRMED",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z",
    });
  });

  it("does not retry a payment mutation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));

    await expect(
      initiatePayment(
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
