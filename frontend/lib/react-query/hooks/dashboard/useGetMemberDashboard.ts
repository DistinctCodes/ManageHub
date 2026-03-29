"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { MemberDashboardData } from "@/lib/types/dashboard";

interface MemberDashboardResponse {
  success: boolean;
  data: MemberDashboardData;
}

export const useGetMemberDashboard = () => {
  return useQuery({
    queryKey: ["member-dashboard"],
    queryFn: () =>
      apiClient.get<MemberDashboardResponse>("/dashboard/member"),
  });
};
