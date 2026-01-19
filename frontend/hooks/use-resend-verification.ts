// frontend/src/hooks/use-resend-verification.ts
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";

export function useResendVerification() {
  return useMutation({
    mutationFn: authApi.resendVerification,

    onSuccess: () => {
      toast.success("Verification email sent!", {
        description: "Please check your inbox for the new verification link.",
      });
    },

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        "Failed to resend verification email.";

      if (errorMessage.includes("already verified")) {
        toast.info("Email already verified", {
          description:
            "Your email has already been verified. You can proceed to login.",
        });
      } else if (errorMessage.includes("not found")) {
        toast.error("Account not found", {
          description: "Please register a new account.",
        });
      } else {
        toast.error("Failed to resend email", {
          description: errorMessage,
        });
      }
    },
  });
}
