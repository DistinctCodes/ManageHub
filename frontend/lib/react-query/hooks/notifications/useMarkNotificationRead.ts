"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Notification } from "@/lib/types/notification";
import { toast } from "sonner";

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch<{ message: string; data: Notification }>(
        `/notifications/${notificationId}/read`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.success("Notification marked as read");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update notification");
    },
  });
};
