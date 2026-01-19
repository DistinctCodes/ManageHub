// frontend/src/hooks/use-login.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";
import { LoginFormData } from "@/schemas/login.schema";
import { useAuthStore } from "@/store/auth-store";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: authApi.login,

    onSuccess: (data) => {
      // Store auth data
      setAuth(data.data.user, data.data.tokens);

      // Show success message
      toast.success("Login successful!", {
        description: `Welcome back, ${data.data.user.fullName}!`,
      });

      // Check if email was just verified
      const verified = searchParams.get("verified");
      if (verified === "true") {
        toast.info("Email verified!", {
          description: "Please complete your membership payment to continue.",
        });
      }

      // Redirect based on user status and role
      const { status, role } = data.data.user;

      if (
        role === "super-admin" ||
        role === "manager" ||
        role === "receptionist"
      ) {
        router.push("/admin/dashboard");
      } else if (status === "active") {
        // Check if user has completed payment (we'll add this check later)
        router.push("/dashboard");
      } else if (status === "pending-verification") {
        toast.warning("Email not verified", {
          description: "Please verify your email to continue.",
        });
        router.push("/auth/register/success");
      } else {
        router.push("/onboarding/payment");
      }
    },

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Login failed. Please try again.";

      if (
        errorMessage.includes("Invalid credentials") ||
        errorMessage.includes("User not found")
      ) {
        toast.error("Invalid credentials", {
          description: "Please check your email and password and try again.",
        });
      } else if (errorMessage.includes("not verified")) {
        toast.error("Email not verified", {
          description: "Please verify your email before logging in.",
        });
      } else if (errorMessage.includes("suspended")) {
        toast.error("Account suspended", {
          description:
            "Your account has been suspended. Please contact support.",
        });
      } else if (errorMessage.includes("deactivated")) {
        toast.error("Account deactivated", {
          description:
            "Your account has been deactivated. Please contact support.",
        });
      } else {
        toast.error("Login failed", {
          description: errorMessage,
        });
      }
    },
  });
}
