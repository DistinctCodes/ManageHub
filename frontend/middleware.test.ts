// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { middleware } from "./middleware";

vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

type VerifyPayload = { role?: string };

function requestWithCookie(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { cookie: "accessToken=jwt-token" },
  });
}

function verifiedToken(role: string): void {
  vi.mocked(jwtVerify).mockResolvedValue({
    payload: { sub: "u1", role } as VerifyPayload,
  } as never);
}

describe("middleware role gate (issue #1973)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("lets an admin token through to admin pages", async () => {
    verifiedToken("admin");
    const response = await middleware(requestWithCookie("/admin/accounts"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a member token away from admin pages to /admin/forbidden", async () => {
    verifiedToken("user");
    const response = await middleware(requestWithCookie("/admin/accounts"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin/forbidden");
  });

  it("does not loop when rendering the forbidden page itself", async () => {
    verifiedToken("user");
    const response = await middleware(requestWithCookie("/admin/forbidden"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated users to /login with a returnTo", async () => {
    const response = await middleware(
      new NextRequest("http://localhost/credits"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?returnTo=%2Fcredits",
    );
  });

  it("redirects authenticated users away from login to /wallet", async () => {
    verifiedToken("user");
    const response = await middleware(requestWithCookie("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/wallet");
  });

  it("still redirects to /admin/forbidden when the token cannot be verified", async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error("bad token"));

    // Unverifiable token -> treated as unauthenticated -> login redirect.
    const response = await middleware(requestWithCookie("/admin"));
    expect(response.status).toBe(307);
    expect(String(response.headers.get("location"))).toContain("/login");
  });
});
