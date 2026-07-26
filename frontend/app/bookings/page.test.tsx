import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MyBookingsPage from "./page";

const mockRefetch = vi.fn();
const mockCancelBooking = vi.fn();
const mockGetMyBookings = vi.fn();

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/react-query/hooks/bookings/useGetMyBookings", () => ({
  useGetMyBookings: (...args: unknown[]) => mockGetMyBookings(...args),
}));

vi.mock("@/lib/react-query/hooks/bookings/useCancelBooking", () => ({
  useCancelBooking: () => ({
    mutateAsync: mockCancelBooking,
    isPending: false,
  }),
}));

vi.mock("@/lib/react-query/hooks/payments/useInitializePayment", () => ({
  useInitializePayment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("MyBookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when there are no bookings", () => {
    mockGetMyBookings.mockReturnValue({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<MyBookingsPage />);
    expect(screen.getByText(/No bookings yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Browse workspaces to make your first booking/i)).toBeInTheDocument();
  });

  it("renders list of bookings and status badges correctly", () => {
    mockGetMyBookings.mockReturnValue({
      data: {
        data: [
          {
            id: "booking-12345678",
            workspaceId: "ws-1",
            workspace: { name: "Executive Suite" },
            planType: "MONTHLY",
            seatCount: 2,
            startDate: "2026-08-01",
            endDate: "2026-08-31",
            totalAmount: 15000000,
            status: "CONFIRMED",
            createdAt: "2026-07-26T08:00:00Z",
          },
          {
            id: "booking-87654321",
            workspaceId: "ws-2",
            workspace: { name: "Hot Desk" },
            planType: "DAILY",
            seatCount: 1,
            startDate: "2026-09-01",
            endDate: "2026-09-01",
            totalAmount: 500000,
            status: "PENDING",
            createdAt: "2026-07-26T08:00:00Z",
          },
        ],
        meta: { total: 2, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<MyBookingsPage />);
    expect(screen.getByText("Executive Suite")).toBeInTheDocument();
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("Hot Desk")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("handles pagination when multiple pages exist", () => {
    mockGetMyBookings.mockReturnValue({
      data: {
        data: [
          {
            id: "booking-1",
            workspaceId: "ws-1",
            workspace: { name: "Suite 1" },
            planType: "DAILY",
            seatCount: 1,
            startDate: "2026-08-01",
            endDate: "2026-08-02",
            totalAmount: 1000000,
            status: "CONFIRMED",
            createdAt: "2026-07-26T08:00:00Z",
          },
        ],
        meta: { total: 15, totalPages: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<MyBookingsPage />);
    expect(screen.getByText("15 bookings total")).toBeInTheDocument();
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(mockGetMyBookings).toHaveBeenCalledWith(2, 10);
  });

  it("requires confirmation before cancelling a booking", async () => {
    mockGetMyBookings.mockReturnValue({
      data: {
        data: [
          {
            id: "booking-cancel-me",
            workspaceId: "ws-1",
            workspace: { name: "Cancel Space" },
            planType: "DAILY",
            seatCount: 1,
            startDate: "2026-08-01",
            endDate: "2026-08-02",
            totalAmount: 500000,
            status: "PENDING",
            createdAt: "2026-07-26T08:00:00Z",
          },
        ],
        meta: { total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<MyBookingsPage />);
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    
    // First click shows confirmation
    fireEvent.click(cancelBtn);
    expect(screen.getByText("Confirm cancel?")).toBeInTheDocument();
    expect(mockCancelBooking).not.toHaveBeenCalled();

    // Second click executes cancel
    fireEvent.click(screen.getByText("Confirm cancel?"));
    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith("booking-cancel-me");
    });
  });
});
