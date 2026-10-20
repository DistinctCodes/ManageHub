import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { login, me, logout } from "../auth-api";
import { useSessionStore } from "../stores/session-store";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("auth-api (cookie session model, issue #1975)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    useSessionStore.getState().clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends credentials so the backend's HttpOnly cookie is set", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        accessToken: "tok",
        user: { id: "u1", email: "a@example.com", role: "user" },
      }),
    );

    await login("a@example.com", "pw");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("keeps the invalid-credentials copy for a login 401 without redirecting", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: "Invalid credentials" }),
    );

    await expect(login("a@example.com", "pw")).rejects.toThrow(
      "Invalid credentials",
    );
    // A 401 on the login endpoint is bad credentials, not an expired session.
    expect(toast.error).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
  });

  it("restores the session from GET /auth/me and is single-flight", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { id: "u1", email: "a@example.com", role: "admin" }),
    );

    const [restored, restoredAgain] = await Promise.all([me(), me()]);

    expect(restored).toEqual({
      id: "u1",
      email: "a@example.com",
      role: "admin",
    });
    expect(restoredAgain).toEqual(restored);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/auth/me");
    expect(init.credentials).toBe("include");
  });

  it("reports a rejected 401 session and clears the store for /auth/me", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "Unauthorized" }));

    await expect(me()).rejects.toThrow("Unauthorized");

    expect(useSessionStore.getState().user).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
    );
  });

  it("logout posts to /auth/logout with credentials and never throws", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, null));

    await logout();
    await expect(logout()).resolves.toBeUndefined();

    const calls = fetchMock.mock.calls;
    for (const call of calls) {
      const [url, init] = call;
      expect(String(url)).toContain("/auth/logout");
      expect(init.method).toBe("POST");
      expect(init.credentials).toBe("include");
    }
  });
});
