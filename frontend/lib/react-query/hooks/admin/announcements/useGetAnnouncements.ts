"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetAnnouncements = () => {
  return useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => apiClient.get<any>("/announcements"),
  });
};
