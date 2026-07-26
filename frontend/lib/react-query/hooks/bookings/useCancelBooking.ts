"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking } from "@/lib/types/booking";
import { toast } from "sonner";

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/cancel`
      ),
    onMutate: async (bookingId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.bookings.all,
      });

      const previousBookings = queryClient.getQueriesData({
        queryKey: queryKeys.bookings.all,
      });

      queryClient.setQueriesData<{ data: Booking[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        { queryKey: queryKeys.bookings.mine({}) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((b) =>
              b.id === bookingId ? { ...b, status: "CANCELLED" as const } : b
            ),
          };
        }
      );

      return { previousBookings };
    },
    onError: (_err, _bookingId, context) => {
      if (context?.previousBookings) {
        for (const [key, data] of context.previousBookings) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to cancel booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success("Booking cancelled");
    },
  });
};
