import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ForgotPasswordPage from "./page";

const mockSendResetOtp = vi.fn();
vi.mock("@/lib/react-query/hooks/auth/useForgotPassword", () => ({
  useForgotPassword: () => ({
    mutate: mockSendResetOtp,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ForgotPasswordPage", () => {
  it("renders email input and submit button", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset code/i })).toBeInTheDocument();
  });

  it("submits forgot password request with email", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
      target: { value: "user@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => {
      expect(mockSendResetOtp).toHaveBeenCalledWith(
        { email: "user@example.com" },
        expect.any(Object)
      );
    });
  });
});
