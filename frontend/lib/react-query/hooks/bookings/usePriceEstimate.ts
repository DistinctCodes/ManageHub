"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { queryKeys } from "@/lib/react-query/keys/queryKeys";
import { PlanType } from "@/lib/types/booking";

interface PriceEstimateParams extends Record<string, unknown> {
  workspaceId: string;
  planType: PlanType;
  startDate: string;
  endDate: string;
  seatCount: number;
}

interface PriceEstimateResponse {
  success: boolean;
  data: {
    totalAmount: number;
    planType: PlanType;
    seatCount: number;
    startDate: string;
    endDate: string;
  };
}

export const usePriceEstimate = (params: PriceEstimateParams | null) => {
  const enabled =
    !!params?.workspaceId &&
    !!params?.planType &&
    !!params?.startDate &&
    !!params?.endDate &&
    !!params?.seatCount;

  const queryString = params
    ? new URLSearchParams({
        workspaceId: params.workspaceId,
        planType: params.planType,
        startDate: params.startDate,
        endDate: params.endDate,
        seatCount: String(params.seatCount),
      }).toString()
    : "";

  return useQuery({
    queryKey: queryKeys.bookings.priceEstimate(params ?? {}),
    queryFn: () =>
      apiClient.get<PriceEstimateResponse>(
        `/bookings/price-estimate?${queryString}`
      ),
    enabled,
  });
};


