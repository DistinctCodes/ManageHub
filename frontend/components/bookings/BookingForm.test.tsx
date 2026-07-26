import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookingForm from "./BookingForm";

const mockPush = vi.fn();
const mockMutateAsyncCreateBooking = vi.fn();
const mockMutateAsyncInitializePayment = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => "" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/react-query/hooks/workspaces/useGetWorkspaces", () => ({
  useGetWorkspaces: () => ({
    data: {
      data: [
        { id: "ws-1", name: "Desk 101", hourlyRate: 100000, totalSeats: 10 },
        { id: "ws-2", name: "Private Office A", hourlyRate: 500000, totalSeats: 4 },
      ],
    },
  }),
}));

vi.mock("@/lib/react-query/hooks/workspaces/useGetWorkspaceById", () => ({
  useGetWorkspaceById: (id: string) => ({
    data: id === "ws-1" ? { data: { id: "ws-1", name: "Desk 101", hourlyRate: 100000, totalSeats: 10 } } : null,
  }),
}));

vi.mock("@/lib/react-query/hooks/bookings/usePriceEstimate", () => ({
  usePriceEstimate: (params: { workspaceId?: string } | null) => {
    if (!params?.workspaceId) return { data: null, isFetching: false };
    return {
      data: {
        data: {
          totalAmount: 500000, // 5,000 NGN in kobo
        },
      },
      isFetching: false,
    };
  },
}));

vi.mock("@/lib/react-query/hooks/bookings/useCreateBooking", () => ({
  useCreateBooking: () => ({
    mutateAsync: mockMutateAsyncCreateBooking,
    isPending: false,
  }),
}));

vi.mock("@/lib/react-query/hooks/payments/useInitializePayment", () => ({
  useInitializePayment: () => ({
    mutateAsync: mockMutateAsyncInitializePayment,
    isPending: false,
  }),
}));

describe("BookingForm component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders workspace selection and allows selecting a workspace", () => {
    render(<BookingForm />);
    expect(screen.getByText(/Select a workspace/i)).toBeInTheDocument();

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ws-1" } });
    expect(select).toHaveValue("ws-1");
  });

  it("validates date inputs (min date constraint) and enables step progression", async () => {
    const { container } = render(<BookingForm />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ws-1" } });

    const dateInputs = container.querySelectorAll<HTMLInputElement>("input[type='date']");
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];

    const todayStr = new Date().toISOString().split("T")[0];
    expect(startDateInput.min).toBe(todayStr);

    fireEvent.change(startDateInput, { target: { value: "2026-09-01" } });
    expect(endDateInput.min).toBe("2026-09-01");

    fireEvent.change(endDateInput, { target: { value: "2026-09-05" } });

    const submitBtn = screen.getByRole("button", { name: /continue to review/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("renders price estimate exact kobo to ₦ conversion (500000 kobo => ₦5,000.00)", () => {
    const { container } = render(<BookingForm />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ws-1" } });

    const dateInputs = container.querySelectorAll<HTMLInputElement>("input[type='date']");
    fireEvent.change(dateInputs[0], { target: { value: "2026-09-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-09-05" } });

    expect(screen.getByText(/Estimated total/i)).toBeInTheDocument();
    // 500,000 kobo is ₦5,000.00
    expect(screen.getByText(/₦5,000\.00/i)).toBeInTheDocument();
  });

  it("handles conflict/unavailable slot errors gracefully on submission", async () => {
    mockMutateAsyncCreateBooking.mockRejectedValueOnce(new Error("Workspace unavailable for selected dates"));

    const { container } = render(<BookingForm />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ws-1" } });
    const dateInputs = container.querySelectorAll<HTMLInputElement>("input[type='date']");
    fireEvent.change(dateInputs[0], { target: { value: "2026-09-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-09-05" } });

    fireEvent.click(screen.getByRole("button", { name: /continue to review/i }));

    const confirmBtn = screen.getByRole("button", { name: /confirm & proceed to payment/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateAsyncCreateBooking).toHaveBeenCalled();
    });
  });
});
