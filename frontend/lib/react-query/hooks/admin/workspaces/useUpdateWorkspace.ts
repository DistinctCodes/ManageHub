"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Workspace } from "@/lib/types/workspace";
import { toast } from "sonner";

interface UpdateWorkspaceDto {
  name?: string;
  type?: string;
  totalSeats?: number;
  hourlyRate?: number;
  description?: string;
  amenities?: string[];
}

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkspaceDto }) =>
      apiClient.patch<{ success: boolean; data: Workspace }>(
        `/workspaces/${id}`,
        dto
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.workspaces.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      toast.success("Workspace updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update workspace");
    },
  });
};
