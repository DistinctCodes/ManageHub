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
      await getCreditBalance("access-token");
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
      await getCreditStatement("access-token", 2, 10);
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

  it("preserves the access token and statement query parameters", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { entries: [], total: 0, page: 2, pageSize: 10 }),
    );

    await getCreditStatement("access-token", 2, 10);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/credits/statement?page=2&pageSize=10");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    });
  });
});
