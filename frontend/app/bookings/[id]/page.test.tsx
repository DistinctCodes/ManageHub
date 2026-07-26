import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookingDetailPage from "./page";

const mockGetBooking = vi.fn();
const mockGetMyInvoices = vi.fn();
const mockCancelBooking = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    use: () => ({ id: "booking-123" }),
  };
});

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/react-query/hooks/bookings/useGetBooking", () => ({
  useGetBooking: (id: string) => mockGetBooking(id),
}));

vi.mock("@/lib/react-query/hooks/invoices/useGetMyInvoices", () => ({
  useGetMyInvoices: (...args: unknown[]) => mockGetMyInvoices(...args),
}));

vi.mock("@/lib/react-query/hooks/bookings/useCancelBooking", () => ({
  useCancelBooking: () => ({
    mutateAsync: mockCancelBooking,
    isPending: false,
  }),
}));

describe("BookingDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyInvoices.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
  });

  it("renders booking details correctly for PENDING status", () => {
    mockGetBooking.mockReturnValue({
      data: {
        data: {
          id: "booking-123",
          workspaceId: "ws-1",
          workspace: { name: "Meeting Room A", type: "MEETING_ROOM" },
          planType: "HOURLY",
          seatCount: 4,
          startDate: "2026-08-10",
          endDate: "2026-08-10",
          totalAmount: 2000000, // 20,000 NGN
          status: "PENDING",
          createdAt: "2026-07-26T08:00:00Z",
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<BookingDetailPage params={Promise.resolve({ id: "booking-123" })} />);

    expect(screen.getByText(/Meeting Room A/i)).toBeInTheDocument();
    expect(screen.getAllByText("PENDING").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /cancel booking/i })).toBeInTheDocument();
  });

  it("renders booking details correctly for CONFIRMED status and supports cancel action", async () => {
    mockGetBooking.mockReturnValue({
      data: {
        data: {
          id: "booking-123",
          workspaceId: "ws-1",
          workspace: { name: "Meeting Room A", type: "MEETING_ROOM" },
          planType: "HOURLY",
          seatCount: 4,
          startDate: "2026-08-10",
          endDate: "2026-08-10",
          totalAmount: 2000000,
          status: "CONFIRMED",
          createdAt: "2026-07-26T08:00:00Z",
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<BookingDetailPage params={Promise.resolve({ id: "booking-123" })} />);

    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /cancel booking/i });
    fireEvent.click(cancelBtn);

    const confirmBtn = screen.getByRole("button", { name: /confirm cancellation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith("booking-123");
    });
  });

  it("renders booking details correctly for CANCELLED status (no cancel button present)", () => {
    mockGetBooking.mockReturnValue({
      data: {
        data: {
          id: "booking-123",
          workspaceId: "ws-1",
          workspace: { name: "Meeting Room A", type: "MEETING_ROOM" },
          planType: "HOURLY",
          seatCount: 4,
          startDate: "2026-08-10",
          endDate: "2026-08-10",
          totalAmount: 2000000,
          status: "CANCELLED",
          createdAt: "2026-07-26T08:00:00Z",
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<BookingDetailPage params={Promise.resolve({ id: "booking-123" })} />);

    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel booking/i })).not.toBeInTheDocument();
  });
});
