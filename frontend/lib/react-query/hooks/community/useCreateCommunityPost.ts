"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { CommunityPost, CreatePostPayload } from "@/lib/types/community";
import { toast } from "sonner";

export const useCreateCommunityPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostPayload) =>
      apiClient.post<{ message: string; data: CommunityPost }>(
        "/community/posts",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "feed"] });
      toast.success("Post shared with the community!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create post");
    },
  });
};
