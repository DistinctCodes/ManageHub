import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Cookies from "js-cookie";
import { usePathname, useRouter } from "next/navigation";
import {
  SESSION_SIGNAL_KEY,
  useSessionStore,
} from "@/lib/stores/session-store";
import { RequireAdmin } from "../require-admin";

vi.mock("js-cookie", () => ({
  default: { get: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const replace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // The zustand store is module-scoped and would otherwise leak state
  // between tests (issue #1983): every test starts un-hydrated.
  useSessionStore.setState({ accessToken: null, hydrated: false });
  window.history.replaceState({}, "", "/admin/accounts?tab=frozen");
  vi.mocked(usePathname).mockReturnValue("/admin/accounts");
  vi.mocked(useRouter).mockReturnValue({
    replace,
  } as unknown as ReturnType<typeof useRouter>);
});

describe("RequireAdmin", () => {
  it("redirects an unauthenticated visitor with the current destination", async () => {
    vi.mocked(Cookies.get).mockReturnValue(undefined);

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    const loginUrl =
      "/login?returnTo=%2Fadmin%2Faccounts%3Ftab%3Dfrozen";
    const loginLink = screen.getByRole("link", { name: "Sign in to continue" });
    await waitFor(() => expect(loginLink).toHaveAttribute("href", loginUrl));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(loginUrl));
  });

  it("renders protected content when an access token is present", async () => {
    vi.mocked(Cookies.get).mockReturnValue("access-token");

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    // The token is only known after the client-side hydration effect runs,
    // which is exactly what keeps the first render identical to the SSR
    // output (issue #1983).
    await waitFor(() =>
      expect(screen.getByText("Protected content")).toBeInTheDocument(),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears the session and re-gates when another tab signs out", async () => {
    vi.mocked(Cookies.get).mockReturnValue("access-token");

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );
    await waitFor(() =>
      expect(screen.getByText("Protected content")).toBeInTheDocument(),
    );

    // The other tab removed the cookie and emitted the session signal.
    vi.mocked(Cookies.get).mockReturnValue(undefined);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: SESSION_SIGNAL_KEY }),
      );
    });

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Sign in to continue" }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders a neutral checking state while hydration is pending", () => {
    vi.mocked(Cookies.get).mockReturnValue(undefined);

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    // Force the pre-hydration state the component shows on first paint,
    // before the store's hydrate effect has run: it must be a neutral
    // "checking" state so it matches the SSR output (issue #1983) instead
    // of flashing the signed-out panel.
    act(() =>
      useSessionStore.setState({ accessToken: null, hydrated: false }),
    );
    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in to continue" }),
    ).not.toBeInTheDocument();
  });
});
