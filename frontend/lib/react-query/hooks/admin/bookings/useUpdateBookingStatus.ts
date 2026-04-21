"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking } from "@/lib/types/booking";
import { toast } from "sonner";

type BookingAction = "confirm" | "cancel" | "complete";

const ACTION_LABELS: Record<BookingAction, string> = {
  confirm: "confirmed",
  cancel: "cancelled",
  complete: "completed",
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: BookingAction }) =>
      apiClient.patch<{ success: boolean; data: Booking }>(
        `/bookings/${id}/${action}`
      ),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success(`Booking ${ACTION_LABELS[action]}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });
};
