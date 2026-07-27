"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Notification } from "@/lib/types/notification";

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const previousData = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: queryKeys.notifications.all,
      });

      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: queryKeys.notifications.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
            meta: {
              ...old.meta,
              unreadCount: Math.max(0, old.meta.unreadCount - 1),
            },
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
};
