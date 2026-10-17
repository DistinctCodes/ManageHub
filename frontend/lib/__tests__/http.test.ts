import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { ApiError, request } from "../http";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Lets the pending fetch promise settle before the fake timers advance, so
// the retry's setTimeout(250) is actually scheduled when we jump forward.
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("lib/http request", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_API_URL = "https://api.test";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = undefined;
  });

  it("prefixes the configured base URL and attaches auth headers when an access token is passed", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await request("/payments", {
      service: "payments",
      accessToken: "access-token",
      idempotencyKey: "idempotency-key",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.test/payments");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
      "Idempotency-Key": "idempotency-key",
    });
  });

  it("omits Authorization without an accessToken and sends cookies cross-origin", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await request("/wallets/me", { service: "wallet" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.test/wallets/me");
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("serializes the JSON body on mutations", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await request("/payments/initiate", {
      service: "payments",
      method: "POST",
      body: { bookingId: "booking-1", amount: 100 },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ bookingId: "booking-1", amount: 100 }),
    });
  });

  it("throws a typed ApiError carrying status, code, and the body message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(403, {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Credit access denied",
      }),
    );

    let caught: unknown;
    try {
      await request("/credits/balance", {
        service: "credits",
        report: false,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({
      name: "ApiError",
      status: 403,
      code: "FORBIDDEN",
      message: "Credit access denied",
    });
  });

  it("joins the entries of a message array", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: ["First problem", "Second problem"] }),
    );

    await expect(
      request("/credits/statement", { service: "credits", report: false }),
    ).rejects.toThrow("First problem Second problem");
  });

  it("uses the fallback message hook when the body has no message", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { code: "NO_MESSAGE" }));

    await expect(
      request("/auth/login", {
        service: "auth",
        report: false,
        fallbackMessage: (status) =>
          status === 401
            ? "Invalid credentials"
            : `Authentication failed (${status})`,
      }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("falls back to the generic request-failed message", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { code: "X" }));

    await expect(
      request("/payments", { service: "payments", report: false }),
    ).rejects.toThrow("Request failed (500)");
  });

  it("delegates the typed error to makeError and still reports by default", async () => {
    const sentinel = new Error("typed error");
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "Denied" }));

    let caught: unknown;
    try {
      await request("/credits/balance", {
        service: "credits",
        makeError: () => sentinel,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(sentinel);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [, context] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(context).toMatchObject({
      tags: { api: "credits", statusCode: "403" },
    });
  });

  it("reports api failures by default with the service, path, and status", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { message: "Wallet not found" }),
    );

    await expect(
      request("/wallets/me", { service: "wallet" }),
    ).rejects.toThrow("Wallet not found");

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("skips reporting when report is false", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { message: "Wallet not found" }),
    );

    await expect(
      request("/wallets/me", { service: "wallet", report: false }),
    ).rejects.toThrow("Wallet not found");

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("returns undefined for a 204 response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      request("/credits/admin/splits/1/active", { service: "admin" }),
    ).resolves.toBeUndefined();
  });

  it("retries a retriable idempotent GET once after a network failure", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const resultPromise = request("/payments", {
      service: "payments",
      retriable: true,
    });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("retries a retriable idempotent GET once on a transient status", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { message: "Unavailable" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const resultPromise = request("/payments", {
      service: "payments",
      retriable: true,
    });
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("does not retry a retriable POST", async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));

    await expect(
      request("/payments/initiate", {
        service: "payments",
        method: "POST",
        body: { bookingId: "booking-1" },
        retriable: true,
      }),
    ).rejects.toThrow("Network unavailable");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("does not retry without the retriable option", async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));

    await expect(
      request("/payments", { service: "payments" }),
    ).rejects.toThrow("Network unavailable");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);
});
