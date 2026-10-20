import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionStore } from "../stores/session-store";

const toastMocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

/**
 * Issue #1977: any 401 from a protected endpoint must clear the session and
 * send the user to login. Every shared helper wires this centrally via
 * lib/session-expiry. Each case imports a FRESH module graph because the
 * expiry redirect flag lives at module level (parallel 401s coalesce into a
 * single redirect), which would otherwise mute later cases.
 */
const CASES: Array<{
  name: string;
  modulePath: string;
  update: (m: Record<string, unknown>) => Promise<unknown>;
}> = [
  {
    name: "wallet-api",
    modulePath: "../wallet-api",
    update: (m) => (m as { getWalletStatus(): Promise<unknown> }).getWalletStatus(),
  },
  {
    name: "credits-api",
    modulePath: "../credits-api",
    update: (m) => (m as { getCreditBalance(): Promise<unknown> }).getCreditBalance(),
  },
  {
    name: "admin-api queries",
    modulePath: "../admin-api",
    update: (m) => (m as { listAccounts(): Promise<unknown> }).listAccounts(),
  },
  {
    name: "admin-api mutations",
    modulePath: "../admin-api",
    update: (m) => (m as { listSplits(): Promise<unknown> }).listSplits(),
  },
  {
    name: "payments-api queries",
    modulePath: "../payments-api",
    update: (m) => (m as { getPayments(): Promise<unknown> }).getPayments(),
  },
  {
    name: "payments-api detail",
    modulePath: "../payments-api",
    update: (m) =>
      (m as { getPayment(id: string): Promise<unknown> }).getPayment("pay_1"),
  },
  {
    name: "payments-api usage",
    modulePath: "../payments-api",
    update: (m) => (m as { listMyUsage(): Promise<unknown> }).listMyUsage(),
  },
];

describe("401 reactions across shared helpers (issue #1977)", () => {
  const assignSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore
      .getState()
      .setSession({ id: "u1", email: "a@example.com", role: "admin" });
    // jsdom does not implement navigation: observe instead.
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        pathname: "/wallet",
        search: "",
        replace: assignSpy,
      },
    });
  });

  afterEach(() => {
    useSessionStore.getState().clearSession();
    vi.unstubAllGlobals();
  });

  for (const { name, modulePath, update } of CASES) {
    it(`${name} clears the session and redirects to login on 401`, async () => {
      vi.resetModules();
      const api = await import(modulePath);
      const { useSessionStore: freshStore } = await import(
        "../stores/session-store"
      );
      freshStore
        .getState()
        .setSession({ id: "u1", email: "a@example.com", role: "admin" });

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await expect(update(api)).rejects.toThrow();

      expect(toastMocks.error).toHaveBeenCalledWith(
        "Your session has expired. Please sign in again.",
      );
      expect(freshStore.getState().user).toBeNull();
      expect(freshStore.getState().status).toBe("unauthenticated");
      expect(assignSpy).toHaveBeenCalledTimes(1);
      expect(assignSpy).toHaveBeenCalledWith("/login?returnTo=%2Fwallet");
    });
  }

  it("does not react on non-401 errors", async () => {
    vi.resetModules();
    const { getWalletStatus } = await import("../wallet-api");
    const { useSessionStore: freshStore } = await import(
      "../stores/session-store"
    );
    freshStore
      .getState()
      .setSession({ id: "u1", email: "a@example.com", role: "admin" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Wallet not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(getWalletStatus()).rejects.toThrow("Wallet not found");

    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(freshStore.getState().user).not.toBeNull();
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
