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

      return await register(data);
    },
    onSuccess: (data) => {
      console.log("Register success:", data);
      toast.success("User created successfully");
      // router.push("/");
    },
    onError: (error) => {
      console.error("Register failed:", error);
      toast.error("Error creating user");
    },
  });
};
