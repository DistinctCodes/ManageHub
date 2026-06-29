"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useUpdateHubSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.patch<any>("/hub-settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hub-settings"] }),
  });
};
