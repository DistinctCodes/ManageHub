"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useAssignInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      apiClient.post<any>(`/inventory/${id}/assign`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "inventory"] }),
  });
};
