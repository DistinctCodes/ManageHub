"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Workspace } from "@/lib/types/workspace";
import { toast } from "sonner";

export const useToggleWorkspaceActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<{ success: boolean; data: Workspace }>(
        `/workspaces/${id}`,
        { isActive }
      ),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.workspaces.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      toast.success(isActive ? "Workspace activated" : "Workspace deactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update workspace");
    },
  });
};
