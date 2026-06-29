"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

export interface PendingNpsSurvey {
  surveyId: string;
  bookingId: string;
  workspaceName: string;
}

interface PendingNpsSurveyResponse {
  success: boolean;
  data: PendingNpsSurvey | null;
}

export const useGetPendingNpsSurvey = () => {
  return useQuery({
    queryKey: queryKeys.nps.pending,
    queryFn: () =>
      apiClient.get<PendingNpsSurveyResponse>("/nps/pending"),
    staleTime: 5 * 60 * 1000,
  });
};
