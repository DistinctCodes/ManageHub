"use client";

import { useAuthActions } from "@/lib/store/authStore";
import { useMutation } from "@tanstack/react-query";
import { mutationKeys } from "../../keys/mutationKeys";
import { RegisterUser } from "@/lib/types/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Custom hook for user registration
 * - Uses Zustand authStore for registration logic
 * - React Query for mutation handling
 * - Provides success/error toasts and navigation
 */

export const useRegisterUser = () => {
  const router = useRouter();
  const { register } = useAuthActions();

  return useMutation({
    
    mutationKey: mutationKeys.auth.registerUser,
    
    mutationFn: async (data: RegisterUser) => {
      await register(data);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Account created! Please verify your email.");
      router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    },
    onError: () => {
      toast.error("Error creating user");
    },
  });
};
