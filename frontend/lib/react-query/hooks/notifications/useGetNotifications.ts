"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { NotificationsResponse } from "@/lib/types/notification";

export const useGetNotifications = (page = 1, limit = 20) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return useQuery({
    queryKey: queryKeys.notifications.list({ page, limit }),
    queryFn: () =>
      apiClient.get<NotificationsResponse>(`/notifications?${params}`),
  });
};
