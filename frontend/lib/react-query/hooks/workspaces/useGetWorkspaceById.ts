"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Workspace } from "@/lib/types/workspace";

export const useGetWorkspaceById = (id: string) => {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () =>
      apiClient.get<{ success: boolean; data: Workspace }>(`/workspaces/${id}`),
    enabled: !!id,
  });
};
