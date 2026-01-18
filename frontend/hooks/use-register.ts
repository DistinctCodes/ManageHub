// frontend/hooks/use-register.ts
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api-client";
import { RegisterFormData } from "@/schemas/auth.schema";
import { useAuthStore } from "@/store/auth-store";

export function useRegister() {
  const router = useRouter();
  const setRegistrationEmail = useAuthStore(
    (state) => state.setRegistrationEmail,
  );

  return useMutation({
    mutationFn: authApi.register,

    onSuccess: (data) => {
      // Store email for verification page
      setRegistrationEmail(data.data.email);

      toast.success("Registration successful!", {
        description: "Please check your email to verify your account.",
      });

      // Redirect to success page
      router.push("/auth/register/success");
    },

    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        "Registration failed. Please try again.";

      if (errorMessage.includes("email already exists")) {
        toast.error("Email already registered", {
          description: "Please use a different email or try logging in.",
        });
      } else if (errorMessage.includes("phone already exists")) {
        toast.error("Phone number already registered", {
          description: "Please use a different phone number.",
        });
      } else {
        toast.error("Registration failed", {
          description: errorMessage,
        });
      }
    },
  });
}
