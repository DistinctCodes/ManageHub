import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import {
  getWalletStatus,
  provisionCustodialWallet,
  requestLinkChallenge,
  verifyLinkChallenge,
} from "../wallet-api";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(status: number, body: string): Response {
  return new Response(body, { status });
}

describe("wallet-api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("getWalletStatus", () => {
    it("GETs /wallets/me and returns the parsed body on success", async () => {
      const body = {
        provisioned: true,
        walletAddress: "GADDR",
        custodyType: "CUSTODIAL" as const,
        status: "ACTIVE" as const,
        balance: 500,
        currency: "USD",
      };
      fetchMock.mockResolvedValue(jsonResponse(200, body));

      const result = await getWalletStatus();

      expect(result).toEqual(body);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("/wallets/me");
      expect(init).toMatchObject({ credentials: "same-origin" });
      expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    });
  });

  describe("provisionCustodialWallet", () => {
    it("POSTs to /wallets/provision", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          provisioned: true,
          walletAddress: "GADDR",
          custodyType: "CUSTODIAL",
          status: "ACTIVE",
          balance: 0,
          currency: "USD",
        }),
      );

      await provisionCustodialWallet();

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("/wallets/provision");
      expect(init).toMatchObject({ method: "POST" });
    });
  });

  describe("requestLinkChallenge", () => {
    it("POSTs to /wallets/link/challenge and returns the nonce", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { nonce: "n-1", expiresAt: "2099-01-01T00:00:00Z" }),
      );

      const result = await requestLinkChallenge();

      expect(result).toEqual({ nonce: "n-1", expiresAt: "2099-01-01T00:00:00Z" });
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("/wallets/link/challenge");
      expect(init).toMatchObject({ method: "POST" });
    });
  });

  describe("verifyLinkChallenge", () => {
    it("POSTs the nonce/address/signature as the JSON body", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          provisioned: true,
          walletAddress: "GADDR",
          custodyType: "EXTERNAL",
          status: "ACTIVE",
          balance: 0,
          currency: "USD",
        }),
      );

      await verifyLinkChallenge({
        nonce: "n-1",
        address: "GADDR",
        signature: "sig",
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("/wallets/link/verify");
      expect(init).toMatchObject({ method: "POST" });
      expect(JSON.parse(init.body as string)).toEqual({
        nonce: "n-1",
        address: "GADDR",
        signature: "sig",
      });
    });
  });

  describe("error path (walletFetch's non-ok branch)", () => {
    it("throws with the server's error message from a JSON error body", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(404, { message: "Wallet not found" }),
      );

      await expect(getWalletStatus()).rejects.toThrow("Wallet not found");
    });

    it("falls back to a generic message when the error body is not JSON", async () => {
      fetchMock.mockResolvedValue(textResponse(500, "<html>Internal Server Error</html>"));

      await expect(getWalletStatus()).rejects.toThrow("Wallet request failed (500)");
    });

    it("falls back to a generic message when the JSON error body has no message field", async () => {
      fetchMock.mockResolvedValue(jsonResponse(503, { code: "UNAVAILABLE" }));

      await expect(getWalletStatus()).rejects.toThrow("Wallet request failed (503)");
    });

    it("reports the failure to Sentry with the endpoint and status code tagged", async () => {
      fetchMock.mockResolvedValue(jsonResponse(404, { message: "Wallet not found" }));

      await expect(getWalletStatus()).rejects.toThrow();

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      const [error, context] = vi.mocked(Sentry.captureException).mock.calls[0];
      expect((error as Error).message).toBe("Wallet not found");
      expect(context).toMatchObject({
        tags: { api: "wallet", endpoint: "/wallets/me", statusCode: 404 },
      });
    });

    it("does not resolve — the non-ok response never reaches the caller as data", async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { message: "Bad request" }));

      await expect(getWalletStatus()).rejects.toBeInstanceOf(Error);
    });
  });
});
