"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { toast } from "sonner";

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fetch all unread notifications
      const response = await apiClient.get<{
        message: string;
        data: Array<{ id: string; isRead: boolean }>;
        meta: { total: number; page: number; limit: number; totalPages: number };
        unreadCount: number;
      }>("/notifications?limit=100");

      // Mark each unread notification as read
      const unreadNotifications = response.data.filter(
        (notification) => !notification.isRead
      );

      await Promise.all(
        unreadNotifications.map((notification) =>
          apiClient.patch(`/notifications/${notification.id}/read`)
        )
      );

      return { markedCount: unreadNotifications.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      if (data.markedCount > 0) {
        toast.success(`Marked ${data.markedCount} notification(s) as read`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark all notifications as read");
    },
  });
};
