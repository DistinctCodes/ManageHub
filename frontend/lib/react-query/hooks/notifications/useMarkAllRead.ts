"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.patch<{ message: string; data: { updatedCount: number } }>(
        "/notifications/read-all"
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.success("All notifications marked as read");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark all notifications as read");
    },
  });
};
