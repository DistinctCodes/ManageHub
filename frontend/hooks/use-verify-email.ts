// frontend/src/hooks/use-verify-email.ts
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api-client";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: authApi.verifyEmail,
    retry: false, // Don't retry on failure for verification
  });
}
