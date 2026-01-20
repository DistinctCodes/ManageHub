"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { mutationKeys } from "../../keys/mutationKeys";

interface ResendVerificationResponse {
  message: string;
}

/**
 * Custom hook for resending verification email
 * - Uses apiClient for API calls
 * - Provides success/error toasts
 * - Can be integrated with countdown timer
 */
export const useResendVerification = () => {
  return useMutation({
    mutationKey: mutationKeys.auth.resendVerification,
    mutationFn: async (email: string) => {
      return await apiClient.post<ResendVerificationResponse>(
        "/auth/resend-verification",
        { email }
      );
    },
    onSuccess: (data) => {
      console.log("Resend success:", data);
      toast.success("Verification email sent!");
    },
    onError: (error) => {
      console.error("Resend failed:", error);
      toast.error("Failed to send email. Please try again.");
    },
  });
};
