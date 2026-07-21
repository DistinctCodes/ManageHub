"use client";

import { useQuery } from "@tanstack/react-query";
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

export const useGetNotifications = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: queryKeys.notifications.list({ page, limit }),
    queryFn: () =>
      apiClient.get<NotificationsResponse>(
        `/notifications?page=${page}&limit=${limit}`
      ),
    staleTime: 30_000,
  });
};
