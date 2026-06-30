"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

interface AttendanceSummary {
  totalHoursThisMonth: number;
  daysVisitedThisMonth: number;
  currentStreak: number;
}

interface AttendanceSummaryResponse {
  success: boolean;
  data: AttendanceSummary;
}

export const useAttendanceSummary = () => {
  return useQuery({
    queryKey: queryKeys.workspaceTracking.summary,
    queryFn: () =>
      apiClient.get<AttendanceSummaryResponse>("/workspace-tracking/summary"),
  });
};