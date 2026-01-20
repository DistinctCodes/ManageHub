// frontend/src/hooks/use-initialize-payment.ts
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentApi } from "@/lib/api-client";

interface InitializePaymentParams {
  membershipType: string;
  paymentPlan: string;
  amount: number;
}

export function useInitializePayment() {
  return useMutation({
    mutationFn: (params: InitializePaymentParams) =>
      paymentApi.initializePayment(params),

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Failed to initialize payment.";
      toast.error("Payment initialization failed", {
        description: errorMessage,
      });
    },
  });
}
