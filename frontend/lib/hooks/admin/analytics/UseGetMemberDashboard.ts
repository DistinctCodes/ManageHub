"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { apiClient } from "@/lib/apiClient";

export interface MemberStats {
  activeBookings: number;
  totalSpentKobo: number;
  invoiceCount: number;
  lastCheckIn: string | null;
}

export interface MemberBooking {
  id: string;
  status: string;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MemberPayment {
  id: string;
  amountKobo: number;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface MemberDashboard {
  stats: MemberStats;
  recentBookings: MemberBooking[];
  recentPayments: MemberPayment[];
}

async function fetchMemberDashboard(): Promise<MemberDashboard> {
  const { data } = await apiClient.get<{
    success: boolean;
    data: MemberDashboard;
  }>("/dashboard/member");
  return data.data;
}

export function useGetMemberDashboard() {
  return useQuery({
    queryKey: queryKeys.memberDashboard(),
    queryFn: fetchMemberDashboard,
  });
}
