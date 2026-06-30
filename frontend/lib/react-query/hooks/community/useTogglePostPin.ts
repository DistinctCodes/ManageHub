"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { TogglePinResponse } from "@/lib/types/community";
import { toast } from "sonner";

export const useTogglePostPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiClient.patch<TogglePinResponse>(`/community/posts/${postId}/pin`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      toast.success(response.data.isPinned ? "Post pinned" : "Post unpinned");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pin");
    },
  });
};
