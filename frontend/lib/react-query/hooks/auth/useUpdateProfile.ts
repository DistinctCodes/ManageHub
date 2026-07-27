"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { mutationKeys } from "../../keys/mutationKeys";
import { queryKeys } from "../../keys/queryKeys";
import { useAuthActions } from "@/lib/store/authStore";
import { toast } from "sonner";

interface UpdateProfilePayload {
  profilePicture?: string;
  [key: string]: unknown;
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { updateProfile, initializeAuth } = useAuthActions();

  return useMutation({
    mutationKey: mutationKeys.auth.updateProfile,
    mutationFn: async (data: UpdateProfilePayload) => {
      return await updateProfile(data);
    },
    onMutate: async (data) => {
      if (data.profilePicture) {
        await queryClient.cancelQueries({ queryKey: ["auth"] });
      }
    },
    onSuccess: (_, variables) => {
      initializeAuth();
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      if (variables.profilePicture) {
        toast.success("Avatar updated successfully");
      } else {
        toast.success("Profile updated successfully");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });
};
