"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking, BookingStatus } from "@/lib/types/booking";

interface AdminBookingsResponse {
  success: boolean;
  data: Booking[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const useGetAllBookings = (
  page = 1,
  limit = 15,
  status?: BookingStatus
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);

  return useQuery({
    queryKey: queryKeys.admin.bookings.list({ page, limit, status }),
    queryFn: () =>
      apiClient.get<AdminBookingsResponse>(`/bookings?${params}`),
  });
};
