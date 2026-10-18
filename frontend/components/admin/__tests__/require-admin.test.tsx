import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname, useRouter } from "next/navigation";

import { RequireAdmin } from "../require-admin";
import { useSessionStore } from "@/lib/stores/session-store";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/stores/use-session-bootstrap", () => ({
  useSessionBootstrap: () => {},
}));

/**
 * JWT_SECRET verification works server-side only, so the client relies on
 * `GET /auth/me` to learn the signed-in user (and role). The bootstrap hook is
 * mocked above, and each test seeds the real zustand store directly so the
 * store's status machine drives the component.
 */
function seedSession(state: {
  user: { id: string; email: string; role: string } | null;
  accessToken: string | null;
  status: "unknown" | "authenticated" | "unauthenticated";
}): void {
  useSessionStore.setState(state, false);
}

const replace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/admin/accounts?tab=frozen");
  vi.mocked(usePathname).mockReturnValue("/admin/accounts");
  vi.mocked(useRouter).mockReturnValue({
    replace,
  } as unknown as ReturnType<typeof useRouter>);
});

afterEach(() => {
  useSessionStore.setState(
    { user: null, accessToken: null, status: "unknown" },
    false,
  );
});

describe("RequireAdmin role gate (issue #1973)", () => {
  it("renders protected content for an admin user", () => {
    seedSession({
      user: { id: "u1", email: "a@example.com", role: "admin" },
      accessToken: "not-readable-from-cookie",
      status: "authenticated",
    });

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a not-authorised state for a member-role user", () => {
    seedSession({
      user: { id: "u2", email: "bill@example.com", role: "user" },
      accessToken: "not-readable-from-cookie",
      status: "authenticated",
    });

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    expect(
      screen.getByRole("heading", { name: "Not authorised" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects an unauthenticated visitor with the current destination", async () => {
    seedSession({ user: null, accessToken: null, status: "unauthenticated" });

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    const loginUrl = "/login?returnTo=%2Fadmin%2Faccounts%3Ftab%3Dfrozen";
    const loginLink = screen.getByRole("link", { name: "Sign in to continue" });
    await waitFor(() => expect(loginLink).toHaveAttribute("href", loginUrl));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(loginUrl));
  });

  it("shows a transient checking state while the session is unknown", async () => {
    // Simulate /auth/me resolving to a member shortly after mount.
    seedSession({ user: null, accessToken: null, status: "unknown" });

    const { rerender } = render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText("Checking your session...")).toBeInTheDocument();

    useSessionStore.setState({
      user: { id: "u2", email: "bill@example.com", role: "user" },
      accessToken: "not-readable-from-cookie",
      status: "authenticated",
    });
    rerender(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    expect(
      screen.getByRole("heading", { name: "Not authorised" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
