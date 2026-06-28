"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useCreateEmailCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post<any>("/email-campaigns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });
};
