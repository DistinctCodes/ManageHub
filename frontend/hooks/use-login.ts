// frontend/src/hooks/use-login.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { LoginFormData } from "@/schemas/login.schema";

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),

    onSuccess: (response) => {
      console.log("Full login response:", response);

      const { user, tokens } = response.data;
      const { accessToken, refreshToken } = tokens;

      console.log("Extracted data:", { user, accessToken, refreshToken });

      // Store auth data
      setAuth(accessToken, refreshToken, user);

      // Verify storage
      setTimeout(() => {
        const stored = localStorage.getItem("auth-storage");
        console.log("Stored in localStorage:", stored);
      }, 100);

      // Show success message
      toast.success("Welcome back!", {
        description: `Logged in as ${user.fullName}`,
      });

      // Redirect based on user status
      setTimeout(() => {
        if (!user.emailVerified) {
          router.push("/auth/verify-email");
        } else if (user.role === "manager" || user.role === "super-admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 500);
    },

    onError: (error: any) => {
      console.error("Login error:", error);

      const errorMessage =
        error?.response?.data?.message || "Invalid email or password";
      toast.error("Login failed", {
        description: errorMessage,
      });
    },
  });
}
