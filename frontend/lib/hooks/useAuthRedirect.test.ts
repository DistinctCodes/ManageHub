import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthRedirect } from "./useAuthRedirect";
import { useAuthState } from "../store/authStore";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("../store/authStore", () => ({
  useAuthState: vi.fn(),
}));

describe("useAuthRedirect hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows access when page does not require auth", () => {
    vi.mocked(useAuthState).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useAuthRedirect({ requireAuth: false }));
    expect(result.current.canAccess).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects authenticated user away from login if redirectIfAuthenticated is set", () => {
    vi.mocked(useAuthState).mockReturnValue({
      user: { id: "1", role: "MEMBER" },
      isAuthenticated: true,
      isLoading: false,
    } as any);

    renderHook(() =>
      useAuthRedirect({ redirectIfAuthenticated: "/dashboard" })
    );

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects unauthenticated user to login when requireAuth is true", () => {
    vi.mocked(useAuthState).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as any);

    renderHook(() => useAuthRedirect({ requireAuth: true }));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login?redirect=")
    );
  });

  it("redirects user without required role to /dashboard", () => {
    vi.mocked(useAuthState).mockReturnValue({
      user: { id: "1", role: "user" },
      isAuthenticated: true,
      isLoading: false,
    } as any);

    renderHook(() =>
      useAuthRedirect({ requireAuth: true, requiredRole: "admin" })
    );

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
