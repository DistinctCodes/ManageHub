"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { InitializePaymentResponse } from "@/lib/types/payment";
import { toast } from "sonner";

export const useInitializePayment = () => {
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post<{ success: boolean; data: InitializePaymentResponse }>(
        "/payments/initialize",
        { bookingId }
      ),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initialize payment");
    },
  });
};
