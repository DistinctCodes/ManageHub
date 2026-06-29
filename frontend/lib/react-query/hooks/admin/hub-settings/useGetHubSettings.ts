"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetHubSettings = () => {
  return useQuery({
    queryKey: ["admin", "hub-settings"],
    queryFn: () => apiClient.get<any>("/hub-settings"),
  });
};
