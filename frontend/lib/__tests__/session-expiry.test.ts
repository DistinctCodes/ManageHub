import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import type { useSessionStore as SessionStore } from "../stores/session-store";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

/**
 * The expiry flag lives at module level (parallel 401s must coalesce), so each
 * test case imports a fresh instance of the module through vi.resetModules().
 */
async function loadExpiry() {
  return await import("../session-expiry");
}

describe("session expiry reactions (issue #1977)", () => {
  const assignSpy = vi.fn();
  let sessionStore: typeof SessionStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ useSessionStore: sessionStore } = await import("../stores/session-store"));
    sessionStore
      .getState()
      .setSession({ id: "u1", email: "a@example.com", role: "user" });
    assignSpy.mockClear();
    // jsdom does not implement navigation: observe it instead.
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        pathname: "/admin/accounts",
        search: "?tab=frozen",
        replace: assignSpy,
      },
    });
  });

  afterEach(() => {
    sessionStore.getState().clearSession();
  });

  it("clears the session, shows a toast and redirects to login once", async () => {
    const { expireSession } = await loadExpiry();

    expireSession();

    expect(sessionStore.getState().user).toBeNull();
    expect(sessionStore.getState().status).toBe("unauthenticated");
    expect(toast.error).toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
    );
    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith(
      "/login?returnTo=%2Fadmin%2Faccounts%3Ftab%3Dfrozen",
    );
  });

  it("coalesces parallel 401s into a single redirect (no loops)", async () => {
    const { expireSession } = await loadExpiry();

    expireSession();
    expireSession();
    expireSession();

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("does nothing extra when the user is already on an auth page", async () => {
    const { expireSession } = await loadExpiry();
    Object.assign(window.location, { pathname: "/login", search: "" });

    expireSession();

    expect(assignSpy).not.toHaveBeenCalled();
    // The stale session is still dropped so the login page shows logged-out UI.
    expect(sessionStore.getState().user).toBeNull();
  });

  it("redirects carry only the return path, never credentials or body data", async () => {
    const { expireSession } = await loadExpiry();
    Object.assign(window.location, { pathname: "/wallet", search: "" });

    expireSession();

    expect(assignSpy).toHaveBeenCalledWith("/login?returnTo=%2Fwallet");
  });
});
