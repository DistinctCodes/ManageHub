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
    onMutate: async (data) => {
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
          const optimisticBooking: Booking = {
            id: `temp-${Date.now()}`,
            userId: "",
            workspaceId: data.workspaceId,
            planType: data.planType,
            startDate: data.startDate,
            endDate: data.endDate,
            totalAmount: 0,
            status: "PENDING",
            seatCount: data.seatCount,
            notes: data.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return {
            ...old,
            data: [optimisticBooking, ...old.data],
          };
        }
      );

      return { previousBookings };
    },
    onError: (_err, _data, context) => {
      if (context?.previousBookings) {
        for (const [key, data] of context.previousBookings) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to create booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success("Booking created successfully!");
    },
  });
};
