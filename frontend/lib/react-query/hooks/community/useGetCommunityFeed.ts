"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { CommunityFeedResponse } from "@/lib/types/community";

export const useGetCommunityFeed = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: queryKeys.community.feed({ page, limit }),
    queryFn: () =>
      apiClient.get<CommunityFeedResponse>(
        `/community/posts?page=${page}&limit=${limit}`
      ),
    staleTime: 30_000,
  });
};
