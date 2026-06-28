"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetEmailCampaigns = (status?: string) => {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["admin", "campaigns", status],
    queryFn: () => apiClient.get<any>(`/email-campaigns${qs}`),
  });
};
