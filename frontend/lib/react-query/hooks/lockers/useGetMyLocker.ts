"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetMyLocker = () => {
  return useQuery({
    queryKey: ["lockers", "mine"],
    queryFn: () => apiClient.get<any>("/lockers/mine"),
  });
};
