"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface MaintenanceRequestPayload {
  category: string;
  description: string;
  workspaceId?: string;
  imageUrl?: string;
}

export const useSubmitMaintenanceRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MaintenanceRequestPayload) =>
      apiClient.post("/maintenance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance", "mine"] });
    },
  });
};
