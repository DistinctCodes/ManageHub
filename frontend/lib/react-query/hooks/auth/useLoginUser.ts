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
      // console.log("Simulating Backend Call...",data)
      
      return await login(data);
    },
    onSuccess: () => {
      toast.success("Login successful");
      
      // Handle redirect after successful login
      const redirectTo = searchParams.get("redirect");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
      if (error?.unverified) {
        toast.info("Please verify your email to continue.");
        router.push(`/verify-otp?email=${encodeURIComponent(error.email)}`);
        return;
      }
      toast.error("Login failed. Please check your credentials.");
    },
  });
};
