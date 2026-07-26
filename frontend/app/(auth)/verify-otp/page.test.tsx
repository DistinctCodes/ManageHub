import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VerifyOtpPage from "./page";
import { apiClient } from "@/lib/apiClient";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key: string) => (key === "email" ? "test@example.com" : null) }),
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

describe("VerifyOtpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 OTP digit inputs", () => {
    render(<VerifyOtpPage />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(4);
  });

  it("handles paste of 4-digit code into OTP input container", async () => {
    const { container } = render(<VerifyOtpPage />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];

    const otpContainer = container.querySelector(".flex.justify-center.gap-3");
    if (otpContainer) {
      fireEvent.paste(otpContainer, {
        clipboardData: { getData: () => "1234" },
      });
    }

    await waitFor(() => {
      expect(inputs[0].value).toBe("1");
      expect(inputs[1].value).toBe("2");
      expect(inputs[2].value).toBe("3");
      expect(inputs[3].value).toBe("4");
    });
  });

  it("submits OTP verification successfully and redirects", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      tokens: { accessToken: "access-123" },
      user: { id: "user-1", hasCompletedOnboarding: true },
    });

    render(<VerifyOtpPage />);
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: String(index + 1) } });
    });

    const verifyBtn = screen.getByRole("button", { name: /verify email/i });
    expect(verifyBtn).not.toBeDisabled();

    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/auth/verify-otp", {
        email: "test@example.com",
        otp: "1234",
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("handles resend code cooldown button", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ success: true });

    render(<VerifyOtpPage />);
    const resendBtn = screen.getByRole("button", { name: /resend code/i });

    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/auth/resend-verification-otp", {
        email: "test@example.com",
      });
      expect(screen.getByText(/resend in 60s/i)).toBeInTheDocument();
    });
  });
});
