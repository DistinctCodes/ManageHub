"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { apiClient } from "@/lib/apiClient";

export interface RevenueMonth {
  month: string;
  revenueKobo: number;
}

export interface TopWorkspace {
  id: string;
  name: string;
  bookingCount: string;
  totalRevenue: string;
}

export interface TopMember {
  id: string;
  fullName: string;
  totalSpend: string;
}

export interface AdminAnalytics {
  revenue: {
    totalKobo: number;
    thisMonthKobo: number;
    lastMonthKobo: number;
    trend: RevenueMonth[];
  };
  bookings: {
    total: number;
    byStatus: Record<string, number>;
  };
  topWorkspaces: TopWorkspace[];
  topMembers: TopMember[];
  invoices: {
    paid: number;
    total: number;
  };
  occupancy: {
    rate: number;
    occupiedSeats: number;
    totalSeats: number;
    activeWorkspaces: number;
  };
}

interface UseGetAdminAnalyticsParams {
  from?: string;
  to?: string;
}

async function fetchAdminAnalytics(
  params: UseGetAdminAnalyticsParams,
): Promise<AdminAnalytics> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  const query = searchParams.toString();
  const url = `/dashboard/admin/analytics${query ? `?${query}` : ""}`;

  const { data } = await apiClient.get<{
    success: boolean;
    data: AdminAnalytics;
  }>(url);
  return data.data;
}

export function useGetAdminAnalytics(params: UseGetAdminAnalyticsParams = {}) {
  return useQuery({
    queryKey: queryKeys.adminAnalytics(params.from, params.to),
    queryFn: () => fetchAdminAnalytics(params),
  });
}
