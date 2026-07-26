import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ResetPasswordPage from "./page";
import { apiClient } from "@/lib/apiClient";

const mockGetToken = vi.fn().mockReturnValue("valid-token");

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "token" ? mockGetToken() : null) }),
}));

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders new password and confirm password inputs", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Re-enter your new password")).toBeInTheDocument();
  });

  it("displays mismatch error when passwords do not match", async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your new password"), {
      target: { value: "Mismatch123!" },
    });

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("submits new password when token and form inputs are valid", async () => {
    mockGetToken.mockReturnValue("valid-reset-token");
    vi.mocked(apiClient.post).mockResolvedValueOnce({ success: true });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("Enter your new password"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your new password"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/users/reset-password", {
        token: "valid-reset-token",
        newPassword: "Password123!",
      });
      expect(screen.getByText(/Password Reset Complete/i)).toBeInTheDocument();
    });
  });
});
