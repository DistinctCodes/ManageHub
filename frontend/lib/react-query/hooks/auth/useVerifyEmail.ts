"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { mutationKeys } from "../../keys/mutationKeys";

interface VerifyEmailResponse {
  message: string;
}

/**
 * Custom hook for email verification
 * - Uses apiClient for API calls
 * - Provides success/error toasts
 */
export const useVerifyEmail = () => {
  return useMutation({
    mutationKey: mutationKeys.auth.verifyEmail,
    mutationFn: async (token: string) => {
      return await apiClient.post<VerifyEmailResponse>("/auth/verify-email", {
        token,
      });
    },
    onSuccess: (data) => {
      console.log("Verification success:", data);
      toast.success(data.message || "Email verified successfully!");
    },
    onError: (error) => {
      console.error("Verification failed:", error);
      toast.error("Verification failed. Please try again.");
    },
  });
};
