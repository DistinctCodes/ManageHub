"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Workspace } from "@/lib/types/workspace";
import { toast } from "sonner";

export interface CreateWorkspaceDto {
  name: string;
  type: string;
  totalSeats: number;
  hourlyRate: number; // kobo
  description?: string;
  amenities?: string[];
}

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateWorkspaceDto) =>
      apiClient.post<{ success: boolean; data: Workspace }>("/workspaces", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.workspaces.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      toast.success("Workspace created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create workspace");
    },
  });
};
