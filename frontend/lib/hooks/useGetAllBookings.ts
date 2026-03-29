"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Booking, BookingStatus } from "@/lib/types/booking";

type AdminBookingStatus = BookingStatus | "ALL";

interface BookingsResponse {
  data: Booking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function getActionEndpoint(bookingId: string, action: "cancel" | "complete" | "confirm") {
  if (action === "confirm") {
    return `/bookings/${bookingId}/confirm`;
  }

  if (action === "complete") {
    return `/bookings/${bookingId}/complete`;
  }

  return `/bookings/${bookingId}/cancel`;
}

export const useGetAllBookings = (status: AdminBookingStatus) => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const params = new URLSearchParams({
    page: String(page),
    limit: "10",
  });

  if (status !== "ALL") {
    params.set("status", status);
  }

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings", { status, page }] as const,
    queryFn: () => apiClient.get<BookingsResponse>(`/bookings?${params}`),
  });

  const mutation = useMutation({
    mutationFn: ({
      bookingId,
      action,
    }: {
      bookingId: string;
      action: "cancel" | "complete" | "confirm";
    }) => apiClient.patch(getActionEndpoint(bookingId, action)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

  const bookings = bookingsQuery.data?.data ?? [];
  const counts = useMemo(
    () =>
      bookings.reduce<Record<string, number>>(
        (acc, booking) => {
          const key = booking.status.toLowerCase();
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        },
        {
          all: bookings.length,
          pending: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
        }
      ),
    [bookings]
  );

  return {
    bookings,
    counts,
    loading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    mutateBooking: (bookingId: string, action: "cancel" | "complete" | "confirm") =>
      mutation.mutateAsync({ bookingId, action }),
    pagination: {
      page,
      totalPages: bookingsQuery.data?.meta.totalPages ?? 1,
      prev: () => setPage((currentPage) => Math.max(1, currentPage - 1)),
      next: () =>
        setPage((currentPage) =>
          Math.min(bookingsQuery.data?.meta.totalPages ?? 1, currentPage + 1)
        ),
    },
  };
};
