"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { WorkspaceLog } from "@/lib/types/workspace-log";
import { toast } from "sonner";

interface CheckInPayload {
  workspaceId: string;
  bookingId?: string;
  notes?: string;
}

export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInPayload) =>
      apiClient.post<{ success: boolean; data: WorkspaceLog }>(
        "/workspace-tracking/check-in",
        payload
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTracking.active,
      });
      toast.success("Checked in successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to check in");
    },
  });
};
