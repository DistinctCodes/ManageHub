"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

export const useUnreadCount = () => {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () =>
      apiClient.get<UnreadCountResponse>("/notifications/unread-count"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
};
