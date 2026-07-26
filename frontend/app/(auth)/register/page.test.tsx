import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterPageRoute from "./page";

const mockRegisterUser = vi.fn();
vi.mock("@/lib/react-query/hooks/auth/useRegisterUser", () => ({
  useRegisterUser: () => ({
    mutate: mockRegisterUser,
    isPending: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe("RegisterPageRoute & RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 inputs correctly", () => {
    render(<RegisterPageRoute />);
    expect(screen.getByPlaceholderText("Yusuf N M")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("faladeyusuf54@gmail.com")).toBeInTheDocument();
  });

  it("advances from Step 1 to Step 2 when Step 1 is completed", async () => {
    render(<RegisterPageRoute />);

    // Step 1: Fill personal info
    fireEvent.change(screen.getByPlaceholderText("Yusuf N M"), { target: { value: "Jane Smith" } });
    fireEvent.change(screen.getByPlaceholderText("faladeyusuf54@gmail.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("+234800033156218"), { target: { value: "+2348012345678" } });

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    // Step 2: Account setup inputs appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Create a strong password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });
  });

  it("submits registration payload when both steps are valid", async () => {
    render(<RegisterPageRoute />);

    // Step 1
    fireEvent.change(screen.getByPlaceholderText("Yusuf N M"), { target: { value: "Jane Smith" } });
    fireEvent.change(screen.getByPlaceholderText("faladeyusuf54@gmail.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("+234800033156218"), { target: { value: "+2348012345678" } });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Create a strong password")).toBeInTheDocument();
    });

    // Step 2
    fireEvent.change(screen.getByPlaceholderText("Your organization name"), { target: { value: "Acme Corp" } });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), { target: { value: "Password123!" } });

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith({
        firstname: "Jane",
        lastname: "Smith",
        email: "jane@example.com",
        password: "Password123!",
      });
    });
  });
});
