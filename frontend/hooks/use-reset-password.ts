// frontend/src/hooks/use-reset-password.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";

interface ResetPasswordParams {
  token: string;
  password: string;
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: ResetPasswordParams) =>
      authApi.resetPassword(token, password),

    onSuccess: (data) => {
      toast.success("Password reset successful!", {
        description: "You can now sign in with your new password.",
      });

      // Redirect to login with success message
      setTimeout(() => {
        router.push("/auth/login?reset=success");
      }, 2000);
    },

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Failed to reset password.";

      if (errorMessage.includes("expired")) {
        toast.error("Reset link expired", {
          description: "This reset link has expired. Please request a new one.",
        });
      } else if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("not found")
      ) {
        toast.error("Invalid reset link", {
          description: "This reset link is invalid or has already been used.",
        });
      } else {
        toast.error("Failed to reset password", {
          description: errorMessage,
        });
      }
    },
  });
}
