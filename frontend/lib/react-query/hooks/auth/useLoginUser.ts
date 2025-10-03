"use client";

import { useAuthActions } from "@/lib/store/authStore";
import { useMutation } from "@tanstack/react-query";
import { mutationKeys } from "../../keys/mutationKeys";
import { LoginUser } from "@/lib/types/user";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Custom hook for user login
 * - Uses Zustand authStore for login logic
 * - React Query for mutation handling
 * - Provides success/error toasts and navigation
 * - Handles redirect query parameter for post-login navigation
 */
export const useLoginUser = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthActions();

  return useMutation({
    mutationKey: mutationKeys.auth.loginUser,
    mutationFn: async (data: LoginUser) => {
      return await login(data);
    },
    onSuccess: (data) => {
      console.log("Login success:", data);
      toast.success("Login successful");
      
      // Handle redirect after successful login
      const redirectTo = searchParams.get("redirect");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
      toast.error("Login failed. Please check your credentials.");
    },
  });
};
