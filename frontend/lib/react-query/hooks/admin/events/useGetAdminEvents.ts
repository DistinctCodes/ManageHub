"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetAdminEvents = () => {
  return useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => apiClient.get<any>("/events"),
  });
};
