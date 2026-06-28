"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useCreateInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post<any>("/inventory", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "inventory"] }),
  });
};
