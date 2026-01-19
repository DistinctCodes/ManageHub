// frontend/src/hooks/use-forgot-password.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";
import { ForgotPasswordFormData } from "@/schemas/forgot-password.schema";

export function useForgotPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.forgotPassword,

    onSuccess: (data) => {
      toast.success("Reset email sent!", {
        description: "Please check your inbox for password reset instructions.",
      });

      // Redirect to a success page or back to login with a message
      router.push(
        `/auth/forgot-password/success?email=${encodeURIComponent(data.data.email)}`,
      );
    },

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Failed to send reset email.";

      if (errorMessage.includes("not found")) {
        toast.error("Account not found", {
          description: "No account exists with this email address.",
        });
      } else if (errorMessage.includes("not verified")) {
        toast.error("Email not verified", {
          description:
            "Please verify your email first before resetting password.",
        });
      } else {
        toast.error("Failed to send reset email", {
          description: errorMessage,
        });
      }
    },
  });
}
