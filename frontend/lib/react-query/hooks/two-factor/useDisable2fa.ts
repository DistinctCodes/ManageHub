"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

export const useDisable2fa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) =>
      apiClient.post<{ success: boolean; message: string }>(
        "/auth/2fa/disable",
        { password }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.status });
      toast.success("Two-factor authentication disabled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to disable 2FA");
    },
  });
};
