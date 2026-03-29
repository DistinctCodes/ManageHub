"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Workspace, WorkspaceQuery } from "@/lib/types/workspace";

interface WorkspacesResponse {
  data: Workspace[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useGetWorkspaces = ({
  search,
  type,
  page = 1,
  limit = 9,
}: WorkspaceQuery) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set("search", search);
  }

  if (type) {
    params.set("type", type);
  }

  return useQuery({
    queryKey: queryKeys.workspaces.list({ search, type, page, limit }),
    queryFn: () => apiClient.get<WorkspacesResponse>(`/workspaces?${params}`),
  });
};
