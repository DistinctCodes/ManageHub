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

// The mocked module must expose the same AuthApiError class the component
// uses for its instanceof checks (issue #1988), so thrown errors are
// recognised as structured field failures.
vi.mock("@/lib/auth-api", () => {
  class MockAuthApiError extends Error {
    status: number;
    fieldErrors: Record<string, string>;

    constructor(
      status: number,
      fieldErrors: Record<string, string>,
      message: string,
    ) {
      super(message);
      this.name = "AuthApiError";
      this.status = status;
      this.fieldErrors = fieldErrors;
    }
  }

  return {
    AuthApiError: MockAuthApiError,
    login: mocks.login,
    register: mocks.register,
  };
});

import { AuthApiError } from "@/lib/auth-api";
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

describe("AuthForm per-field API errors (issue #1988)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 400 validation messages next to their own field", async () => {
    const user = userEvent.setup();
    mocks.register.mockRejectedValue(
      new AuthApiError(
        400,
        {
          email: "email must be an email",
          password: "password must be longer than or equal to 8 characters",
        },
        "Bad Request",
      ),
    );
    renderForm("register");

    await user.type(screen.getByLabelText("Email"), "not-an-email@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const emailError = await screen.findByText("email must be an email");
    expect(emailError).toHaveAttribute("id", "email-error");
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-describedby",
      "email-error",
    );

    const passwordError = screen.getByText(
      "password must be longer than or equal to 8 characters",
    );
    expect(passwordError).toHaveAttribute("id", "password-error");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // The generic form-level banner is silent when the fields carry the
    // detail - the message is already next to the offending input.
    expect(screen.queryByText("Bad Request")).not.toBeInTheDocument();
    // The first invalid field receives focus for keyboard users.
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
  });

  it("maps a 409 taken-email failure onto the email field", async () => {
    const user = userEvent.setup();
    mocks.register.mockRejectedValue(
      new AuthApiError(
        409,
        { email: "Email is already registered" },
        "Conflict",
      ),
    );
    renderForm("register");

    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "password-one");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Email is already registered"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a single form-level message when rate limited (429)", async () => {
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(
      new AuthApiError(429, {}, "Too many attempts, try again in 60 seconds"),
    );
    renderForm("login");

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Too many attempts. Please wait a few minutes and try again.",
    );
    expect(screen.queryByText(/seconds/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("keeps the top banner for failures without field detail (401)", async () => {
    const user = userEvent.setup();
    mocks.login.mockRejectedValue(new AuthApiError(401, {}, "Invalid credentials"));
    renderForm("login");

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Invalid credentials"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("clears a field's error when the user edits that field", async () => {
    const user = userEvent.setup();
    mocks.register.mockRejectedValue(
      new AuthApiError(400, { email: "email must be an email" }, "Bad Request"),
    );
    renderForm("register");

    await user.type(screen.getByLabelText("Email"), "nope@example.com");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.type(screen.getByLabelText("Confirm password"), "password-one");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText("email must be an email");

    await user.type(screen.getByLabelText("Email"), "x");
    expect(screen.queryByText("email must be an email")).not.toBeInTheDocument();
  });
});
