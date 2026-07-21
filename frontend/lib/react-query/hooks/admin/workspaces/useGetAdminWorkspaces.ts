"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Workspace } from "@/lib/types/workspace";

interface WorkspacesResponse {
  success: boolean;
  data: Workspace[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const useGetAdminWorkspaces = (
  page = 1,
  limit = 15,
  search?: string
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);

  return useQuery({
    queryKey: queryKeys.admin.workspaces.list({ page, limit, search }),
    queryFn: () =>
      apiClient.get<WorkspacesResponse>(`/workspaces/admin/all?${params}`),
  });
};
