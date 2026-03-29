"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  message: string;
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  unreadCount: number;
}

export const useGetNotifications = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.notifications.list({ page, limit }),
    queryFn: () =>
      apiClient.get<NotificationsResponse>(
        `/notifications?page=${page}&limit=${limit}`
      ),
    staleTime: 30000, // 30 seconds
  });
};
