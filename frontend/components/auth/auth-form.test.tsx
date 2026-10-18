import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  setSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/lib/stores/session-store", () => ({
  useSessionStore: (
    selector: (state: { setSession: typeof mocks.setSession }) => unknown,
  ) => selector({ setSession: mocks.setSession }),
}));

vi.mock("@/lib/auth-api", () => ({
  login: mocks.login,
  register: mocks.register,
}));

import { AuthForm } from "./auth-form";

function renderForm(mode: "login" | "register") {
  return render(<AuthForm mode={mode} />);
}

describe("AuthForm registration confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render a confirmation field for login", () => {
    renderForm("login");

    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("blocks registration when passwords do not match", async () => {
    const user = userEvent.setup();
    renderForm("register");

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "password-two");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(mocks.register).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
  });

  it("submits registration when passwords match", async () => {
    const user = userEvent.setup();
    mocks.register.mockResolvedValue({
      accessToken: "access-token",
      user: { id: "user-1", email: "person@example.com", role: "user" },
    });
    renderForm("register");

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "password-one");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(mocks.register).toHaveBeenCalledWith(
        "person@example.com",
        "password-one",
      ),
    );
    expect(mocks.setSession).toHaveBeenCalledWith(
      { id: "user-1", email: "person@example.com", role: "user" },
      "access-token",
    );
    expect(mocks.push).toHaveBeenCalledWith("/wallet");
  });
});
