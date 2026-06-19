"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking } from "@/lib/types/booking";

interface BookingResponse {
  message: string;
  data: Booking;
}

export const useGetBooking = (id: string) => {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => apiClient.get<BookingResponse>(`/bookings/${id}`),
    enabled: !!id,
  });
};
