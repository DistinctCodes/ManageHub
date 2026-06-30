"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

export interface AttendanceRecord {
  id: string;
  workspaceName: string;
  checkInTime: string;
  checkOutTime: string;
  duration: number;
}

interface AttendanceHistoryResponse {
  success: boolean;
  data: {
    records: AttendanceRecord[];
    totalPages: number;
    currentPage: number;
  };
}

interface HistoryParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export const useAttendanceHistory = (params: HistoryParams = {}) => {
  return useQuery({
    queryKey: queryKeys.workspaceTracking.history(params),
    queryFn: () => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append("page", String(params.page));
      if (params.limit) queryParams.append("limit", String(params.limit));
      if (params.from) queryParams.append("from", params.from);
      if (params.to) queryParams.append("to", params.to);

      return apiClient.get<AttendanceHistoryResponse>(
        `/workspace-tracking/history?${queryParams.toString()}`
      );
    },
  });
};