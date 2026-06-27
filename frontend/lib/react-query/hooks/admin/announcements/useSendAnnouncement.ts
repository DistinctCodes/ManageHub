"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useSendAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; type?: string }) =>
      apiClient.post<any>("/announcements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "announcements"] }),
  });
};
