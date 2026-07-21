"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { WorkspaceLog } from "@/lib/types/workspace-log";

export const useGetActiveCheckIn = () => {
  return useQuery({
    queryKey: queryKeys.workspaceTracking.active,
    queryFn: () =>
      apiClient.get<{ success: boolean; data: WorkspaceLog | null }>(
        "/workspace-tracking/active"
      ),
    staleTime: 30_000,
  });
};
