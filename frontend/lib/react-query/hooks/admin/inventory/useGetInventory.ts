"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetInventory = (filters?: { category?: string; condition?: string }) => {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.condition) params.set("condition", filters.condition);
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "inventory", filters],
    queryFn: () => apiClient.get<any>(`/inventory${qs ? `?${qs}` : ""}`),
  });
};
