"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useSendEmailCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<any>(`/email-campaigns/${id}/send`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });
};
