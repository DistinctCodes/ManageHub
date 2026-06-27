"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post<any>("/events", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "events"] }),
  });
};
