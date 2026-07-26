import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPageRoute from "./page";
import { renderWithProviders } from "@/test-utils";

const mockLogin = vi.fn();
vi.mock("@/hooks/use-login", () => ({
  useLogin: () => ({
    login: mockLogin,
    loading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe("LoginPageRoute & LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs with submit button", () => {
    renderWithProviders(<LoginPageRoute />);
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("triggers login handler on valid form submission", async () => {
    renderWithProviders(<LoginPageRoute />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
        rememberMe: false,
      });
    });
  });
});
