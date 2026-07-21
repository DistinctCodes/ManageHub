"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";

interface RevenueTrendPoint {
  month: string;
  totalKobo: number;
  totalNaira: number;
}

interface BookingTrendPoint {
  month: string;
  count: number;
}

export interface AdminAnalytics {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    trend: RevenueTrendPoint[];
  };
  bookings: {
    byStatus: Record<string, number>;
    trend: BookingTrendPoint[];
  };
  topWorkspaces: {
    id: string;
    name: string;
    bookings: string;   // raw string from SQL COUNT
    revenueKobo: string; // raw string from SQL SUM
  }[];
  topMembers: {
    id: string;
    fullName: string;
    totalKobo: string; // raw string from SQL SUM
  }[];
  invoices: {
    total: number;
    totalAmountKobo: number;
    totalAmountNaira: number;
    paid: number;
    pending: number;
  };
  occupancy: {
    totalSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    occupancyPercent: number;
    activeWorkspaces: number;
  };
}

export const useGetAdminAnalytics = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();

  return useQuery({
    queryKey: queryKeys.admin.analytics({ from, to }),
    queryFn: () =>
      apiClient.get<{ success: boolean; data: AdminAnalytics }>(
        `/dashboard/admin/analytics${qs ? `?${qs}` : ""}`
      ),
  });
};
