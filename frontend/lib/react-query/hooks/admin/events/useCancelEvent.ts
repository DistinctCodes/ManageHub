"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useCancelEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<any>(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "events"] }),
  });
};
