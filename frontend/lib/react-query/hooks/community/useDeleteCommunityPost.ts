"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

export const useDeleteCommunityPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiClient.delete<{ message: string }>(`/community/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      toast.success("Post deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete post");
    },
  });
};
