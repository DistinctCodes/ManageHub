// frontend/src/hooks/use-verify-payment.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { paymentApi } from "@/lib/api-client";

export function useVerifyPayment() {
  const router = useRouter();

  return useMutation({
    mutationFn: (reference: string) => paymentApi.verifyPayment(reference),

    onSuccess: (data) => {
      toast.success("Payment successful!", {
        description: "Your membership has been activated.",
      });

      // Redirect to biometric setup
      router.push("/onboarding/biometric-setup");
    },

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Payment verification failed.";
      toast.error("Payment verification failed", {
        description: errorMessage,
      });

      // Redirect back to payment page
      router.push("/onboarding/payment");
    },
  });
}
