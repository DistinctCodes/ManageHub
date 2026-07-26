import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import BookPage from "./page";
import { apiClient } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe("BookPage (Public Day Pass)", () => {
  it("renders form inputs correctly", () => {
    render(<BookPage />);
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/phone/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/workspace id/i)).toBeInTheDocument();
  });

  it("submits day pass booking successfully", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ success: true });

    render(<BookPage />);

    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: "Alice Smith" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: "08012345678" } });
    fireEvent.change(screen.getByPlaceholderText(/workspace id/i), { target: { value: "ws-123" } });
    fireEvent.change(screen.getByDisplayValue(""), { target: { value: "2026-08-10" } });

    fireEvent.click(screen.getByRole("button", { name: /book now/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/bookings/public/day-pass", {
        guestName: "Alice Smith",
        guestEmail: "alice@example.com",
        guestPhone: "08012345678",
        workspaceId: "ws-123",
        date: "2026-08-10",
      });
      expect(screen.getByText(/confirmed — check your email/i)).toBeInTheDocument();
    });
  });

  it("displays error message if submission fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("API Error"));

    render(<BookPage />);

    fireEvent.change(screen.getByPlaceholderText(/full name/i), { target: { value: "Alice Smith" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: "08012345678" } });
    fireEvent.change(screen.getByPlaceholderText(/workspace id/i), { target: { value: "ws-123" } });
    fireEvent.change(screen.getByDisplayValue(""), { target: { value: "2026-08-10" } });

    fireEvent.click(screen.getByRole("button", { name: /book now/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
