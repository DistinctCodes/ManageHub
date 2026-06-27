"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetMyMaintenanceRequests = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["maintenance", "mine", { page, limit }],
    queryFn: () =>
      apiClient.get(`/maintenance/mine?page=${page}&limit=${limit}`),
  });
};
