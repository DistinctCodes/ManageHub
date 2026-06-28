"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useGetAuditLog = (filters?: {
  resourceType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.resourceType) params.set("resourceType", filters.resourceType);
  if (filters?.actorId) params.set("actorId", filters.actorId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "audit-log", filters],
    queryFn: () => apiClient.get<any>(`/audit-log${qs ? `?${qs}` : ""}`),
  });
};
