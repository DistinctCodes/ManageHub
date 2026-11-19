import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CreditsApiError,
  getCreditBalance,
  getCreditStatement,
} from "../credits-api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("credits-api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("throws a typed error with the API status, code, and request ID", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, {
        statusCode: 403,
        code: "CREDIT_ACCESS_DENIED",
        message: "Credit access denied",
        requestId: "request-123",
      }),
    );

    let caught: unknown;
    try {
      await getCreditBalance();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CreditsApiError);
    expect(caught).toMatchObject({
      message: "Credit access denied",
      status: 403,
      statusCode: 403,
      code: "CREDIT_ACCESS_DENIED",
      requestId: "request-123",
    });
  });

  it("uses a typed fallback error when the response is not JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Bad gateway</html>", { status: 502 }),
    );

    let caught: unknown;
    try {
      await getCreditStatement(2, 10);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CreditsApiError);
    expect(caught).toMatchObject({
      message: "Request failed (502)",
      statusCode: 502,
      code: null,
      requestId: null,
      responseBody: null,
    });
  });

  it("passes the selected currency to balance and statement queries", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { entries: [], total: 0, page: 1, pageSize: 20 }),
    );

    await getCreditBalance("eur");
    await getCreditStatement(1, 20, "eur");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/credits/balance?currency=EUR");
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/credits/statement?page=1&pageSize=20&currency=EUR",
    );
  });

  it("normalizes a plain statement array into a page", async () => {
    const entry = {
      id: "entry-1",
      transactionId: "txn-1",
      direction: "CREDIT",
      amount: 500,
      currency: "USD",
      description: null,
      kind: "ADJUSTMENT",
      reference: "ref-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchMock.mockResolvedValue(jsonResponse(200, [entry]));

    await expect(getCreditStatement(1, 20)).resolves.toEqual({
      entries: [entry],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it("preserves the statement query parameters", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { entries: [], total: 0, page: 2, pageSize: 10 }),
    );

    await getCreditStatement(2, 10);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/credits/statement?page=2&pageSize=10");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });
});
