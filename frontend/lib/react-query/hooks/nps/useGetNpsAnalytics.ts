"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

export interface NpsComment {
  score: number;
  comment: string;
  createdAt: string;
}

export interface NpsAnalytics {
  score: number;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
  totalResponses: number;
  recentComments: NpsComment[];
}

interface NpsAnalyticsResponse {
  success: boolean;
  data: NpsAnalytics;
}

export const useGetNpsAnalytics = () => {
  return useQuery({
    queryKey: queryKeys.nps.analytics,
    queryFn: () =>
      apiClient.get<NpsAnalyticsResponse>("/nps/analytics"),
  });
};
