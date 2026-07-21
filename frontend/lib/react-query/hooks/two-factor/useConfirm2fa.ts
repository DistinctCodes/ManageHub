"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

interface Confirm2faResponse {
  success: boolean;
  data: {
    backupCodes: string[];
  };
}

export const useConfirm2fa = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<Confirm2faResponse>("/auth/2fa/confirm", { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor.status });
      toast.success("Two-factor authentication enabled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid code. Please try again.");
    },
  });
};
