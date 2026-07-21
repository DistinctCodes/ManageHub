"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { Booking } from "@/lib/types/booking";
import { Payment } from "@/lib/types/payment";

interface MemberStats {
  activeBookings: number;
  totalSpent: number;
  invoiceCount: number;
  lastCheckIn: string | null;
}

interface MemberDashboardResponse {
  success: boolean;
  data: {
    stats: MemberStats;
    recentBookings: Booking[];
    recentPayments: Payment[];
  };
}

export const useGetMemberDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.member,
    queryFn: () =>
      apiClient.get<MemberDashboardResponse>("/dashboard/member"),
  });
};
