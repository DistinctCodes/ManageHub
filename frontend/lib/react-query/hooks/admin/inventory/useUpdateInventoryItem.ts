"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useUpdateInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      apiClient.patch<any>(`/inventory/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "inventory"] }),
  });
};
