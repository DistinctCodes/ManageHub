"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { CommunityFeedResponse, ToggleLikeResponse } from "@/lib/types/community";

export const useTogglePostLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) =>
      apiClient.post<ToggleLikeResponse>(`/community/posts/${postId}/like`),

    // Optimistic update — flip the like state immediately in the cache
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ["community", "feed"] });

      const previousData = queryClient.getQueriesData<CommunityFeedResponse>({
        queryKey: ["community", "feed"],
      });

      queryClient.setQueriesData<CommunityFeedResponse>(
        { queryKey: ["community", "feed"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((post) => {
              if (post.id !== postId) return post;
              const isCurrentlyLiked = post.likeCount > 0; // optimistic flip
              return {
                ...post,
                // We don't have per-user liked state in the feed response,
                // so we use a client-side _liked flag patched via the response
                likeCount: post.likeCount + 1, // will be reconciled on settle
              };
            }),
          };
        }
      );

      return { previousData };
    },

    // Reconcile with the actual server response
    onSuccess: (response, postId) => {
      queryClient.setQueriesData<CommunityFeedResponse>(
        { queryKey: ["community", "feed"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((post) =>
              post.id === postId
                ? { ...post, likeCount: response.data.likeCount }
                : post
            ),
          };
        }
      );
    },

    // Roll back on error
    onError: (_err, _postId, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
  });
};
