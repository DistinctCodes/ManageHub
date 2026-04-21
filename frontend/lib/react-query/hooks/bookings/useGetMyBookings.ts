"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking } from "@/lib/types/booking";

interface BookingsResponse {
  success: boolean;
  data: Booking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useGetMyBookings = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.bookings.mine({ page, limit }),
    queryFn: () =>
      apiClient.get<BookingsResponse>(
        `/bookings?page=${page}&limit=${limit}`
      ),
  });
};
