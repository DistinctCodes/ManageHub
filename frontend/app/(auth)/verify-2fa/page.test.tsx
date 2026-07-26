import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Verify2FAPage from "./page";
import { apiClient } from "@/lib/apiClient";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === "tempToken" ? "temp-token-123" : key === "email" ? "2fa@example.com" : null),
  }),
}));

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
    setToken: vi.fn(),
  },
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    setToken: vi.fn(),
    setUser: vi.fn(),
  },
}));

describe("Verify2FAPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders TOTP input mode by default", () => {
    render(<Verify2FAPage />);
    expect(screen.getByText(/Enter the 6-digit code from your authenticator app/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
  });

  it("switches to backup code mode when button is clicked", () => {
    render(<Verify2FAPage />);
    const switchBtn = screen.getByRole("button", { name: /use a backup code instead/i });
    fireEvent.click(switchBtn);

    expect(screen.getByText(/Enter one of your saved backup codes/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. a1b2c3d4e5/i)).toBeInTheDocument();
  });

  it("submits 2FA code and redirects to dashboard on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      accessToken: "final-access-token",
      user: { id: "user-2fa", email: "2fa@example.com" },
    });

    render(<Verify2FAPage />);
    const input = screen.getByPlaceholderText("000000");

    fireEvent.change(input, { target: { value: "123456" } });
    const submitBtn = screen.getByRole("button", { name: /verify & sign in/i });

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/auth/2fa/verify", {
        token: "123456",
        tempToken: "temp-token-123",
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
