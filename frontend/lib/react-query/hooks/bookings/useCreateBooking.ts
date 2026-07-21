"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking, CreateBookingDto } from "@/lib/types/booking";
import { toast } from "sonner";

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingDto) =>
      apiClient.post<{ success: boolean; data: Booking }>("/bookings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success("Booking created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });
};
