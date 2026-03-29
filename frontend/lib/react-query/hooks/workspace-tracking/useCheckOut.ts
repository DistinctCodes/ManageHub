"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { WorkspaceLog } from "@/lib/types/workspace-log";
import { toast } from "sonner";

export const useCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) =>
      apiClient.patch<{ success: boolean; data: WorkspaceLog }>(
        `/workspace-tracking/check-out/${logId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTracking.active,
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-tracking", "history"],
      });
      toast.success("Checked out successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to check out");
    },
  });
};
