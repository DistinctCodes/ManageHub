import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Cookies from "js-cookie";
import { usePathname, useRouter } from "next/navigation";
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

  it("renders protected content when an access token is present", () => {
    vi.mocked(Cookies.get).mockReturnValue("access-token");

    render(
      <RequireAdmin>
        <div>Protected content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
